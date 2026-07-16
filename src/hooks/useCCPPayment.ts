/**
 * useCCPPayment Hook
 * 
 * Provides CCP/BaridiMob payment functionality with receipt upload.
 * Handles the manual proof-of-payment flow for Algerian payment methods.
 */
import { useState, useCallback } from 'react';
import { ccpProvider } from '@/lib/payment/ccp-provider';
import type { CCPPaymentRecord } from '@/lib/payment/ccp-provider';
import type { PaymentSessionStatus } from '@/lib/payment/types';
import { sendNotification } from '@/supabase/database';

export interface UseCCPPaymentReturn {
  isProcessing: boolean;
  uploadProgress: number;
  error: string | null;
  paymentRecord: CCPPaymentRecord | null;
  /** Create a pending CCP payment for a booking */
  createCCPPayment: (params: {
    bookingId: string;
    clientId: string;
    professionalId: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  }) => Promise<string | null>;
  /** Upload receipt and submit payment */
  uploadReceiptAndSubmit: (params: {
    file: File;
    clientId: string;
    paymentId: string;
    transactionReference?: string;
    bookingId: string;
    professionalId: string;
    clientName: string;
  }) => Promise<boolean>;
  /** Approve a payment (barber/admin) */
  approvePayment: (paymentId: string, approverId: string, clientId: string, barberName: string) => Promise<boolean>;
  /** Reject a payment (barber/admin) */
  rejectPayment: (paymentId: string, rejectorId: string, clientId: string, barberName: string, reason?: string) => Promise<boolean>;
  /** Get payment status */
  getPaymentStatus: (paymentId: string) => Promise<PaymentSessionStatus | null>;
  /** Clear error */
  clearError: () => void;
}

export function useCCPPayment(): UseCCPPaymentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<CCPPaymentRecord | null>(null);

  const createCCPPayment = useCallback(async (params: {
    bookingId: string;
    clientId: string;
    professionalId: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  }): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await ccpProvider.createCheckoutSession({
        bookingId: params.bookingId,
        clientId: params.clientId,
        professionalId: params.professionalId,
        lineItems: [],
        totalAmount: params.amount,
        currency: params.currency || 'dzd',
        metadata: params.metadata,
        successUrl: '',
        cancelUrl: '',
      });
      return result.sessionId; // This is the payment ID
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في إنشاء سجل الدفع';
      setError(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const uploadReceiptAndSubmit = useCallback(async (params: {
    file: File;
    clientId: string;
    paymentId: string;
    transactionReference?: string;
    bookingId: string;
    professionalId: string;
    clientName: string;
  }): Promise<boolean> => {
    setIsProcessing(true);
    setUploadProgress(0);
    setError(null);
    try {
      // Upload receipt
      const { receiptUrl } = await ccpProvider.uploadReceipt(
        params.file,
        params.clientId,
        params.paymentId,
        (progress) => setUploadProgress(progress)
      );

      // Submit payment with receipt
      await ccpProvider.submitPaymentWithReceipt({
        paymentId: params.paymentId,
        receiptUrl,
        transactionReference: params.transactionReference,
      });

      // Get updated payment record
      const record = await ccpProvider.getPaymentById(params.paymentId);
      setPaymentRecord(record);

      // Notify barber about receipt upload
      try {
        await sendNotification({
          userId: params.professionalId,
          title: 'إيصال دفع جديد',
          message: `قام ${params.clientName} برفع إيصال الدفع. يرجى مراجعته والموافقة عليه.`,
          type: 'booking',
          metadata: {
            payment_id: params.paymentId,
            booking_id: params.bookingId,
            action: 'receipt_uploaded',
          },
        });
      } catch (notifErr) {
        console.error('Failed to notify barber:', notifErr);
      }

      // Notify customer that receipt was submitted
      try {
        await sendNotification({
          userId: params.clientId,
          title: 'تم إرسال إيصال الدفع',
          message: 'تم رفع إيصال الدفع بنجاح. سيتم مراجعته قريباً.',
          type: 'booking',
          metadata: {
            payment_id: params.paymentId,
            booking_id: params.bookingId,
            action: 'receipt_submitted',
          },
        });
      } catch (notifErr) {
        console.error('Failed to notify client:', notifErr);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في رفع الإيصال';
      setError(message);
      return false;
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }, []);

  const approvePayment = useCallback(async (
    paymentId: string,
    approverId: string,
    clientId: string,
    barberName: string
  ): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);
    try {
      await ccpProvider.approvePayment(paymentId, approverId);
      const approvedPayment = await ccpProvider.getPaymentById(paymentId);

      // Notify customer
      try {
        await sendNotification({
          userId: clientId,
          title: 'تمت الموافقة على الدفع ✓',
          message: `تمت الموافقة على إيصال الدفع من قبل ${barberName}. حجزك مؤكد!`,
          type: 'booking',
          metadata: {
            payment_id: paymentId,
            booking_id: approvedPayment?.bookingId || '',
            action: 'payment_approved',
          },
        });
      } catch (notifErr) {
        console.error('Failed to notify client:', notifErr);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في الموافقة على الدفع';
      setError(message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const rejectPayment = useCallback(async (
    paymentId: string,
    rejectorId: string,
    clientId: string,
    barberName: string,
    reason?: string
  ): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);
    try {
      await ccpProvider.rejectPayment(paymentId, rejectorId, reason);
      const rejectedPayment = await ccpProvider.getPaymentById(paymentId);

      // Notify customer
      try {
        await sendNotification({
          userId: clientId,
          title: 'تم رفض إيصال الدفع',
          message: `تم رفض إيصال الدفع من قبل ${barberName}${reason ? `: ${reason}` : '. يرجى إعادة الرفع.'}`,
          type: 'booking',
          metadata: {
            payment_id: paymentId,
            booking_id: rejectedPayment?.bookingId || '',
            action: 'payment_rejected',
            reason: reason || '',
          },
        });
      } catch (notifErr) {
        console.error('Failed to notify client:', notifErr);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في رفض الدفع';
      setError(message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getPaymentStatus = useCallback(async (paymentId: string): Promise<PaymentSessionStatus | null> => {
    try {
      const result = await ccpProvider.verifyPayment(paymentId);
      return result.status;
    } catch {
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    uploadProgress,
    error,
    paymentRecord,
    createCCPPayment,
    uploadReceiptAndSubmit,
    approvePayment,
    rejectPayment,
    getPaymentStatus,
    clearError,
  };
}
