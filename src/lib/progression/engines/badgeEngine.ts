import { BADGE_CATALOG, MAX_PINNED_BADGES } from '@/lib/progression/config/badges';
import { criteriaMet } from '@/lib/progression/engines/criteria';
import type {
  BadgeDef,
  BadgeView,
  ProgressionSignals,
  StreakState,
  UserBadgeState,
} from '@/lib/progression/models/types';

export function evaluateNewBadges(
  signals: ProgressionSignals,
  streak: StreakState,
  owned: UserBadgeState[],
  catalog: readonly BadgeDef[] = BADGE_CATALOG,
): BadgeDef[] {
  const ownedIds = new Set(owned.map(b => b.badgeId));
  return catalog.filter(b => !ownedIds.has(b.id) && criteriaMet(b.criteria, signals, streak));
}

export function toBadgeViews(
  catalog: readonly BadgeDef[],
  owned: UserBadgeState[],
): BadgeView[] {
  const byId = new Map(owned.map(o => [o.badgeId, o]));
  return catalog.map((b) => {
    const o = byId.get(b.id);
    return {
      id: b.id,
      name: b.nameAr,
      description: b.descriptionAr,
      emoji: b.emoji,
      color: b.color,
      category: b.category,
      locked: !o,
      isPinned: Boolean(o?.isPinned),
      pinOrder: o?.pinOrder ?? null,
    };
  });
}

export function pinnedBadgeViews(badges: BadgeView[], limit = MAX_PINNED_BADGES): BadgeView[] {
  const pinned = badges
    .filter(b => !b.locked && b.isPinned)
    .sort((a, b) => (a.pinOrder ?? 99) - (b.pinOrder ?? 99));
  if (pinned.length > 0) return pinned.slice(0, limit);
  // Fallback: show up to 8 earned (or locked placeholders) for profile showcase
  const earned = badges.filter(b => !b.locked).slice(0, limit);
  if (earned.length > 0) return earned;
  return badges.slice(0, limit);
}

export { MAX_PINNED_BADGES };
