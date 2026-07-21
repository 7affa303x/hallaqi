import { ChevronLeft, Plus } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useCommunity } from '@/hooks/useCommunity';
import TransformationCard from '@/components/community/TransformationCard';

export default function TransformationGallery() {
  const { themeConfig, navigate } = useApp();
  const { appUser } = useAuth();
  const { transformations, pinnedTransformations } = useCommunity();
  const isBarber = appUser?.user_role === 'barber' || appUser?.user_role === 'specialist';
  const published = transformations.filter(t => t.status === 'published');
  const show = pinnedTransformations.length > 0 ? pinnedTransformations : published.slice(0, 4);

  if (show.length === 0 && !isBarber) return null;

  return (
    <section
      className="rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      aria-label="معرض التحولات"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>معرض التحولات</h3>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            {pinnedTransformations.length > 0 ? 'مثبتة' : `${published.length} منشورة`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isBarber && (
            <button
              type="button"
              onClick={() => navigate('create-transformation')}
              className="flex items-center gap-0.5 text-[11px] font-bold"
              style={{ color: themeConfig.colors.primary }}
            >
              <Plus size={14} />
              تحول جديد
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('leaderboard')}
            className="flex items-center gap-0.5 text-[11px] font-bold"
            style={{ color: themeConfig.colors.primary }}
          >
            الترتيب المحلي
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>
      {show.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {show.map(t => <TransformationCard key={t.id} item={t} compact />)}
        </div>
      ) : (
        <p className="text-[11px] text-center py-4" style={{ color: themeConfig.colors.textMuted }}>
          أنشئ أول تحول قبل/بعد مع عميلك
        </p>
      )}
    </section>
  );
}
