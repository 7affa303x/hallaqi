import { useEffect, useState } from 'react';
import { Gift, Sparkles, Coins } from 'lucide-react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useGrowthLayer } from '@/hooks/useGrowthLayer';
import { CoinsService, type RewardStoreItem } from '@/lib/growth-layer';
import { REWARD_CATEGORY_LABELS } from '@/lib/growth-layer/config';

/** Reward Store — display only. Coins architecture ready; purchasing not implemented. */
export default function RewardsPage() {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const { coins } = useGrowthLayer();
  const [items, setItems] = useState<RewardStoreItem[]>([]);
  const accent = themeConfig.colors.primary;

  useEffect(() => {
    void CoinsService.storeItems().then(setItems);
  }, []);

  return (
    <GrowthPageShell title="متجر المكافآت" subtitle="Reward Store" badge="قريباً">
      <div
        className="rounded-2xl border p-4 mb-4 flex items-center gap-3"
        style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        dir="rtl"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(145deg, ${accent}, ${themeConfig.colors.accent})` }}
        >
          <Coins size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>رصيد العملات</p>
          <p className="text-2xl font-black" style={{ color: themeConfig.colors.text }}>{coins.balance}</p>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            العملات مستقلة عن XP ولا تؤثر على المستوى
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <article
            key={item.id}
            className="rounded-2xl border p-4 flex items-center gap-3 opacity-90"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            dir="rtl"
          >
            <span className="text-2xl">{item.imageEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: themeConfig.colors.text }}>{item.title}</p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                {REWARD_CATEGORY_LABELS[item.category]} · {item.coinCost} عملة
              </p>
              {item.description && (
                <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: themeConfig.colors.textMuted }}>{item.description}</p>
              )}
            </div>
            <span
              className="text-[10px] font-black px-2.5 py-1 rounded-full shrink-0"
              style={{ backgroundColor: `${accent}20`, color: accent }}
            >
              قريباً
            </span>
          </article>
        ))}
      </div>

      {items.length === 0 && (
        <div
          className="rounded-[2rem] border p-6 text-center relative overflow-hidden min-h-[40vh] flex flex-col items-center justify-center mt-4"
          style={{
            background: 'linear-gradient(160deg, #0B1220 0%, #111827 50%, #0F172A 100%)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Gift size={36} className="text-white mb-3" />
          <Sparkles size={16} className="text-white absolute top-8 right-8" />
          <p className="text-sm text-white/60">جاري تحميل المتجر…</p>
        </div>
      )}

      {!appUser && (
        <p className="text-center text-[11px] mt-4" style={{ color: themeConfig.colors.textMuted }}>
          سجّل الدخول لعرض رصيدك
        </p>
      )}
    </GrowthPageShell>
  );
}
