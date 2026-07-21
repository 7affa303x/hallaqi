import { useApp } from '@/contexts/useApp';
import type { Transformation } from '@/lib/community/types';

export default function TransformationCard({ item, compact = false }: { item: Transformation; compact?: boolean }) {
  const { themeConfig } = useApp();
  return (
    <article
      className={`rounded-2xl border overflow-hidden ${compact ? '' : ''}`}
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      dir="rtl"
    >
      <div className="grid grid-cols-2 gap-0.5 bg-black/5">
        <img src={item.beforeImageUrl} alt="قبل" className="w-full aspect-square object-cover" loading="lazy" />
        <img src={item.afterImageUrl} alt="بعد" className="w-full aspect-square object-cover" loading="lazy" />
      </div>
      <div className="p-3">
        <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>
          {item.barberName || 'حلاق'} × {item.customerName || 'عميل'}
        </p>
        {item.caption && (
          <p className="text-[10px] mt-1 line-clamp-2" style={{ color: themeConfig.colors.textMuted }}>{item.caption}</p>
        )}
        <div className="flex gap-3 mt-2 text-[9px]" style={{ color: themeConfig.colors.textMuted }}>
          <span>❤️ {item.likesCount}</span>
          <span>💬 {item.commentsCount}</span>
          <span>↗ {item.sharesCount}</span>
        </div>
      </div>
    </article>
  );
}
