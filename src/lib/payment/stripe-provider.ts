/**
 * Stripe Payment Provider (Frontend)
 * 
 * Handles creating checkout sessions via Supabase Edge Function
 * and redirecting to Stripe Checkout.
 */

import { supabase } from '@/supabase/client';
import type {
  PaymentProvider,
  PaymentProviderType,
  CreateSessionParams,
  PaymentSessionResult,
  PaymentVerificationResult,
  WebhookEvent,
} from './types';



export class StripeProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'stripe';
  readonly displayName = 'Stripe';
  readonly supportedCurrencies = ['dzd', 'usd', 'eur'];

  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    // Call the Supabase Edge Function to create a Stripe Checkout Session
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        bookingId: params.bookingId,
        clientId: params.clientId,
        professionalId: params.professionalId,
        lineItems: params.lineItems,
        totalAmount: params.totalAmount,
        currency: params.currency,
        metadata: params.metadata,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        customerEmail: params.customerEmail,
      },
    });

    if (error) {
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }

    if (!data?.sessionId || !data?.checkoutUrl) {
      throw new Error('Invalid response from checkout session creation');
    }

    return {
      sessionId: data.sessionId,
      checkoutUrl: data.checkoutUrl,
      provider: 'stripe',
    };
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerificationResult> {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { sessionId, provider: 'stripe' },
    });

    if (error) {
      throw new Error(`Failed to verify payment: ${error.message}`);
    }

    return {
      verified: data?.verified || false,
      status: data?.status || 'failed',
      transactionId: data?.transactionId,
      amount: data?.amount,
      currency: data?.currency,
      metadata: data?.metadata,
    };
  }

  // Webhook handling is done server-side (Edge Function), not in frontend
  async handleWebhook(_request: Request, _secret: string): Promise<WebhookEvent> {
    throw new Error('Webhook handling is server-side only');
  }

  /** Redirect to Stripe Checkout using the checkout URL */
  async redirectToCheckout(checkoutUrl: string): Promise<void> {
    if (!checkoutUrl) {
      throw new Error('No checkout URL provided');
    }
    window.location.href = checkoutUrl;
  }
}

export const stripeProvider = new StripeProvider();
