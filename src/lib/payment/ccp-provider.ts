/**
 * CCP / BaridiMob Payment Provider
 * 
 * Implements manual proof-of-payment flow for Algeria's CCP and BaridiMob systems.
 * Since no official production API is available, this uses a receipt upload approach:
 * 
 * Flow:
 * 1. Customer selects CCP/BaridiMob
 * 2. Booking created with payment_status = "pending"
 * 3. Customer uploads payment receipt (image/PDF)
 * 4. Receipt stored in Supabase Storage
 * 5. Payment record created in payments table
 * 6. Notifications sent to barber and customer
 * 7. Admin/barber approves or rejects payment
 */
import { supabase, isSupabaseConfigured } from '@/supabase/client';
import type {
  PaymentProvider,
  PaymentProviderType,
  CreateSessionParams,
  PaymentSessionResult,
  PaymentVerificationResult,
  WebhookEvent,
  PaymentSessionStatus,
} from './types';

/** Maximum file size for receipt upload: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for receipt */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

/** Storage bucket name for payment receipts */
const RECEIPTS_BUCKET = 'payment-receipts';

/** Helper to access the typed payments table. */
const paymentsTable = () => supabase.from('payments');

export interface CCPPaymentParams {
  bookingId: string;
  clientId: string;
  professionalId: string;
  amount: number;
  currency: string;
  transactionReference?: string;
  metadata?: Record<string, string>;
}

export interface ReceiptUploadResult {
  receiptUrl: string;
  filePath: string;
}

export interface CCPPaymentRecord {
  id: string;
  bookingId: string;
  provider: PaymentProviderType;
  sessionId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: PaymentSessionStatus;
  receiptUrl?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export class CCPProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'ccp';
  readonly displayName = 'CCP / BaridiMob';
  readonly supportedCurrencies = ['dzd'];

  /**
   * Create a "checkout session" for CCP/BaridiMob.
   * Unlike Stripe, this doesn't redirect — it creates a pending payment record.
   */
  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    const sessionId = `ccp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const { data, error } = await paymentsTable()
      .insert({
        booking_id: params.bookingId,
        provider: this.name,
        session_id: sessionId,
        amount: params.totalAmount,
        currency: params.currency || 'dzd',
        status: 'pending',
        metadata: {
          ...params.metadata,
          client_id: params.clientId,
          professional_id: params.professionalId,
          payment_method: 'ccp',
        },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`فشل في إنشاء سجل الدفع: ${error.message}`);
    }

    return {
      sessionId: data.id,
      checkoutUrl: '',
      provider: this.name,
    };
  }

  /**
   * Verify payment status by checking the payments table
   */
  async verifyPayment(sessionId: string): Promise<PaymentVerificationResult> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    const { data, error } = await paymentsTable()
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return { verified: false, status: 'failed' };
    }

    return {
      verified: data.status === 'completed',
      status: data.status as PaymentSessionStatus,
      transactionId: data.transaction_id || undefined,
      amount: data.amount ? Number(data.amount) : undefined,
      currency: data.currency || undefined,
      metadata: (data.metadata as Record<string, string>) || undefined,
    };
  }

  /**
   * Webhook handling not applicable for manual CCP flow
   */
  async handleWebhook(_request: Request, _secret: string): Promise<WebhookEvent> {
    throw new Error('CCP/BaridiMob لا يدعم webhooks — يستخدم التحقق اليدوي');
  }

  /**
   * Upload a payment receipt (image or PDF) to Supabase Storage
   */
  async uploadReceipt(
    file: File,
    clientId: string,
    paymentId: string,
    onProgress?: (progress: number) => void
  ): Promise<ReceiptUploadResult> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('حجم الملف كبير جداً. الحد الأقصى 5 ميغابايت');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('نوع الملف غير مدعوم. يرجى رفع صورة (JPEG, PNG, WebP) أو PDF');
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${clientId}/${paymentId}_${Date.now()}.${ext}`;

    onProgress?.(10);

