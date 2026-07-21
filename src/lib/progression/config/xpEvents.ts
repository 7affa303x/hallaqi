/**
 * Central XP event amounts — change values here only.
 * UI and feature code must never hardcode XP.
 *
 * TODO(coins): map events → coins in a parallel COIN_EVENTS table when Reward Store ships.
 */

export const XP_EVENT_TYPES = [
  'first_booking',
  'completed_booking',
  'returning_customer_booking',
  'invite_customer',
  'invite_barber',
  'complete_profile',
  'phone_verification',
  'first_gallery_photo',
  'gallery_completed',
  'create_post',
  'create_comment',
  'review_with_text',
  'star_rating_only',
  'daily_login',
  'mission_reward',
  'badge_bonus',
  'achievement_reward',
] as const;

export type XpEventType = (typeof XP_EVENT_TYPES)[number];

/** Default XP per event type. */
export const XP_REWARDS: Record<XpEventType, number> = {
  first_booking: 20,
  completed_booking: 10,
  returning_customer_booking: 20,
  invite_customer: 10,
  invite_barber: 50,
  complete_profile: 20,
  phone_verification: 5,
  first_gallery_photo: 10,
  gallery_completed: 50,
  create_post: 5,
  create_comment: 2,
  review_with_text: 5,
  star_rating_only: 1,
  daily_login: 1,
  mission_reward: 0, // amount passed explicitly
  badge_bonus: 0,
  achievement_reward: 0,
};

/** Events limited to once per calendar day (UTC). */
export const DAILY_LIMITED_XP_EVENTS: ReadonlySet<XpEventType> = new Set([
  'create_post',
  'create_comment',
  'daily_login',
]);

export function xpAmountFor(eventType: XpEventType, override?: number): number {
  if (typeof override === 'number' && override > 0) return override;
  return XP_REWARDS[eventType] ?? 0;
}
