import { ChevronLeft } from 'lucide-react';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';

/** Pinned badges on profile (max 8) from Progression Engine. */
export default function BadgeShowcase() {
  const { themeConfig, navigate } = useApp();
  const { snapshot } = useGrowth();
  const badges = snapshot.pinnedBadges.slice(0, 8);

  return (
    <section
      className="rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      aria-label="الشارات المثبتة"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>شارات مثبتة</h3>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            {snapshot.badgeCount > 0 ? `${snapshot.badgeCount} مفتوحة · حتى 8 مثبتة` : 'أكمل مهمات لفتح الشارات'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('badge-manager')}
          className="flex items-center gap-0.5 text-[11px] font-bold"
          style={{ color: themeConfig.colors.primary }}
        >
          إدارة
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="flex flex-col items-center gap-1 rounded-2xl p-2 border text-center"
            style={{
              backgroundColor: themeConfig.colors.background,
              borderColor: themeConfig.colors.border,
              opacity: badge.locked ? 0.55 : 1,
            }}
            title={badge.description}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
              style={{
                backgroundColor: `${badge.color}18`,
                filter: badge.locked ? 'grayscale(1)' : undefined,
              }}
            >
              {badge.locked ? '🔒' : badge.emoji}
            </span>
            <span className="text-[9px] font-bold leading-tight line-clamp-2" style={{ color: themeConfig.colors.text }}>
              {badge.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
