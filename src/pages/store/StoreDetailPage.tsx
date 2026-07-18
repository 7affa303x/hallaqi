import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BadgeCheck, Crown, Building2, ExternalLink, Star, MapPin,
  Globe, Phone, Mail, Sparkles,
} from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import {
  getMarketplaceSellerById,
  getSellerProducts,
  getSellerReviews,
  openExternalStore,
} from '@/supabase/marketplace';
import { formatDzd, discountPercent } from '@/lib/marketplace/filters';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import type { MarketplaceProduct, MarketplaceReview, MarketplaceSeller } from '@/types/marketplace';

type Section = 'featured' | 'bestsellers' | 'new' | 'reviews' | 'about';

export default function StoreDetailPage() {
  const { themeConfig, screenParams, goBack, navigate } = useApp();
  const sellerId = screenParams?.sellerId || '';
  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [section, setSection] = useState<Section>('featured');

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

  const featured = products.filter(p => p.isFeatured || p.isProductOfTheDay);
  const bestsellers = products.filter(p => p.isBestseller);
  const newest = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const potd = products.find(p => p.isProductOfTheDay);

  const visitStore = () => {
    trackMarketplaceEvent('visit_store', { sellerId: seller.id });
    openExternalStore(seller.websiteUrl);
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="relative h-44 bg-cover bg-center" style={{ backgroundImage: `url(${seller.coverUrl})` }}>
        <button
          type="button"
          onClick={goBack}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white"
          aria-label="رجوع"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="px-4 -mt-10 relative z-10">
        <div className="rounded-3xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-2xl bg-cover bg-center border-2 shrink-0"
              style={{ backgroundImage: `url(${seller.logoUrl})`, borderColor: themeConfig.colors.surface }} />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black" style={{ color: themeConfig.colors.text }}>{seller.displayName}</h1>
              <p className="text-xs mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{seller.shortDescription}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {seller.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${themeConfig.colors.primary}15`, color: themeConfig.colors.primary }}>
                    <BadgeCheck size={12} /> موثّق
                  </span>
                )}
                {seller.isPremium && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${themeConfig.colors.accent}20`, color: themeConfig.colors.accent }}>
                    <Crown size={12} /> بريميوم
                  </span>
                )}
                {seller.isCompanyBadge && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${themeConfig.colors.primary}15`, color: themeConfig.colors.primary }}>
                    <Building2 size={12} /> شركة
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
                <Star size={12} className="fill-amber-400 text-amber-400" /> {seller.rating.toFixed(1)} · {seller.reviewCount} تقييم
                <span className="mx-1">·</span>
                <MapPin size={12} /> {seller.wilaya}
              </p>
            </div>
          </div>

          {seller.websiteUrl && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={visitStore}
              className="w-full mt-4 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              <ExternalLink size={16} /> زيارة المتجر
            </motion.button>
          )}
          <p className="text-[10px] text-center mt-2" style={{ color: themeConfig.colors.textMuted }}>
            الشراء يتم على موقع المتجر — Hallaqi طبقة اكتشاف فقط
          </p>
        </div>
      </div>

      {potd && (
        <section className="px-4 mt-4">
          <button
            type="button"
            className="w-full rounded-2xl overflow-hidden text-right relative h-28"
            onClick={() => navigate('product-detail', { productId: potd.id })}
          >
            <div className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.7),rgba(0,0,0,.25)),url(${potd.imageUrls[0]})` }} />
            <div className="relative z-10 p-3 text-white h-full flex flex-col justify-between">
              <span className="text-[10px] font-black inline-flex items-center gap-1 bg-amber-400 text-black px-2 py-0.5 rounded-full w-fit">
                <Sparkles size={10} /> منتج اليوم
              </span>
              <div>
                <p className="font-black text-sm">{potd.title}</p>
                <p className="text-xs opacity-90">{formatDzd(potd.priceDzd)}</p>
              </div>
            </div>
          </button>
        </section>
      )}

      <div className="px-4 mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {([
          ['featured', 'مميز'],
          ['bestsellers', 'الأكثر مبيعاً'],
          ['new', 'جديد'],
          ['reviews', 'التقييمات'],
          ['about', 'حول'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: section === key ? themeConfig.colors.primary : themeConfig.colors.surface,
              color: section === key ? '#fff' : themeConfig.colors.textMuted,
              border: `1px solid ${themeConfig.colors.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {section === 'about' && (
          <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <p className="text-sm leading-7" style={{ color: themeConfig.colors.text }}>{seller.about}</p>
            <div className="space-y-2 text-xs" style={{ color: themeConfig.colors.textMuted }}>
              {seller.websiteUrl && <p className="flex items-center gap-2"><Globe size={14} /> {seller.websiteUrl}</p>}
              {seller.contactPhone && <p className="flex items-center gap-2"><Phone size={14} /> {seller.contactPhone}</p>}
              {seller.contactEmail && <p className="flex items-center gap-2"><Mail size={14} /> {seller.contactEmail}</p>}
              {Object.entries(seller.socialLinks || {}).filter(([, v]) => v).map(([net, url]) => (
                <a key={net} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
                  <Globe size={14} /> {net}: {url}
                </a>
              ))}
              <p>مناطق التوصيل: {seller.deliveryAreas.join('، ') || '—'}</p>
              <p>الخطة: {seller.subscriptionPlan} · حد القوائم: {seller.listingCap}/99</p>
            </div>
          </div>
        )}

        {section === 'reviews' && (
          <div className="space-y-2">
            {reviews.length === 0 && <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>لا تقييمات بعد</p>}
            {reviews.map(r => (
              <div key={r.id} className="rounded-2xl border p-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{r.reviewerName}</span>
                  <span className="text-[11px] flex items-center gap-0.5"><Star size={11} className="fill-amber-400 text-amber-400" /> {r.rating}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>{r.comment}</p>
              </div>
            ))}
          </div>
        )}

        {(['featured', 'bestsellers', 'new'] as const).includes(section as 'featured') && (
          <div className="grid grid-cols-2 gap-3">
            {(section === 'featured' ? featured : section === 'bestsellers' ? bestsellers : newest).map(p => {
              const pct = discountPercent(p.priceDzd, p.compareAtPriceDzd);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="rounded-2xl border overflow-hidden text-right"
                  style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
                  onClick={() => navigate('product-detail', { productId: p.id })}
                >
                  <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${p.imageUrls[0]})` }} />
                  <div className="p-2">
                    <p className="text-xs font-black line-clamp-2" style={{ color: themeConfig.colors.text }}>{p.title}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: themeConfig.colors.primary }}>
                      {formatDzd(p.priceDzd)}
                      {pct != null && <span className="text-[9px] text-rose-500 mr-1">-{pct}%</span>}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
