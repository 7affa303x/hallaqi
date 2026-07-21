import { useApp } from '@/contexts/useApp';
import type { ScreenName } from '@/types';

const ACTIONS: { emoji: string; label: string; screen: ScreenName; tint: string }[] = [
  { emoji: '🎯', label: 'المهمات', screen: 'missions', tint: '#0F766E' },
  { emoji: '🎁', label: 'الدعوات', screen: 'referrals', tint: '#DB2777' },
  { emoji: '🏆', label: 'الإنجازات', screen: 'achievements', tint: '#D97706' },
  { emoji: '⭐', label: 'المكافآت', screen: 'rewards', tint: '#7C3AED' },
];

/** Four growth quick-action tiles under the progress card (UI shell only). */
export default function GrowthQuickActions() {
  const { themeConfig, navigate } = useApp();

  return (
    <section aria-label="إجراءات سريعة" dir="rtl">
      <div className="grid grid-cols-4 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.screen}
            type="button"
            onClick={() => navigate(action.screen)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 active:scale-[0.97] transition-transform"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: themeConfig.colors.border,
            }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${action.tint}18` }}
            >
              {action.emoji}
            </span>
            <span className="text-[10px] font-bold text-center leading-tight" style={{ color: themeConfig.colors.text }}>
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
