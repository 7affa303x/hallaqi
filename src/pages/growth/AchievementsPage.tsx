import { useMemo, useState } from 'react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';
import type { AchievementView } from '@/lib/progression';

type AchievementSection = 'booking' | 'community' | 'growth';

const SECTIONS: { id: AchievementSection; label: string }[] = [
  { id: 'booking', label: 'الحجوزات' },
  { id: 'community', label: 'المجتمع' },
  { id: 'growth', label: 'الدعوات والنمو' },
];

function sectionForAchievement(a: AchievementView): AchievementSection {
  const id = a.id;
  if (id.includes('referral') || id.includes('invite')) return 'growth';
  if (id.includes('review') || id.includes('comment') || id.includes('post')) return 'community';
  return 'booking';
}

function AchievementCard({ achievement }: { achievement: AchievementView }) {
  const { themeConfig } = useApp();
  const pct = Math.min(100, Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100));
  return (
    <article
      className="rounded-2xl border p-3 text-right"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{achievement.title}</p>
        <span className="text-[10px] font-bold" style={{ color: achievement.earned ? themeConfig.colors.success : themeConfig.colors.textMuted }}>
          {achievement.earned ? 'مكتمل' : `${achievement.progress}/${achievement.target}`}
        </span>
      </div>
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
  const [section, setSection] = useState<AchievementSection>('booking');
  const earnedAchievements = snapshot.achievements.filter(a => a.earned).length;

  const grouped = useMemo(() => {
    const map: Record<AchievementSection, AchievementView[]> = { booking: [], community: [], growth: [] };
    for (const a of snapshot.achievements) {
      map[sectionForAchievement(a)].push(a);
    }
    return map;
  }, [snapshot.achievements]);

  const visible = grouped[section];
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
        className="flex gap-1 p-1 rounded-2xl border mb-4"
        style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      >
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(s.id)}
              className="flex-1 h-10 rounded-xl text-[11px] font-bold"
              style={{
                backgroundColor: active ? themeConfig.colors.primary : 'transparent',
                color: active ? '#fff' : themeConfig.colors.textMuted,
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
