import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';

export default function ReferralsPage() {
  const { themeConfig } = useApp();
  const { snapshot, shareReferral } = useGrowth();
  const [copied, setCopied] = useState(false);
  const code = snapshot.referralCode;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      shareReferral();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const shareCode = async () => {
    const text = `انضم إلى حلاقي بكودي: ${code}\nhttps://hallaqi.app`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'حلاقي', text, url: 'https://hallaqi.app' });
        shareReferral();
        return;
      }
    } catch {
      /* fall through */
    }
    await copyCode();
  };

  return (
    <GrowthPageShell title="الدعوات" subtitle="ادعُ أصدقاءك إلى حلاقي" badge="مباشر">
      <div
        className="rounded-3xl border p-4 mb-4 text-center"
        style={{
          background: `linear-gradient(160deg, ${themeConfig.colors.primary}18, ${themeConfig.colors.surface})`,
          borderColor: themeConfig.colors.border,
        }}
      >
        <p className="text-[11px] font-bold mb-2" style={{ color: themeConfig.colors.textMuted }}>كود الدعوة</p>
        <p className="text-2xl font-black tracking-wider mb-4" style={{ color: themeConfig.colors.text }}>
          {code}
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
          <p className="text-[10px] font-medium" style={{ color: themeConfig.colors.textMuted }}>مشاركات الدعوة</p>
          <p className="text-xl font-black mt-1" style={{ color: themeConfig.colors.text }}>{snapshot.invitedUsers}</p>
        </div>
        <div
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          <p className="text-[10px] font-medium" style={{ color: themeConfig.colors.textMuted }}>نقاط مكتسبة</p>
          <p className="text-xl font-black mt-1" style={{ color: themeConfig.colors.text }}>{snapshot.rewardsEarned}</p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
        النسخ/المشاركة يحتسبان فوراً على هذا الجهاز. تتبع المدعوّين الحقيقيين سيُربط لاحقاً بالخادم دون تغيير هذه الواجهة.
      </p>
    </GrowthPageShell>
  );
}
