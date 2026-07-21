export type ReferralType = 'barber' | 'customer';
export type ReferralStatus = 'pending' | 'completed' | 'rejected' | 'banned';

export interface ReferralStats {
  code: string;
  referralType: ReferralType;
  referralLink: string;
  invitedUsers: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalXpEarned: number;
  invitesSent: number;
}

export interface CoinsBalance {
  balance: number;
}

export interface RewardStoreItem {
  id: string;
  title: string;
  description: string | null;
  category: 'pro' | 'coupon' | 'product' | 'credit' | 'gift_card';
  coinCost: number;
  imageEmoji: string;
  comingSoon: boolean;
}

export interface MiniSite {
  id: string;
  userId: string;
  slug: string;
  theme: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
}

export interface AmbassadorStatus {
  unlocked: boolean;
  ratingSnapshot?: number;
  levelSnapshot?: number;
  bookingsSnapshot?: number;
  isVerified?: boolean;
}

export type GrowthAnalyticsEvent =
  | 'invite_sent'
  | 'invite_accepted'
  | 'referral_completed'
  | 'coins_earned'
  | 'mission_completed'
  | 'leaderboard_viewed';

export type GrowthRankingMetric =
  | 'xp'
  | 'bookings'
  | 'reviews'
  | 'growth'
  | 'community'
  | 'rating'
  | 'followers'
  | 'completed_jobs';
