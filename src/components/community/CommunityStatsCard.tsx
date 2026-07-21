import { useApp } from '@/contexts/useApp';
import { useCommunity } from '@/hooks/useCommunity';

export default function CommunityStatsCard() {
  const { themeConfig } = useApp();
  const { stats } = useCommunity();
  if (!stats) return null;

  const items = [
    { label: 'تحولات', value: stats.transformationsPublished },
    { label: 'وسوم', value: stats.tagsReceived },
    { label: 'مشاركات', value: stats.sharesCount },
    { label: 'مسابقات', value: stats.contestEntries },
  ];

  return (
    <section
      className="rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      dir="rtl"
    >
      <h3 className="text-sm font-bold mb-3" style={{ color: themeConfig.colors.text }}>إحصائيات المجتمع</h3>
      <div className="grid grid-cols-4 gap-2">
        {items.map(item => (
          <div key={item.label} className="text-center rounded-2xl p-2" style={{ backgroundColor: themeConfig.colors.background }}>
            <p className="text-lg font-black" style={{ color: themeConfig.colors.primary }}>{item.value}</p>
            <p className="text-[9px] font-medium" style={{ color: themeConfig.colors.textMuted }}>{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
