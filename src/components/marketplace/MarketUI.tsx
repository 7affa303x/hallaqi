import type { CSSProperties } from 'react';

export function StarRating({
  value,
  max = 5,
  size = 12,
  color = '#F59E0B',
  muted = '#D1D5DB',
}: {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  muted?: string;
}) {
  const clamped = Math.max(0, Math.min(max, value || 0));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`التقييم ${clamped} من ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 2,
            backgroundColor: i < Math.round(clamped) ? color : muted,
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

export function BadgePill({
  children,
  background,
  color,
}: {
  children: React.ReactNode;
  background: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md"
      style={{ backgroundColor: background, color }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color,
  track,
}: {
  value: number;
  max: number;
  color: string;
  track: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: track }} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} role="progressbar">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function InlineBanner({
  text,
  tone = 'info',
  colors,
  onDismiss,
}: {
  text: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  colors: { info: string; success: string; warning: string; error: string; text: string };
  onDismiss?: () => void;
}) {
  const bg = colors[tone];
  return (
    <div className="rounded-xl px-3 py-2 text-[11px] font-bold flex items-start justify-between gap-2" style={{ backgroundColor: `${bg}18`, color: bg }}>
      <span style={{ color: bg }}>{text}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-[10px] underline" style={{ color: bg }}>
          إخفاء
        </button>
      )}
    </div>
  );
}

export function ProductCardSkeleton({ style }: { style?: CSSProperties }) {
  return (
    <div className="rounded-2xl border overflow-hidden animate-pulse" style={style}>
      <div className="h-24 bg-black/5" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 w-3/4 rounded bg-black/10" />
        <div className="h-3 w-1/2 rounded bg-black/10" />
      </div>
    </div>
  );
}

export function countActiveMarketplaceFilters(input: {
  category?: string | null;
  featuredOnly?: boolean;
  premiumOnly?: boolean;
  todayOnly?: boolean;
  wilaya?: number | '';
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: number;
  deliveryArea?: string;
  hideNoUrl?: boolean;
}): number {
  let n = 0;
  if (input.category) n++;
  if (input.featuredOnly) n++;
  if (input.premiumOnly) n++;
  if (input.todayOnly) n++;
  if (input.wilaya !== '' && input.wilaya != null) n++;
  if (input.brand?.trim()) n++;
  if (input.minPrice) n++;
  if (input.maxPrice) n++;
  if (input.minRating) n++;
  if (input.deliveryArea?.trim()) n++;
  if (input.hideNoUrl) n++;
  return n;
}

export function getSavedProducts(): string[] {
  try {
    return JSON.parse(localStorage.getItem('hallaqi-saved-products') || '[]') as string[];
  } catch {
    return [];
  }
}

export function toggleSavedProduct(id: string): string[] {
  const cur = new Set(getSavedProducts());
  if (cur.has(id)) cur.delete(id);
  else cur.add(id);
  const next = [...cur];
  localStorage.setItem('hallaqi-saved-products', JSON.stringify(next));
  return next;
}

export function pushRecentlyViewed(product: { id: string; title: string; price_dzd?: number | null; store_id?: string | null }) {
  try {
    const key = 'hallaqi-recent-products';
    const prev = JSON.parse(localStorage.getItem(key) || '[]') as Array<typeof product>;
    const next = [product, ...prev.filter(p => p.id !== product.id)].slice(0, 12);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getRecentlyViewed(): Array<{ id: string; title: string; price_dzd?: number | null; store_id?: string | null }> {
  try {
    return JSON.parse(localStorage.getItem('hallaqi-recent-products') || '[]');
  } catch {
    return [];
  }
}
