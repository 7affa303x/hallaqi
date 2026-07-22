import { useMemo } from 'react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { levelRewardsForAudience } from '@/lib/progression/config/levelRewards';
import { achievementAudienceForRole } from '@/lib/progression/config/achievements';

export default function LevelsPage() {
  const { themeConfig } = useApp();
  const { snapshot } = useGrowth();
  const { appUser } = useAuth();
  const audience = achievementAudienceForRole(appUser?.user_role);
  const rows = useMemo(
    () => levelRewardsForAudience(audience, snapshot.level),
    [audience, snapshot.level],
  );

  const audienceLabel = audience === 'barber' ? 'حلاق' : audience === 'store' ? 'متجر' : 'عميل';

  return (
    <GrowthPageShell
      title="المستويات"
      subtitle={`مسار ${audienceLabel} · المستوى ${snapshot.level}`}
      badge="مباشر"
    >
      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
        كل مستوى يفتح مكافآت وعناوين مختلفة حسب نوع حسابك ({audienceLabel}).
      </p>
      <div className="space-y-2">
        {rows.map((row) => {
          const unlocked = snapshot.level >= row.level;
          return (
            <article
              key={row.level}
              className="rounded-2xl border p-3"
              style={{
                backgroundColor: unlocked ? `${themeConfig.colors.primary}08` : themeConfig.colors.surface,
                borderColor: unlocked ? themeConfig.colors.primary : themeConfig.colors.border,
                opacity: unlocked ? 1 : 0.85,
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white"
                    style={{ backgroundColor: unlocked ? themeConfig.colors.primary : themeConfig.colors.border }}
                  >
                    {row.level}
                  </span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{row.title}</p>
                    <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{row.xpRequired} XP</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold" style={{ color: unlocked ? themeConfig.colors.success : themeConfig.colors.textMuted }}>
                  {unlocked ? 'مفتوح' : 'مقفل'}
                </span>
              </div>
              {row.perks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {row.perks.map(perk => (
                    <li key={perk} className="text-[10px] flex items-center gap-1.5" style={{ color: themeConfig.colors.textMuted }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: themeConfig.colors.primary }} />
                      {perk}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </GrowthPageShell>
  );
}
