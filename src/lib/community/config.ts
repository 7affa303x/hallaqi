/**
 * Community layer configuration — not XP engine values.
 * XP awards go through ProgressionService.awardXP('mission_reward', amount).
 */

export const COMMUNITY_XP = {
  transformationPublishedEach: 25,
  tagAccepted: 10,
  firstShareExperience: 50,
  shareExperience: 10,
} as const;

export const RANKING_METRICS = [
  'bookings',
  'xp',
  'rating',
  'completed_jobs',
  'followers',
] as const;

export type RankingMetric = (typeof RANKING_METRICS)[number];

export const RANKING_SCOPES = [
  'country',
  'state',
  'city',
  'district',
] as const;

export type RankingScope = (typeof RANKING_SCOPES)[number];

export const RANKING_PERIODS = ['weekly', 'monthly', 'all_time'] as const;

export type RankingPeriod = (typeof RANKING_PERIODS)[number];

export const RANKING_METRIC_LABELS: Record<RankingMetric, string> = {
  bookings: 'الحجوزات',
  xp: 'نقاط XP',
  rating: 'التقييم',
  completed_jobs: 'الأعمال المكتملة',
  followers: 'المتابعين',
};

export const RANKING_SCOPE_LABELS: Record<RankingScope, string> = {
  country: 'الوطني',
  state: 'الولاية',
  city: 'البلدية',
  district: 'الحي',
};

/** Default meme packs — architecture ready for more packs later. */
export const MEME_PACKS = [
  {
    id: 'default',
    nameAr: 'كلاسيك',
    stickers: ['😂', '🔥', '💈', '✨', '👏', '🤩', '💯', '🙌'],
  },
  {
    id: 'barber',
    nameAr: 'حلاقي',
    stickers: ['✂️', '💈', '🪒', '🧔', '💇', '🪮', '🧴', '⭐'],
  },
] as const;

export type MemePackId = (typeof MEME_PACKS)[number]['id'];

export const MAX_PINNED_TRANSFORMATIONS = 3;

// TODO(contest-rewards): prize distribution for before/after contest winners
