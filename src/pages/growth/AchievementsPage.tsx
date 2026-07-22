import { useMemo, useState } from 'react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';
import { ACHIEVEMENT_CATEGORY_LABELS, TIER_METAL_COLORS, type AchievementCategory } from '@/lib/progression';

const SECTIONS = (Object.entries(ACHIEVEMENT_CATEGORY_LABELS) as [AchievementCategory, string][]).map(
  ([id, label]) => ({ id, label }),
);

function TierDots({ completed, metals }: { completed: number; metals: ('bronze' | 'silver' | 'gold')[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0" aria-hidden>
      {metals.map((metal, i) => (
        <span
          key={metal}
          className="w-1.5 h-1.5 rounded-full border"
          style={{
            backgroundColor: i < completed ? TIER_METAL_COLORS[metal] : 'transparent',
            borderColor: TIER_METAL_COLORS[metal],
          }}
        />
      ))}
    </span>
  );
}

function AchievementCard({ achievement }: { achievement: import('@/lib/progression').AchievementView }) {
  const { themeConfig } = useApp();
  const pct = Math.min(100, Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100));
  const tierLabel = achievement.completedTiers >= achievement.maxTiers
    ? 'ذهبي'
    : achievement.activeTier === 1 ? 'برونزي' : achievement.activeTier === 2 ? 'فضي' : 'ذهبي';

  return (
    <article className="rounded-2xl border p-3 text-right" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: themeConfig.colors.text }}>{achievement.title}</p>
          <TierDots completed={achievement.completedTiers} metals={achievement.tierMetals} />
        </div>
        <span className="text-[10px] font-bold shrink-0" style={{ color: achievement.earned ? themeConfig.colors.success : themeConfig.colors.textMuted }}>
          {achievement.earned ? 'مكتمل' : `${achievement.progress}/${achievement.target}`}
        </span>
      </div>
      <p className="text-[10px] mb-2" style={{ color: themeConfig.colors.primary }}>
        {achievement.earned ? 'كل المستويات' : `المستوى ${tierLabel}`} · {achievement.coinReward} عملة
      </p>
      <p className="text-[11px] mb-2" style={{ color: themeConfig.colors.textMuted }}>{achievement.description}</p>
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
    const map = Object.fromEntries(SECTIONS.map(s => [s.id, [] as typeof snapshot.achievements])) as Record<AchievementCategory, typeof snapshot.achievements>;
    for (const a of snapshot.achievements) map[a.category]?.push(a);
    return map;
  }, [snapshot.achievements]);

  const visible = grouped[section] ?? [];
  const sectionDone = visible.filter(a => a.earned).length;

  return (
    <GrowthPageShell title="الإنجازات" subtitle={`${earnedAchievements}/${snapshot.achievements.length} مكتملة · ${snapshot.badgeCount} شارة`} badge="مباشر">
      <div role="tablist" className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-3 -mx-1 px-1">
        {SECTIONS.map((s) => {
          const count = grouped[s.id]?.length ?? 0;
          if (!count) return null;
          const active = section === s.id;
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
      <p className="text-[11px] mb-3" style={{ color: themeConfig.colors.textMuted }}>{sectionDone}/{visible.length} في هذا القسم</p>
      <div className="space-y-2">
        {visible.map(a => <AchievementCard key={a.id} achievement={a} />)}
        {visible.length === 0 && <p className="text-center text-sm py-8" style={{ color: themeConfig.colors.textMuted }}>لا إنجازات في هذا القسم</p>}
      </div>
    </GrowthPageShell>
  );
}
