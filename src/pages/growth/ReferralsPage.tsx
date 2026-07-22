import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useGrowthLayer } from '@/hooks/useGrowthLayer';
import { useApp } from '@/contexts/useApp';
import { ReferralService, GrowthAnalyticsService } from '@/lib/growth-layer';

export default function ReferralsPage() {
  const { themeConfig } = useApp();
  const { snapshot, shareReferral } = useGrowth();
  const { referralStats } = useGrowthLayer();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const code = referralStats?.code || snapshot.referralCode;
  const link = referralStats?.referralLink || ReferralService.buildLink(code);

  const copyText = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      shareReferral();
      void ReferralService.trackInviteSent();
      void GrowthAnalyticsService.track('invite_sent', { kind });
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const shareCode = async () => {
    const text = `انضم إلى حلاقي بكودي: ${code}\n${link}`;
    const canShare = typeof navigator.share === 'function';
    try {
      if (canShare) {
        await navigator.share({ title: 'حلاقي', text, url: link });
        shareReferral();
        void ReferralService.trackInviteSent();
        void GrowthAnalyticsService.track('invite_sent', { kind: 'share' });
        return;
      }
    } catch {
      /* fall through */
    }
    await copyText(link, 'link');
  };

  const invited = referralStats?.invitedUsers ?? snapshot.invitedUsers;
  const successful = referralStats?.successfulReferrals ?? 0;
  const pending = referralStats?.pendingReferrals ?? 0;
  const xpEarned = referralStats?.totalXpEarned ?? snapshot.rewardsEarned;

  return (
    <GrowthPageShell title="مركز الدعوات" subtitle="ادعُ أصدقاءك إلى حلاقي" badge="مباشر">
      <div
        className="rounded-3xl border p-4 mb-4 text-center"
        style={{
          background: `linear-gradient(160deg, ${themeConfig.colors.primary}18, ${themeConfig.colors.surface})`,
          borderColor: themeConfig.colors.border,
        }}
      >
        <p className="text-[11px] font-bold mb-2" style={{ color: themeConfig.colors.textMuted }}>كود الدعوة</p>
        <p className="text-2xl font-black tracking-wider mb-2" style={{ color: themeConfig.colors.text }}>
          {code}
        </p>
        <p className="text-[10px] mb-4 break-all px-2" style={{ color: themeConfig.colors.textMuted }}>{link}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copyText(code, 'code')}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
            {copied === 'code' ? 'تم النسخ' : 'نسخ الكود'}
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
        <StatCard label="المدعوّون" value={invited} colors={themeConfig.colors} />
        <StatCard label="دعوات ناجحة" value={successful} colors={themeConfig.colors} />
        <StatCard label="قيد الانتظار" value={pending} colors={themeConfig.colors} />
        <StatCard label="XP مكتسب" value={xpEarned} colors={themeConfig.colors} />
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
        تُمنح المكافأة بعد التسجيل وإتمام أول حجز مكتمل. دعوة حلاق +50 XP · دعوة عميل +10 XP.
      </p>
    </GrowthPageShell>
  );
}

function StatCard({ label, value, colors }: { label: string; value: number; colors: { surface: string; border: string; text: string; textMuted: string } }) {
  return (
    <div
      className="rounded-2xl border p-3 text-right"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <p className="text-[10px] font-medium" style={{ color: colors.textMuted }}>{label}</p>
      <p className="text-xl font-black mt-1" style={{ color: colors.text }}>{value}</p>
    </div>
  );
}
