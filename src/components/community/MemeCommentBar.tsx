import { useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { MEME_PACKS } from '@/lib/community';

export default function MemeCommentBar({
  enabled,
  onSubmit,
}: {
  enabled: boolean;
  onSubmit: (sticker: string, packId: string) => void;
}) {
  const { themeConfig } = useApp();
  const [packId, setPackId] = useState<string>(MEME_PACKS[0].id);
  const pack = MEME_PACKS.find(p => p.id === packId) || MEME_PACKS[0];

  if (!enabled) return null;

  return (
    <div className="rounded-2xl border p-2 mt-2" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }} dir="rtl">
      <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar">
        {MEME_PACKS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPackId(p.id)}
            className="shrink-0 px-2 h-7 rounded-lg text-[10px] font-bold"
            style={{
              backgroundColor: packId === p.id ? themeConfig.colors.primary : themeConfig.colors.background,
              color: packId === p.id ? '#fff' : themeConfig.colors.textMuted,
            }}
          >
            {p.nameAr}
          </button>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {pack.stickers.map(sticker => (
          <button
            key={sticker}
            type="button"
            onClick={() => onSubmit(sticker, pack.id)}
            className="shrink-0 w-10 h-10 rounded-xl text-xl flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.background }}
          >
            {sticker}
          </button>
        ))}
      </div>
    </div>
  );
}
