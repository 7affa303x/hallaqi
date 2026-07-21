import GrowthPageShell from '@/components/growth/GrowthPageShell';
import {
  DAILY_MISSIONS_MOCK,
  MONTHLY_MISSIONS_MOCK,
  WEEKLY_MISSIONS_MOCK,
  type GrowthMissionMock,
} from '@/data/growthMock';
import { useApp } from '@/contexts/useApp';

function MissionSection({
  title,
  missions,
}: {
  title: string;
  missions: GrowthMissionMock[];
}) {
  const { themeConfig } = useApp();

  return (
    <section className="mb-5">
      <h2 className="text-sm font-black mb-2" style={{ color: themeConfig.colors.text }}>{title}</h2>
      <div className="space-y-2">
        {missions.map((mission) => {
          const pct = Math.min(100, Math.round((mission.progress / Math.max(mission.target, 1)) * 100));
          return (
            <article
              key={mission.id}
              className="rounded-2xl border p-3"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 text-right">
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{mission.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{mission.description}</p>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: mission.done ? `${themeConfig.colors.success}18` : `${themeConfig.colors.primary}14`,
                    color: mission.done ? themeConfig.colors.success : themeConfig.colors.primary,
                  }}
                >
                  {mission.done ? 'تم' : `${mission.progress}/${mission.target}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: themeConfig.colors.primary }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function MissionsPage() {
  const { themeConfig } = useApp();
  return (
    <GrowthPageShell title="المهمات" subtitle="Daily · Weekly · Monthly" badge="تجريبي">
      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
        واجهة تجريبية فقط — لا يوجد تتبع حقيقي للمهمات حالياً.
      </p>
      <MissionSection title="Daily Missions" missions={DAILY_MISSIONS_MOCK} />
      <MissionSection title="Weekly Missions" missions={WEEKLY_MISSIONS_MOCK} />
      <MissionSection title="Monthly Missions" missions={MONTHLY_MISSIONS_MOCK} />
    </GrowthPageShell>
  );
}
