/**
 * Payment Provider Architecture - Types
 * 
 * This module defines the interfaces for a pluggable payment system.
 * New providers (PayTabs, HyperPay, CCP, etc.) can be added by implementing
 * the PaymentProvider interface without changing business logic.
 */

export type PaymentProviderType = 'stripe' | 'paytabs' | 'hyperpay' | 'ccp' | 'baridi_mob' | 'cash';

export type PaymentSessionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentLineItem {
  name: string;
  description?: string;
  amount: number; // in smallest currency unit (centimes for DZD)
  quantity: number;
  currency: string;
}

export interface CreateSessionParams {
  bookingId: string;
  clientId: string;
  professionalId: string;
  lineItems: PaymentLineItem[];
  totalAmount: number;
  currency: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PaymentSessionResult {
  sessionId: string;
  checkoutUrl: string;
  provider: PaymentProviderType;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: PaymentSessionStatus;
  transactionId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  type: string;
  provider: PaymentProviderType;
  data: {
    sessionId: string;
    bookingId?: string;
    status: PaymentSessionStatus;
    transactionId?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
  };
}

/**
 * PaymentProvider Interface
 * 
 * All payment providers must implement this interface.
 * This allows swapping or adding providers without changing business logic.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderType;
  readonly displayName: string;
  readonly supportedCurrencies: string[];
  
  /** Create a checkout session and return the redirect URL */
  createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult>;
  
  /** Verify a payment session status */
  verifyPayment(sessionId: string): Promise<PaymentVerificationResult>;
  
  /** Handle incoming webhook and return parsed event */
  handleWebhook(request: Request, secret: string): Promise<WebhookEvent>;
}

/**
 * Payment record stored in the database
 */
export interface PaymentRecord {
  id?: string;
  booking_id: string;
  provider: PaymentProviderType;
  session_id: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  status: PaymentSessionStatus;
  metadata?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}
