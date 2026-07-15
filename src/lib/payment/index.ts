/**
 * Payment Module - Public API
 * 
 * Provider Architecture:
 * - PaymentProvider interface defines the contract
 * - StripeProvider implements Stripe integration
 * - PaymentManager orchestrates provider selection
 * 
 * To add a new provider (e.g., PayTabs):
 * 1. Create paytabs-provider.ts implementing PaymentProvider
 * 2. Register it: paymentManager.registerProvider(new PayTabsProvider())
 * 3. Use it: paymentManager.createCheckoutSession('paytabs', params)
 */

export * from './types';
export { stripeProvider, StripeProvider } from './stripe-provider';
export { paymentManager } from './payment-manager';
