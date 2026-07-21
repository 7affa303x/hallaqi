import { useApp } from '@/contexts/useApp';
import { useCommunity } from '@/hooks/useCommunity';
import { TagService } from '@/lib/community';

export default function PendingTagsBanner() {
  const { themeConfig } = useApp();
  const { pendingTags, refresh } = useCommunity();

  if (pendingTags.length === 0) return null;

  const tag = pendingTags[0];

  const respond = async (accept: boolean) => {
    await TagService.respond(tag.id, accept, tag.taggerId);
    await refresh();
  };

  return (
    <section
      className="rounded-2xl border p-3 mx-4 mt-3"
      style={{ backgroundColor: themeConfig.colors.primary + '12', borderColor: themeConfig.colors.primary + '40' }}
      dir="rtl"
    >
      <p className="text-xs font-bold mb-1" style={{ color: themeConfig.colors.text }}>طلب وسم</p>
      <p className="text-[11px] mb-2" style={{ color: themeConfig.colors.textMuted }}>
        {tag.taggerName || 'مستخدم'} يريد الإشارة إليك
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => void respond(true)} className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>
          قبول
        </button>
        <button type="button" onClick={() => void respond(false)} className="flex-1 h-9 rounded-xl text-xs font-bold border" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
          رفض
        </button>
      </div>
    </section>
  );
}
