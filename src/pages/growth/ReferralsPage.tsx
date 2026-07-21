import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { GROWTH_REFERRAL_CODE, GROWTH_REFERRAL_STATS_MOCK } from '@/data/growthMock';
import { useApp } from '@/contexts/useApp';

export default function ReferralsPage() {
  const { themeConfig } = useApp();
  const [copied, setCopied] = useState(false);
  const { invitedUsers, rewardsEarned } = GROWTH_REFERRAL_STATS_MOCK;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(GROWTH_REFERRAL_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const shareCode = async () => {
    const text = `انضم إلى حلاقي بكودي: ${GROWTH_REFERRAL_CODE}\nhttps://hallaqi.app`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'حلاقي', text, url: 'https://hallaqi.app' });
        return;
      }
    } catch {
      /* fall through */
    }
    await copyCode();
  };

  return (
    <GrowthPageShell title="الدعوات" subtitle="ادعُ أصدقاءك إلى حلاقي" badge="تجريبي">
      <div
        className="rounded-3xl border p-4 mb-4 text-center"
        style={{
          background: `linear-gradient(160deg, ${themeConfig.colors.primary}18, ${themeConfig.colors.surface})`,
          borderColor: themeConfig.colors.border,
        }}
      >
        <p className="text-[11px] font-bold mb-2" style={{ color: themeConfig.colors.textMuted }}>كود الدعوة</p>
        <p className="text-2xl font-black tracking-wider mb-4" style={{ color: themeConfig.colors.text }}>
          {GROWTH_REFERRAL_CODE}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copyCode()}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'تم النسخ' : 'نسخ'}
          </button>
          <button
            type="button"
            onClick={() => void shareCode()}
            className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: themeConfig.colors.border,
              color: themeConfig.colors.text,
            }}
          >
            <Share2 size={16} />
            مشاركة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          <p className="text-[10px] font-medium" style={{ color: themeConfig.colors.textMuted }}>Invited Users</p>
          <p className="text-xl font-black mt-1" style={{ color: themeConfig.colors.text }}>{invitedUsers}</p>
        </div>
        <div
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          <p className="text-[10px] font-medium" style={{ color: themeConfig.colors.textMuted }}>Rewards Earned</p>
          <p className="text-xl font-black mt-1" style={{ color: themeConfig.colors.text }}>{rewardsEarned}</p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
        واجهة تجريبية فقط — تتبع الدعوات والمكافآت سيُربط لاحقاً دون تغيير هذه الشاشة.
      </p>
    </GrowthPageShell>
  );
}
