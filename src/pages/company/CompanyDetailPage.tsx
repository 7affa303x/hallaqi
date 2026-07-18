import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Building2, Crown, ExternalLink, Star, MapPin, Globe, Shield } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import {
  getMarketplaceSellerById,
  getSellerProducts,
  getSellerReviews,
  openExternalStore,
} from '@/supabase/marketplace';
import { formatDzd } from '@/lib/marketplace/filters';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import type { MarketplaceProduct, MarketplaceReview, MarketplaceSeller } from '@/types/marketplace';

/** Distinct company brand page — stronger official presence than a store. */
export default function CompanyDetailPage() {
  const { themeConfig, screenParams, goBack, navigate } = useApp();
  const sellerId = screenParams?.sellerId || '';
  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);

  useEffect(() => {
    if (!sellerId) return;
    void (async () => {
      const s = await getMarketplaceSellerById(sellerId);
      if (!s) return;
      setSeller(s);
      trackMarketplaceEvent('profile_visit', { sellerId: s.id, wilaya: s.wilaya });
      const [prods, revs] = await Promise.all([getSellerProducts(s.id), getSellerReviews(s.id)]);
      setProducts(prods);
      setReviews(revs);
    })();
  }, [sellerId]);

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <p style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
      </div>
    );
  }

  const visit = () => {
    trackMarketplaceEvent('visit_store', { sellerId: seller.id });
    openExternalStore(seller.websiteUrl);
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="relative h-48 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55)),url(${seller.coverUrl})` }}>
        <button type="button" onClick={goBack} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center" aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <div className="absolute bottom-4 right-4 left-4 flex items-end gap-3">
          <div className="w-16 h-16 rounded-2xl bg-cover bg-center border-2 border-white shrink-0" style={{ backgroundImage: `url(${seller.logoUrl})` }} />
          <div className="text-white flex-1 min-w-0 pb-1">
            <p className="text-[10px] font-black uppercase tracking-wide opacity-90">علامة تجارية رسمية</p>
            <h1 className="text-xl font-black truncate">{seller.displayName}</h1>
            <p className="text-xs opacity-90 truncate">{seller.brandName || seller.shortDescription}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${themeConfig.colors.primary}15`, color: themeConfig.colors.primary }}>
            <Building2 size={12} /> شركة
          </span>
          {seller.isVerified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${themeConfig.colors.success}18`, color: themeConfig.colors.success }}>
              <BadgeCheck size={12} /> موثّقة
            </span>
          )}
          {seller.isPremium && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${themeConfig.colors.accent}20`, color: themeConfig.colors.accent }}>
              <Crown size={12} /> بريميوم
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.textMuted, border: `1px solid ${themeConfig.colors.border}` }}>
            <Shield size={12} /> ثقة أعلى · خطة {seller.subscriptionPlan}
          </span>
        </div>

        <p className="text-sm leading-7" style={{ color: themeConfig.colors.text }}>{seller.about}</p>
        <p className="text-[11px] flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
          <Star size={12} className="fill-amber-400 text-amber-400" /> {seller.rating.toFixed(1)} · {seller.reviewCount}
          <MapPin size={12} className="mr-1" /> {seller.wilaya}
        </p>

        {Object.entries(seller.socialLinks || {}).filter(([, v]) => v).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(seller.socialLinks || {}).filter(([, v]) => v).map(([net, url]) => (
              <a key={net} href={url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1"
                style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.primary, border: `1px solid ${themeConfig.colors.border}` }}>
                <Globe size={12} /> {net}
              </a>
            ))}
          </div>
        )}

        {seller.websiteUrl && (
          <button type="button" onClick={visit}
            className="w-full py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: themeConfig.colors.primary }}>
            <ExternalLink size={16} /> زيارة موقع الشركة
          </button>
        )}
        <p className="text-[10px] text-center" style={{ color: themeConfig.colors.textMuted }}>
          محتوى العلامة والإعلانات — الشراء خارج التطبيق
        </p>

        <h2 className="text-sm font-black pt-2" style={{ color: themeConfig.colors.text }}>منتجات العلامة</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <button key={p.id} type="button" className="rounded-2xl border overflow-hidden text-right"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
              onClick={() => navigate('product-detail', { productId: p.id })}>
              <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${p.imageUrls[0]})` }} />
              <div className="p-2">
                <p className="text-xs font-black line-clamp-2" style={{ color: themeConfig.colors.text }}>{p.title}</p>
                <p className="text-xs font-bold mt-1" style={{ color: themeConfig.colors.primary }}>{formatDzd(p.priceDzd)}</p>
              </div>
            </button>
          ))}
        </div>

        {reviews.length > 0 && (
          <>
            <h2 className="text-sm font-black pt-2" style={{ color: themeConfig.colors.text }}>تقييمات</h2>
            {reviews.slice(0, 3).map(r => (
              <div key={r.id} className="rounded-2xl border p-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{r.reviewerName}</p>
                <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>{r.comment}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
