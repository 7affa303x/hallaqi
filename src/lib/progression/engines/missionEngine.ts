import { MISSION_CATALOG, missionsByType } from '@/lib/progression/config/missions';
import type {
  MissionDef,
  MissionType,
  MissionView,
  ProgressionSignals,
  UserMissionState,
} from '@/lib/progression/models/types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function periodKeyFor(type: MissionType, d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  if (type === 'daily') return `${y}-${m}-${day}`;
  if (type === 'monthly') return `${y}-${m}`;
  if (type === 'seasonal') {
    const season = Math.floor(d.getUTCMonth() / 3) + 1;
    return `${y}-S${season}`;
  }
  // ISO week (UTC approximation, Monday-based)
  const tmp = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week =
    1
    + Math.round(
      ((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7))
        / 7,
    );
  return `${tmp.getUTCFullYear()}-W${pad(week)}`;
}

export function signalValue(signalKey: string, signals: ProgressionSignals): number {
  switch (signalKey) {
    case 'daily_login':
      return 1; // presence today is implied by evaluation
    case 'forum_comment_today':
      return signals.forumCommentToday;
    case 'review_today':
      return signals.reviewsToday;
    case 'has_avatar':
      return signals.hasAvatar ? 1 : 0;
    case 'bookings_this_week':
      return signals.bookingsThisWeek;
    case 'forum_posts_week':
      return signals.forumPostsThisWeek;
    case 'referral_shares':
      return signals.referralShares;
    case 'bookings_this_month':
      return signals.bookingsThisMonth;
    case 'reviewed_bookings':
      return signals.reviewedBookings;
    case 'gallery_updated':
      return signals.galleryUpdatedThisMonth ? 1 : 0;
    default:
      return 0;
  }
}

export function buildMissionViews(
  signals: ProgressionSignals,
  stored: UserMissionState[],
  catalog: readonly MissionDef[] = MISSION_CATALOG,
  now = new Date(),
): MissionView[] {
  const byKey = new Map(stored.map(s => [`${s.missionId}:${s.periodKey}`, s]));
  return catalog.map((m) => {
    const pk = periodKeyFor(m.type, now);
    const row = byKey.get(`${m.id}:${pk}`);
    const progress = Math.min(m.target, Math.max(row?.progress ?? 0, signalValue(m.signalKey, signals)));
    const done = progress >= m.target;
    return {
      id: m.id,
      title: m.titleAr,
      description: m.descriptionAr,
      type: m.type,
      progress,
      target: m.target,
      done,
      xpReward: m.xpReward,
      claimed: Boolean(row?.claimedAt),
    };
  });
}

export function missionsOfType(views: MissionView[], type: MissionType): MissionView[] {
  return views.filter(m => m.type === type);
}

export { missionsByType, MISSION_CATALOG };
