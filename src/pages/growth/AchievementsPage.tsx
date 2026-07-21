import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';

export default function AchievementsPage() {
  const { themeConfig } = useApp();
  const { snapshot } = useGrowth();

  return (
    <GrowthPageShell
      title="الإنجازات"
      subtitle={`${snapshot.badgeCount} شارة مفتوحة`}
      badge="مباشر"
    >
      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
        تُفتح الشارات تلقائياً عند إكمال الشروط من نشاطك الحقيقي في التطبيق.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {snapshot.badges.map((badge) => (
          <article
            key={badge.id}
            className="rounded-3xl border p-3 text-right"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: themeConfig.colors.border,
              opacity: badge.locked ? 0.7 : 1,
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                style={{
                  backgroundColor: `${badge.color}18`,
                  filter: badge.locked ? 'grayscale(0.85)' : undefined,
                }}
              >
                {badge.locked ? '🔒' : badge.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate" style={{ color: themeConfig.colors.text }}>{badge.name}</p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: badge.locked ? themeConfig.colors.textMuted : themeConfig.colors.success }}>
                  {badge.locked ? 'مقفلة' : 'مفتوحة'}
                </p>
              </div>
            </div>
            <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>{badge.description}</p>
          </article>
        ))}
      </div>
    </GrowthPageShell>
  );
}
