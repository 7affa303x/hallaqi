/**
 * Payment Manager
 * 
 * Central orchestrator for the payment system.
 * Manages provider registration and delegates operations to the appropriate provider.
 * 
 * Usage:
 *   import { paymentManager } from '@/lib/payment';
 *   const result = await paymentManager.createCheckoutSession('stripe', params);
 */

import type {
  PaymentProvider,
  PaymentProviderType,
  CreateSessionParams,
  PaymentSessionResult,
  PaymentVerificationResult,
} from './types';
import { stripeProvider, StripeProvider } from './stripe-provider';

class PaymentManager {
  private providers: Map<PaymentProviderType, PaymentProvider> = new Map();

  constructor() {
    // Register default providers
    this.registerProvider(stripeProvider);
  }

  /** Register a new payment provider */
  registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  /** Remove a payment provider */
  removeProvider(name: PaymentProviderType): void {
    this.providers.delete(name);
  }

  /** Get a registered provider */
  getProvider(name: PaymentProviderType): PaymentProvider | undefined {
    return this.providers.get(name);
  }

  /** Get all registered providers */
  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /** Check if a provider supports a currency */
  providerSupportsCurrency(providerName: PaymentProviderType, currency: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    return provider.supportedCurrencies.includes(currency.toLowerCase());
  }

  /** Create a checkout session with the specified provider */
  async createCheckoutSession(
    providerName: PaymentProviderType,
    params: CreateSessionParams
  ): Promise<PaymentSessionResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Payment provider "${providerName}" is not registered`);
    }
    return provider.createCheckoutSession(params);
  }

  /** Verify payment with the specified provider */
  async verifyPayment(
    providerName: PaymentProviderType,
    sessionId: string
  ): Promise<PaymentVerificationResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Payment provider "${providerName}" is not registered`);
    }
    return provider.verifyPayment(sessionId);
  }

  /** Redirect to checkout (Stripe-specific helper) */
  async redirectToStripeCheckout(checkoutUrl: string): Promise<void> {
    const provider = this.providers.get('stripe');
    if (!provider || !(provider instanceof StripeProvider)) {
      throw new Error('Stripe provider not available');
    }
    await provider.redirectToCheckout(checkoutUrl);
  }
}

export const paymentManager = new PaymentManager();
