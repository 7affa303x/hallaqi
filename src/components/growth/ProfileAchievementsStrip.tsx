import { ChevronLeft } from 'lucide-react';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';

/** Compact achievements list on profile. */
export default function ProfileAchievementsStrip() {
  const { themeConfig, navigate } = useApp();
  const { snapshot } = useGrowth();
  const items = snapshot.achievements.slice(0, 4);
  const earned = snapshot.achievements.filter(a => a.earned).length;

  return (
    <section
      className="rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      aria-label="الإنجازات"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإنجازات</h3>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{earned}/{snapshot.achievements.length} مكتملة</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('achievements')}
          className="flex items-center gap-0.5 text-[11px] font-bold"
          style={{ color: themeConfig.colors.primary }}
        >
          الكل
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {items.map((a) => {
          const pct = Math.min(100, Math.round((a.progress / Math.max(a.target, 1)) * 100));
          return (
            <div key={a.id} className="rounded-2xl border p-2.5" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>{a.title}</p>
                <span className="text-[9px] font-bold" style={{ color: a.earned ? themeConfig.colors.success : themeConfig.colors.textMuted }}>
                  {a.earned ? 'تم' : `${a.progress}/${a.target}`}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: themeConfig.colors.primary }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
