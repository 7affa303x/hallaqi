import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';

export default function AchievementsPage() {
  const { themeConfig } = useApp();
  const { snapshot } = useGrowth();
  const earnedAchievements = snapshot.achievements.filter(a => a.earned).length;

  return (
    <GrowthPageShell
      title="الإنجازات"
      subtitle={`${snapshot.badgeCount} شارة · ${earnedAchievements} إنجاز`}
      badge="مباشر"
    >
      <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>الإنجازات</h3>
      <div className="space-y-2 mb-6">
        {snapshot.achievements.map((a) => {
          const pct = Math.min(100, Math.round((a.progress / Math.max(a.target, 1)) * 100));
          return (
            <article
              key={a.id}
              className="rounded-2xl border p-3 text-right"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{a.title}</p>
                <span className="text-[10px] font-bold" style={{ color: a.earned ? themeConfig.colors.success : themeConfig.colors.textMuted }}>
                  {a.earned ? 'مكتمل' : `${a.progress}/${a.target}`}
                </span>
              </div>
              <p className="text-[11px] mb-2" style={{ color: themeConfig.colors.textMuted }}>{a.description}</p>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: themeConfig.colors.primary }} />
              </div>
            </article>
          );
        })}
      </div>

      <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>الشارات</h3>
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
                  {badge.locked ? 'مقفلة' : badge.isPinned ? 'مثبتة' : 'مفتوحة'}
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
