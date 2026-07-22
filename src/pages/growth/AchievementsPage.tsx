import { useMemo, useState } from 'react';
import { Coins } from 'lucide-react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';
import { ACHIEVEMENT_CATEGORY_LABELS, type AchievementCategory, type AchievementView } from '@/lib/progression';

const SECTIONS = (Object.entries(ACHIEVEMENT_CATEGORY_LABELS) as [AchievementCategory, string][]).map(
  ([id, label]) => ({ id, label }),
);

function AchievementCard({ achievement }: { achievement: AchievementView }) {
  const { themeConfig } = useApp();
  const pct = Math.min(100, Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100));
  const tierReward = achievement.tierCoinRewards[achievement.activeTier - 1] ?? achievement.coinReward;
  const tierXp = achievement.tierXpRewards[achievement.activeTier - 1] ?? achievement.xpReward;

  return (
    <article
      className="rounded-2xl border p-3 text-right"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: achievement.earned ? `${themeConfig.colors.success}18` : `${themeConfig.colors.primary}14`,
            color: achievement.earned ? themeConfig.colors.success : themeConfig.colors.primary,
          }}
        >
          {achievement.earned ? 'مكتمل' : `المستوى ${achievement.activeTier}`}
        </span>
        <div className="flex items-center gap-2">
          {!achievement.earned && (
            <span className="text-[10px] font-bold" style={{ color: themeConfig.colors.textMuted }}>
              {achievement.progress}/{achievement.target}
            </span>
          )}
          <span className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: themeConfig.colors.accent }}>
            <Coins size={10} />
            {tierReward}+{tierXp} XP
          </span>
        </div>
      </div>
      <p className="text-sm font-bold mb-0.5" style={{ color: themeConfig.colors.text }}>{achievement.title}</p>
      <p className="text-[11px] mb-2" style={{ color: themeConfig.colors.textMuted }}>{achievement.description}</p>
      <div className="flex gap-1 mb-2">
        {Array.from({ length: achievement.maxTiers }, (_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{
              backgroundColor: i < achievement.completedTiers
                ? themeConfig.colors.success
                : i === achievement.activeTier - 1 && !achievement.earned
                  ? themeConfig.colors.primary
                  : themeConfig.colors.border,
            }}
          />
        ))}
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: themeConfig.colors.primary }} />
      </div>
    </article>
  );
}

export default function AchievementsPage() {
  const { themeConfig } = useApp();
  const { snapshot } = useGrowth();
  const [section, setSection] = useState<AchievementCategory>('booking');
  const earnedAchievements = snapshot.achievements.filter(a => a.earned).length;

  const grouped = useMemo(() => {
    const map = Object.fromEntries(SECTIONS.map(s => [s.id, [] as AchievementView[]])) as Record<
      AchievementCategory,
      AchievementView[]
    >;
    for (const a of snapshot.achievements) {
      map[a.category]?.push(a);
    }
    return map;
  }, [snapshot.achievements]);

  const visible = grouped[section] ?? [];
  const sectionDone = visible.filter(a => a.earned).length;

  return (
    <GrowthPageShell
      title="الإنجازات"
      subtitle={`${earnedAchievements}/${snapshot.achievements.length} مكتملة · ${snapshot.badgeCount} شارة`}
      badge="مباشر"
    >
      <div
        role="tablist"
        aria-label="أقسام الإنجازات"
        className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-4 -mx-1 px-1"
      >
        {SECTIONS.map((s) => {
          const active = section === s.id;
          const count = grouped[s.id]?.length ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(s.id)}
              className="shrink-0 h-10 px-4 rounded-xl text-[11px] font-bold border"
              style={{
                backgroundColor: active ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: active ? '#fff' : themeConfig.colors.textMuted,
                borderColor: active ? themeConfig.colors.primary : themeConfig.colors.border,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] mb-3" style={{ color: themeConfig.colors.textMuted }}>
        {sectionDone}/{visible.length} في هذا القسم
      </p>

      <div className="space-y-2">
        {visible.map(a => <AchievementCard key={a.id} achievement={a} />)}
        {visible.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: themeConfig.colors.textMuted }}>لا إنجازات في هذا القسم بعد</p>
        )}
      </div>
    </GrowthPageShell>
  );
}
