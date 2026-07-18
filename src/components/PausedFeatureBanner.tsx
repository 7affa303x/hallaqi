import { PAUSED_LABEL, COMING_SOON_LABEL } from '@/lib/featureFlags';

type StatusKind = 'paused' | 'soon';

interface PausedFeatureBannerProps {
  title: string;
  description: string;
  kind?: StatusKind;
  className?: string;
  colors: {
    warning: string;
    info: string;
    border: string;
    text?: string;
  };
}

/** Compact professional banner for paused / coming-soon capabilities. */
export default function PausedFeatureBanner({
  title,
  description,
  kind = 'paused',
  className = '',
  colors,
}: PausedFeatureBannerProps) {
  const label = kind === 'paused' ? PAUSED_LABEL : COMING_SOON_LABEL;
  const tone = kind === 'paused' ? colors.warning : colors.info;
  return (
    <div
      role="status"
      className={`rounded-2xl border p-3 text-right ${className}`}
      style={{ backgroundColor: `${tone}12`, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-black" style={{ color: tone }}>{title}</p>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tone}22`, color: tone }}>
          {label}
        </span>
      </div>
      <p className="text-[11px] leading-5" style={{ color: colors.text || tone }}>
        {description}
      </p>
    </div>
  );
}
