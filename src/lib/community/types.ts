import type { RankingMetric, RankingPeriod, RankingScope } from '@/lib/community/config';

export type TransformationStatus = 'draft' | 'pending_customer' | 'published' | 'rejected';
export type TagStatus = 'pending' | 'accepted' | 'rejected';
export type TagResourceType = 'transformation' | 'forum_post';

export interface Transformation {
  id: string;
  barberId: string;
  customerId: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  caption: string | null;
  status: TransformationStatus;
  contestId: string | null;
  forumPostId: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  pinnedByBarber: boolean;
  pinnedByCustomer: boolean;
  createdAt: string;
  publishedAt: string | null;
  barberName?: string;
  barberAvatar?: string | null;
  customerName?: string;
  customerAvatar?: string | null;
}

export interface CommunityTag {
  id: string;
  resourceType: TagResourceType;
  resourceId: string;
  taggerId: string;
  taggedUserId: string;
  status: TagStatus;
  createdAt: string;
  respondedAt: string | null;
  taggerName?: string;
  taggedName?: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  value: number;
  rank: number;
}

export interface LeaderboardSnapshot {
  scopeType: RankingScope;
  scopeValue: string;
  metric: RankingMetric;
  period: RankingPeriod;
  entries: LeaderboardEntry[];
  computedAt: string;
  userRank?: number;
}

export interface ShareCard {
  id: string;
  userId: string;
  bookingId: string | null;
  barberName: string;
  serviceName: string | null;
  rating: number | null;
  shareChannel: string | null;
  xpAwarded: number;
  createdAt: string;
}

export interface CommunityStats {
  transformationsPublished: number;
  tagsReceived: number;
  tagsGiven: number;
  sharesCount: number;
  contestEntries: number;
}

export interface CreateTransformationInput {
  barberId: string;
  customerId: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  caption?: string;
  contestId?: string;
}
