import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Stethoscope, ExternalLink, Star, MapPin } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import {
  getMarketplaceSellerById,
  getSellerProducts,
  openExternalStore,
} from '@/supabase/marketplace';
import { formatDzd } from '@/lib/marketplace/filters';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import type { MarketplaceProduct, MarketplaceSeller } from '@/types/marketplace';

export default function DoctorDetailPage() {
  const { themeConfig, screenParams, goBack, navigate } = useApp();
  const sellerId = screenParams?.sellerId || '';
  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);

  useEffect(() => {
    if (!sellerId) return;
    void (async () => {
      const s = await getMarketplaceSellerById(sellerId);
      if (!s) return;
      setSeller(s);
      trackMarketplaceEvent('profile_visit', { sellerId: s.id });
      setProducts(await getSellerProducts(s.id));
    })();
  }, [sellerId]);

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <p style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="relative h-40 bg-cover bg-center" style={{ backgroundImage: `url(${seller.coverUrl})` }}>
        <button type="button" onClick={goBack} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center" aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
      </div>
      <div className="px-4 -mt-8">
        <div className="rounded-3xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${seller.logoUrl})` }} />
            <div>
              <h1 className="text-lg font-black" style={{ color: themeConfig.colors.text }}>{seller.displayName}</h1>
              <div className="flex gap-1.5 mt-1">
                {seller.isTrustedDoctor && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${themeConfig.colors.primary}15`, color: themeConfig.colors.primary }}>
                    <Stethoscope size={12} /> طبيب موثوق
                  </span>
                )}
                {seller.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${themeConfig.colors.accent}20`, color: themeConfig.colors.accent }}>
                    <BadgeCheck size={12} /> توثيق مجاني
                  </span>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: themeConfig.colors.textMuted }}>{seller.shortDescription}</p>
              <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
                <Star size={11} className="fill-amber-400 text-amber-400" /> {seller.rating.toFixed(1)}
                <MapPin size={11} className="mr-1" /> {seller.wilaya}
              </p>
            </div>
          </div>
          <p className="text-sm mt-3 leading-7" style={{ color: themeConfig.colors.text }}>{seller.about}</p>
          {seller.websiteUrl && (
            <button
              type="button"
              onClick={() => { trackMarketplaceEvent('visit_store', { sellerId: seller.id }); openExternalStore(seller.websiteUrl); }}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              <ExternalLink size={16} /> زيارة الموقع
            </button>
          )}
        </div>

        <h2 className="text-sm font-black mt-5 mb-2" style={{ color: themeConfig.colors.text }}>توصيات وخدمات</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <button
              key={p.id}
              type="button"
              className="rounded-2xl border overflow-hidden text-right"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
              onClick={() => navigate('product-detail', { productId: p.id })}
            >
              <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${p.imageUrls[0]})` }} />
              <div className="p-2">
                <p className="text-xs font-black line-clamp-2" style={{ color: themeConfig.colors.text }}>{p.title}</p>
                <p className="text-xs font-bold mt-1" style={{ color: themeConfig.colors.primary }}>{formatDzd(p.priceDzd)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
