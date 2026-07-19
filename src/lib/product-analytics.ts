import { track } from '@vercel/analytics';

export type ProductEvent =
  | 'Barber Viewed'
  | 'Booking Started'
  | 'Booking Services Selected'
  | 'Booking Time Selected'
  | 'Payment Method Selected'
  | 'Booking Submitted'
  | 'Forum Post Created'
  | 'Push Enabled'
  | 'Loyalty Voucher Selected'
  | 'Discovery Filter Applied'
  | 'Discovery Share'
  | 'Discovery Compare Opened'
  | 'AI Advice Rated';

export function trackProductEvent(
  name: ProductEvent,
  properties: Record<string, string | number | boolean | null | undefined> = {}
) {
  try {
    track(name, properties);
  } catch {
    // Analytics must never interrupt a booking or account action.
  }
}
