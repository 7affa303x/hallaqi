import { Share2 } from 'lucide-react';
import { useApp } from '@/contexts/useApp';

export interface ShareExperienceCardProps {
  barberName: string;
  serviceName?: string;
  rating?: number;
  date?: string;
  onShare: () => void;
  xpHint?: string;
}

export default function ShareExperienceCard({
  barberName,
  serviceName,
  rating,
  date,
  onShare,
  xpHint,
}: ShareExperienceCardProps) {
  const { themeConfig } = useApp();
  return (
    <div
      className="rounded-3xl border p-4"
      style={{
        background: `linear-gradient(160deg, ${themeConfig.colors.primary}14, ${themeConfig.colors.surface})`,
        borderColor: themeConfig.colors.border,
      }}
      dir="rtl"
    >
      <p className="text-sm font-bold mb-1" style={{ color: themeConfig.colors.text }}>{barberName}</p>
      {serviceName && <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{serviceName}</p>}
      {rating && <p className="text-sm mt-1">{'⭐'.repeat(rating)}</p>}
      {date && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>{date}</p>}
      {xpHint && <p className="text-[10px] font-bold mt-2" style={{ color: themeConfig.colors.primary }}>{xpHint}</p>}
      <button
        type="button"
        onClick={onShare}
        className="mt-3 w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
        style={{ backgroundColor: themeConfig.colors.primary }}
      >
        <Share2 size={16} />
        شارك تجربتك
      </button>
    </div>
  );
}
