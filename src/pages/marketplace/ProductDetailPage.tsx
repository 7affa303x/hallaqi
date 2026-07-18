import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Star, BadgeCheck, Crown } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { getMarketplaceProductById, getMarketplaceSellerById, openExternalStore } from '@/supabase/marketplace';
import { formatDzd, discountPercent } from '@/lib/marketplace/filters';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import type { MarketplaceProduct, MarketplaceSeller } from '@/types/marketplace';

export default function ProductDetailPage() {
  const { themeConfig, screenParams, goBack, navigate } = useApp();
  const productId = screenParams?.productId || '';
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);

  useEffect(() => {
    if (!productId) return;
    void (async () => {
      const p = await getMarketplaceProductById(productId);
      if (!p) return;
      setProduct(p);
      trackMarketplaceEvent('view', { productId: p.id, sellerId: p.sellerId, categoryId: p.categoryId, wilaya: p.wilaya });
      if (p.isFeatured) trackMarketplaceEvent('featured_impression', { productId: p.id, sellerId: p.sellerId });
      if (p.isProductOfTheDay) trackMarketplaceEvent('product_of_day_view', { productId: p.id, sellerId: p.sellerId });
      const s = await getMarketplaceSellerById(p.sellerId);
      if (s) setSeller(s);
    })();
  }, [productId]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <p style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
      </div>
    );
  }

  const pct = discountPercent(product.priceDzd, product.compareAtPriceDzd);
  const visit = () => {
    trackMarketplaceEvent('visit_store', { productId: product.id, sellerId: product.sellerId });
    openExternalStore(product.externalUrl || seller?.websiteUrl);
  };

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="relative h-64 bg-cover bg-center" style={{ backgroundImage: `url(${product.imageUrls[0]})` }}>
        <button type="button" onClick={goBack} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center" aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <div className="absolute top-4 left-4 flex flex-col gap-1">
          {product.isProductOfTheDay && <span className="text-[10px] font-black px-2 py-1 rounded-full bg-amber-400 text-black">منتج اليوم</span>}
          {product.isPremiumVisibility && <span className="text-[10px] font-black px-2 py-1 rounded-full text-white" style={{ backgroundColor: themeConfig.colors.primary }}>بريميوم</span>}
          {product.isFeatured && <span className="text-[10px] font-black px-2 py-1 rounded-full text-white" style={{ backgroundColor: themeConfig.colors.accent }}>مميز</span>}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <h1 className="text-xl font-black" style={{ color: themeConfig.colors.text }}>{product.title}</h1>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black" style={{ color: themeConfig.colors.primary }}>{formatDzd(product.priceDzd)}</span>
          {product.compareAtPriceDzd && (
            <>
              <span className="text-sm line-through" style={{ color: themeConfig.colors.textMuted }}>{formatDzd(product.compareAtPriceDzd)}</span>
              {pct != null && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white">-{pct}%</span>}
            </>
          )}
        </div>
        {product.offerText && (
          <p className="text-xs font-bold px-3 py-2 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.accent}18`, color: themeConfig.colors.accent }}>
            {product.offerText}
          </p>
        )}
        <p className="text-sm leading-7" style={{ color: themeConfig.colors.textMuted }}>{product.description}</p>
        <div className="flex flex-wrap gap-1">
          {product.keywords.map(k => (
            <span key={k} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.textMuted, border: `1px solid ${themeConfig.colors.border}` }}>
              #{k}
            </span>
          ))}
        </div>
        <p className="text-xs flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
          <Star size={12} className="fill-amber-400 text-amber-400" /> {product.rating.toFixed(1)} · {product.reviewCount} · {product.brand}
        </p>

        {seller && (
          <button
            type="button"
            className="w-full rounded-2xl border p-3 text-right flex items-center gap-3"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            onClick={() => {
              if (seller.sellerType === 'company') navigate('company-detail', { sellerId: seller.id });
              else if (seller.sellerType === 'doctor') navigate('doctor-detail', { sellerId: seller.id });
              else navigate('store-detail', { sellerId: seller.id });
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${seller.logoUrl})` }} />
            <div className="flex-1">
              <p className="text-sm font-black" style={{ color: themeConfig.colors.text }}>{seller.displayName}</p>
              <div className="flex gap-1 mt-0.5">
                {seller.isVerified && <BadgeCheck size={12} style={{ color: themeConfig.colors.primary }} />}
                {seller.isPremium && <Crown size={12} style={{ color: themeConfig.colors.accent }} />}
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 border-t backdrop-blur-xl z-40"
        style={{ backgroundColor: `${themeConfig.colors.surface}f2`, borderColor: themeConfig.colors.border }}>
        <button
          type="button"
          onClick={visit}
          className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          <ExternalLink size={16} /> زيارة المتجر
        </button>
        <p className="text-[10px] text-center mt-1.5" style={{ color: themeConfig.colors.textMuted }}>
          لا يوجد دفع داخل التطبيق — اكتشف هنا واشترِ هناك
        </p>
      </div>
    </div>
  );
}