    const { error: uploadError } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    onProgress?.(70);

    if (uploadError) {
      throw new Error(`فشل في رفع الإيصال: ${uploadError.message}`);
    }

    onProgress?.(100);

    return {
      receiptUrl: filePath,
      filePath,
    };
  }

  /**
   * Submit payment with receipt
   */
  async submitPaymentWithReceipt(params: {
    paymentId: string;
    receiptUrl: string;
    transactionReference?: string;
  }): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    // Get existing metadata
    const { data: existing } = await paymentsTable()
      .select('metadata')
      .eq('id', params.paymentId)
      .single();

    const existingMeta = (existing?.metadata as Record<string, string>) || {};

    const { error } = await paymentsTable()
      .update({
        transaction_id: params.transactionReference || null,
        status: 'processing',
        receipt_url: params.receiptUrl,
        metadata: {
          ...existingMeta,
          receipt_path: params.receiptUrl,
          transaction_reference: params.transactionReference || '',
          submitted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.paymentId);

    if (error) {
      throw new Error(`فشل في تحديث سجل الدفع: ${error.message}`);
    }
  }

  /**
   * Approve a payment (called by barber or admin)
   */
  async approvePayment(paymentId: string, approverId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    // Get payment to find booking_id and metadata
    const { data: payment, error: fetchError } = await paymentsTable()
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      throw new Error('فشل في العثور على سجل الدفع');
    }

    const existingMeta = (payment.metadata as Record<string, string>) || {};

    // Update payment status to completed
    const { error } = await paymentsTable()
      .update({
        status: 'completed',
        metadata: {
          ...existingMeta,
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) {
      throw new Error(`فشل في الموافقة على الدفع: ${error.message}`);
    }

    // Update booking payment_status to 'paid'
    if (payment.booking_id) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', payment.booking_id);
    }
  }

  /**
   * Reject a payment (called by barber or admin)
   */
  async rejectPayment(paymentId: string, rejectorId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    // Get payment to find booking_id and metadata
    const { data: payment, error: fetchError } = await paymentsTable()
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      throw new Error('فشل في العثور على سجل الدفع');
    }

    const existingMeta = (payment.metadata as Record<string, string>) || {};

    // Update payment status to failed
    const { error } = await paymentsTable()
      .update({
        status: 'failed',
        metadata: {
          ...existingMeta,
          rejected_by: rejectorId,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason || '',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) {
      throw new Error(`فشل في رفض الدفع: ${error.message}`);
    }

    // Update booking payment_status to 'failed'
    if (payment.booking_id) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', payment.booking_id);
    }
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(paymentId: string): Promise<CCPPaymentRecord | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    const { data, error } = await paymentsTable()
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !data) return null;

    const meta = (data.metadata as Record<string, string>) || {};
    return {
      id: data.id,
      bookingId: data.booking_id || '',
      provider: data.provider as PaymentProviderType,
      sessionId: data.session_id,
      transactionId: data.transaction_id || undefined,
      amount: Number(data.amount),
      currency: data.currency,
      status: data.status as PaymentSessionStatus,
      receiptUrl: meta.receipt_url || undefined,
      metadata: meta,
      createdAt: data.created_at || '',
    };
  }

  /**
   * Get all payments for a booking
   */
  async getPaymentsByBooking(bookingId: string): Promise<CCPPaymentRecord[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase غير مُعد');
    }

    const { data, error } = await paymentsTable()
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d) => {
      const meta = (d.metadata as Record<string, string>) || {};
      return {
        id: d.id,
        bookingId: d.booking_id || '',
        provider: d.provider as PaymentProviderType,
        sessionId: d.session_id,
        transactionId: d.transaction_id || undefined,
        amount: Number(d.amount),
        currency: d.currency,
        status: d.status as PaymentSessionStatus,
        receiptUrl: meta.receipt_url || undefined,
        metadata: meta,
        createdAt: d.created_at || '',
      };
    });
  }
}

export const ccpProvider = new CCPProvider();
