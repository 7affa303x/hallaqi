import { ChevronLeft } from 'lucide-react';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';
import type { MissionView } from '@/lib/progression';

function MiniMission({ mission }: { mission: MissionView }) {
  const { themeConfig } = useApp();
  const pct = Math.min(100, Math.round((mission.progress / Math.max(mission.target, 1)) * 100));
  return (
    <div
      className="rounded-2xl border p-2.5 min-w-[140px] flex-1"
      style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <p className="text-[11px] font-bold truncate" style={{ color: themeConfig.colors.text }}>{mission.title}</p>
        <span className="text-[9px] font-bold shrink-0" style={{ color: mission.done ? themeConfig.colors.success : themeConfig.colors.primary }}>
          {mission.done ? '✓' : `${mission.progress}/${mission.target}`}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: themeConfig.colors.primary }} />
      </div>
      <p className="text-[9px] mt-1" style={{ color: themeConfig.colors.textMuted }}>+{mission.xpReward} XP</p>
    </div>
  );
}

/** Compact daily / weekly / monthly missions on profile (no redesign). */
export default function ProfileMissionsStrip() {
  const { themeConfig, navigate } = useApp();
  const { snapshot } = useGrowth();
  const groups: { label: string; items: MissionView[] }[] = [
    { label: 'يومي', items: snapshot.daily.slice(0, 2) },
    { label: 'أسبوعي', items: snapshot.weekly.slice(0, 2) },
    { label: 'شهري', items: snapshot.monthly.slice(0, 2) },
  ];

  return (
    <section
      className="rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      aria-label="المهمات"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>المهمات</h3>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>يومي · أسبوعي · شهري</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('missions')}
          className="flex items-center gap-0.5 text-[11px] font-bold"
          style={{ color: themeConfig.colors.primary }}
        >
          الكل
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-[10px] font-bold mb-1.5" style={{ color: themeConfig.colors.textMuted }}>{g.label}</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {g.items.map((m) => (
                <MiniMission key={m.id} mission={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
