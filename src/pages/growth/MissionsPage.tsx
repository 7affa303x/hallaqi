import { useMemo, useState } from 'react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { missionsForPeriod, type MissionType } from '@/lib/progression';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';
import type { MissionView } from '@/lib/progression';

const PERIODS: { id: MissionType; label: string }[] = [
  { id: 'daily', label: 'يومي' },
  { id: 'weekly', label: 'أسبوعي' },
  { id: 'monthly', label: 'شهري' },
];

function MissionCard({ mission }: { mission: MissionView }) {
  const { themeConfig } = useApp();
  const pct = Math.min(100, Math.round((mission.progress / Math.max(mission.target, 1)) * 100));
  return (
    <article
      className="rounded-2xl border p-3"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{mission.title}</p>
          <p className="text-[11px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{mission.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              backgroundColor: mission.done ? `${themeConfig.colors.success}18` : `${themeConfig.colors.primary}14`,
              color: mission.done ? themeConfig.colors.success : themeConfig.colors.primary,
            }}
          >
            {mission.done ? 'تم ✓' : `${mission.progress}/${mission.target}`}
          </span>
          <span className="text-[9px] font-bold" style={{ color: themeConfig.colors.textMuted }}>+{mission.xpReward} XP</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: themeConfig.colors.primary }}
        />
      </div>
    </article>
  );
}

export default function MissionsPage() {
  const { themeConfig } = useApp();
  const { snapshot } = useGrowth();
  const [period, setPeriod] = useState<MissionType>('daily');
  const missions = useMemo(() => missionsForPeriod(snapshot, period), [snapshot, period]);
  const doneCount = missions.filter(m => m.done).length;

  return (
    <GrowthPageShell title="المهمات" subtitle={`${doneCount}/${missions.length} مكتملة`} badge="مباشر">
      <div
        role="tablist"
        aria-label="فترة المهمات"
        className="flex gap-1 p-1 rounded-2xl border mb-4"
        style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      >
        {PERIODS.map((p) => {
          const active = period === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(p.id)}
              className="flex-1 h-10 rounded-xl text-xs font-bold transition-none"
              style={{
                backgroundColor: active ? themeConfig.colors.primary : 'transparent',
                color: active ? '#fff' : themeConfig.colors.textMuted,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] mb-3 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
        تُحدَّث تلقائياً من نشاطك. قيم XP من محرك التقدّم فقط — بدون تعديل يدوي.
      </p>

      <div className="space-y-2">
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </div>
    </GrowthPageShell>
  );
}
