import { Gift, Sparkles } from 'lucide-react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useApp } from '@/contexts/useApp';

/** Rewards placeholder — beautiful UI only, no reward logic.
 * TODO(coins): Reward Store + coins redemption — do not implement yet.
 */
export default function RewardsPage() {
  const { themeConfig } = useApp();
  const accent = themeConfig.colors.primary;

  return (
    <GrowthPageShell title="المكافآت" subtitle="Rewards" badge="قريباً">
      <div
        className="rounded-[2rem] border p-6 text-center relative overflow-hidden min-h-[52vh] flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(160deg, #0B1220 0%, #111827 50%, #0F172A 100%)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: `0 16px 48px ${accent}28`,
        }}
      >
        <div
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full opacity-50"
          style={{ background: `radial-gradient(circle, ${accent}66, transparent 70%)` }}
        />
        <div
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: `linear-gradient(145deg, ${accent}, ${themeConfig.colors.accent})` }}
        >
          <Gift size={36} className="text-white" />
          <Sparkles size={16} className="text-white absolute -top-1 -right-1" />
        </div>
        <h2 className="relative text-xl font-black text-white mb-2">نظام المكافآت قادم قريباً</h2>
        <p className="relative text-sm leading-7 text-white/60 max-w-xs">
          نحضّر تجربة مكافآت أنيقة داخل حلاقي. هذه الصفحة جاهزة للربط لاحقاً — بدون منطق أو عملات الآن.
        </p>
        <span
          className="relative mt-6 text-[11px] font-black px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${accent}28`, color: '#E5E7EB' }}
        >
          قريباً
        </span>
      </div>
    </GrowthPageShell>
  );
}
