import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Pin } from 'lucide-react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';
import { MAX_PINNED_BADGES } from '@/lib/progression';

export default function PinBadgesPage() {
  const { themeConfig, goBack } = useApp();
  const { snapshot, pinBadges } = useGrowth();
  const unlocked = useMemo(() => snapshot.badges.filter(b => !b.locked), [snapshot.badges]);
  const initialPinned = useMemo(() => snapshot.pinnedBadges.map(b => b.id), [snapshot.pinnedBadges]);
  const [selected, setSelected] = useState<string[]>(initialPinned);

  useEffect(() => { setSelected(initialPinned); }, [initialPinned]);

  const toggle = useCallback((badgeId: string) => {
    setSelected((prev) => {
      if (prev.includes(badgeId)) return prev.filter(id => id !== badgeId);
      if (prev.length >= MAX_PINNED_BADGES) return prev;
      return [...prev, badgeId];
    });
  }, []);

  const save = useCallback(() => {
    pinBadges(selected);
    goBack();
  }, [pinBadges, selected, goBack]);

  return (
    <GrowthPageShell title="تثبيت الشارات" subtitle={`اختر حتى ${MAX_PINNED_BADGES} شارات`} badge={`${selected.length}/${MAX_PINNED_BADGES}`}>
      <p className="text-[11px] mb-4" style={{ color: themeConfig.colors.textMuted }}>
        اضغط على الشارات المفتوحة لتثبيتها في بطاقة «شارات مثبتة» على البروفايل.
      </p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {unlocked.map((badge) => {
          const pinned = selected.includes(badge.id);
          const full = !pinned && selected.length >= MAX_PINNED_BADGES;
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => toggle(badge.id)}
              disabled={full}
              className="relative flex flex-col items-center gap-1.5 rounded-2xl p-3 border text-center"
              style={{
                backgroundColor: pinned ? `${themeConfig.colors.primary}10` : themeConfig.colors.surface,
                borderColor: pinned ? themeConfig.colors.primary : themeConfig.colors.border,
                opacity: full ? 0.45 : 1,
              }}
            >
              {pinned && (
                <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary }}>
                  <Pin size={10} className="text-white" />
                </span>
              )}
              <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${badge.color}18` }}>
                {badge.emoji}
              </span>
              <span className="text-[10px] font-bold line-clamp-2" style={{ color: themeConfig.colors.text }}>{badge.name}</span>
            </button>
          );
        })}
      </div>
      {unlocked.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: themeConfig.colors.textMuted }}>لا توجد شارات مفتوحة بعد.</p>
      )}
      <button type="button" onClick={save} disabled={unlocked.length === 0} className="w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>
        <Check size={16} /> حفظ ({selected.length})
      </button>
    </GrowthPageShell>
  );
}
