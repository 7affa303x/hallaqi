import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, Star, BadgeCheck, Crown, Building2,
  Stethoscope, ChevronDown, ChevronUp, ExternalLink, Sparkles, X, MapPin,
} from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import BrandLogo from '@/components/BrandLogo';
import EmptyState from '@/components/EmptyState';
import { SkeletonMarketplaceCard } from '@/components/Skeleton';
import {
  getMarketplaceCategories,
  getMarketplaceProducts,
  getMarketplaceSellers,
  getMarketplacePlacements,
  getProductOfTheDayProduct,
} from '@/supabase/marketplace';
import { formatDzd, discountPercent, flattenCategories } from '@/lib/marketplace/filters';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import { mapBarberExtrasToMarketplace } from '@/lib/marketplace/barberExtras';
import { readMarketplaceSectionConfig } from '@/lib/marketplace/sectionConfig';
import type {
  MarketplaceCategory,
  MarketplaceFilters,
  MarketplacePlacement,
  MarketplaceProduct,
  MarketplaceSectionConfig,
  MarketplaceSeller,
} from '@/types/marketplace';

export default function MarketplaceTab() {
  const { themeConfig, navigate, barbers } = useApp();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [sellers, setSellers] = useState<MarketplaceSeller[]>([]);
  const [placements, setPlacements] = useState<MarketplacePlacement[]>([]);
  const [potd, setPotd] = useState<MarketplaceProduct | undefined>();
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [showExtras, setShowExtras] = useState(false);
  const [sections, setSections] = useState<MarketplaceSectionConfig>(() => readMarketplaceSectionConfig());

  const [filters, setFilters] = useState<MarketplaceFilters>({
    query: '',
    sortBy: 'popularity',
  });

  useEffect(() => {
    setSections(readMarketplaceSectionConfig());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [cats, prods, sells, day, places] = await Promise.all([
        getMarketplaceCategories(),
        getMarketplaceProducts(filters),
        getMarketplaceSellers(),
        getProductOfTheDayProduct(),
        getMarketplacePlacements(),
      ]);
      if (cancelled) return;
      setCategories(cats);
      setProducts(prods);
      setSellers(sells);
      setPotd(day);
      setPlacements(places.filter(p => p.isActive));
      setLoading(false);
      trackMarketplaceEvent('search_impression', { categoryId: filters.categoryId || undefined, wilaya: filters.wilaya || undefined });
    })();
    return () => { cancelled = true; };
  }, [filters]);

  const barberExtras = useMemo(() => mapBarberExtrasToMarketplace(barbers).slice(0, 8), [barbers]);
  const banners = placements.filter(p => p.placementType === 'banner' || p.placementType === 'sponsored');

  const brands = useMemo(
    () => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(),
    [products]
  );
  const wilayas = useMemo(
    () => [...new Set([...products.map(p => p.wilaya), ...sellers.map(s => s.wilaya)].filter(Boolean))].sort(),
    [products, sellers]
  );
  const deliveryAreas = useMemo(
    () => [...new Set(products.flatMap(p => p.deliveryAreas))].sort(),
    [products]
  );
  const stores = sellers.filter(s => s.sellerType === 'store');
  const companies = sellers.filter(s => s.sellerType === 'company');
  const flatCats = useMemo(() => flattenCategories(categories), [categories]);

  const featured = products.filter(p => p.isFeatured).slice(0, 6);
  const premium = products.filter(p => p.isPremiumVisibility).slice(0, 6);

  const toggleCatExpand = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openProduct = (product: MarketplaceProduct) => {
    trackMarketplaceEvent('click', {
      productId: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      wilaya: product.wilaya,
    });
    if (product.isFeatured) {
      trackMarketplaceEvent('featured_click', { productId: product.id, sellerId: product.sellerId });
    }
    if (product.isProductOfTheDay) {
      trackMarketplaceEvent('product_of_day_click', { productId: product.id, sellerId: product.sellerId });
    }
    navigate('product-detail', { productId: product.id });
  };

  const openSeller = (seller: MarketplaceSeller) => {
    trackMarketplaceEvent('profile_visit', { sellerId: seller.id, wilaya: seller.wilaya });
    if (seller.sellerType === 'company') navigate('company-detail', { sellerId: seller.id });
    else if (seller.sellerType === 'doctor') navigate('doctor-detail', { sellerId: seller.id });
    else navigate('store-detail', { sellerId: seller.id });
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-30 px-4 pt-4 pb-3 border-b backdrop-blur-xl"
        style={{ backgroundColor: `${themeConfig.colors.surface}ee`, borderColor: themeConfig.colors.border }}>
        <div className="flex items-center justify-between mb-3">
          <BrandLogo variant="icon" className="w-8 h-8" />
          <h1 className="text-lg font-black" style={{ color: themeConfig.colors.text }}>السوق</h1>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${themeConfig.colors.primary}12`, color: themeConfig.colors.primary }}
            aria-label="فلاتر"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
        {!loading && sellers.length === 0 && products.length === 0 && (
          <p className="text-[10px] mb-2 px-2 py-1 rounded-lg text-center" style={{ backgroundColor: `${themeConfig.colors.warning}15`, color: themeConfig.colors.warning }}>
            السوق جاهز — كن أول متجر أو شركة تنضم
          </p>
        )}
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: themeConfig.colors.textMuted }} />
          <input
            value={filters.query || ''}
            onChange={e => setFilters(f => ({ ...f, query: e.target.value }))}
            placeholder="ابحث عن منتج، علامة، متجر..."
            className="w-full rounded-2xl pr-9 pl-3 py-2.5 text-sm outline-none"
            style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text, border: `1px solid ${themeConfig.colors.border}` }}
          />
        </div>
      </header>

      {/* Product of the Day — advertising placement */}
      {sections.showProductOfTheDay && potd && !filters.productOfTheDayOnly && (
        <section className="px-4 mt-4">
          <button
            type="button"
            className="w-full text-right overflow-hidden rounded-3xl relative"
            onClick={() => {
              trackMarketplaceEvent('product_of_day_view', { productId: potd.id, sellerId: potd.sellerId });
              openProduct(potd);
            }}
          >
            <div
              className="h-44 bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(120deg, rgba(0,0,0,.65), rgba(0,0,0,.2)), url(${potd.imageUrls[0] || ''})` }}
            />
            <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-amber-400 text-black">
                  <Sparkles size={12} /> منتج اليوم
                </span>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">موضع إعلاني مدفوع</span>
              </div>
              <div>
                <h2 className="text-xl font-black">{potd.title}</h2>
                <p className="text-sm opacity-90 line-clamp-1">{potd.offerText || potd.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-black">{formatDzd(potd.priceDzd)}</span>
                  {potd.compareAtPriceDzd && (
                    <>
                      <span className="text-xs line-through opacity-70">{formatDzd(potd.compareAtPriceDzd)}</span>
                      <span className="text-[10px] font-black bg-rose-500 px-1.5 py-0.5 rounded">
                        -{discountPercent(potd.priceDzd, potd.compareAtPriceDzd)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
        </section>
      )}

      {/* Sponsored / banner placements */}
      {sections.showBanners && banners.length > 0 && (
        <section className="px-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {banners.map(banner => (
            <button
              key={banner.id}
              type="button"
              className="shrink-0 min-w-[220px] rounded-2xl px-4 py-3 text-right text-white"
              style={{ background: `linear-gradient(135deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})` }}
              onClick={() => {
                trackMarketplaceEvent('featured_impression', { sellerId: banner.sellerId, productId: banner.productId });
                if (banner.productId) navigate('product-detail', { productId: banner.productId });
                else if (banner.sellerId) navigate('store-detail', { sellerId: banner.sellerId });
              }}
            >
              <p className="text-[10px] font-bold opacity-90">إعلان مدعوم</p>
              <p className="text-sm font-black">{banner.title || 'بانر مميز'}</p>
            </button>
          ))}
        </section>
      )}

      {/* Barber service extras (not physical store products) */}
      {sections.showBarberExtras && barberExtras.length > 0 && (
        <section className="px-4 mt-4">
          <button
            type="button"
            className="w-full flex items-center justify-between mb-2"
            onClick={() => setShowExtras(v => !v)}
          >
            <h3 className="text-sm font-black" style={{ color: themeConfig.colors.text }}>خدمات إضافية من الحلاقين</h3>
            <span className="text-[10px] font-bold" style={{ color: themeConfig.colors.primary }}>
              {showExtras ? 'إخفاء' : 'عرض'}
            </span>
          </button>
          {showExtras && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {barberExtras.map(extra => (
                <ProductCard
                  key={extra.id}
                  product={extra}
                  compact
                  onOpen={() => navigate('barber-detail', { barberId: extra.sellerId })}
                />
              ))}
            </div>
          )}
          <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>
            خدمات VIP/عناية — ليست منتجات متجر فيزيائية
          </p>
        </section>
      )}

      {/* Expandable categories */}
      <section className="px-4 mt-4">
        <h3 className="text-sm font-black mb-2" style={{ color: themeConfig.colors.text }}>الفئات</h3>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilters(f => ({ ...f, categoryId: null }))}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: !filters.categoryId ? themeConfig.colors.primary : `${themeConfig.colors.primary}10`,
              color: !filters.categoryId ? '#fff' : themeConfig.colors.primary,
            }}
          >
            الكل
          </button>
          {categories.map(cat => (
            <div key={cat.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFilters(f => ({ ...f, categoryId: cat.id }));
                  if (cat.children?.length) toggleCatExpand(cat.id);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1"
                style={{
                  backgroundColor: filters.categoryId === cat.id || filters.categoryId?.startsWith(cat.id)
                    ? themeConfig.colors.primary : `${themeConfig.colors.primary}10`,
                  color: filters.categoryId === cat.id || filters.categoryId?.startsWith(cat.id)
                    ? '#fff' : themeConfig.colors.primary,
                }}
              >
                {cat.nameAr}
                {cat.children?.length ? (expandedCats.has(cat.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
              </button>
              {expandedCats.has(cat.id) && cat.children && (
                <div className="flex gap-1 mt-1">
                  {cat.children.map(child => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setFilters(f => ({ ...f, categoryId: child.id }))}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{
                        backgroundColor: filters.categoryId === child.id ? themeConfig.colors.accent : themeConfig.colors.surface,
                        color: filters.categoryId === child.id ? '#fff' : themeConfig.colors.text,
                        border: `1px solid ${themeConfig.colors.border}`,
                      }}
                    >
                      {child.nameAr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick filter chips */}
      <section className="px-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'featured', label: 'مميز', on: !!filters.featuredOnly, toggle: () => setFilters(f => ({ ...f, featuredOnly: !f.featuredOnly })) },
          { key: 'premium', label: 'بريميوم', on: !!filters.premiumOnly, toggle: () => setFilters(f => ({ ...f, premiumOnly: !f.premiumOnly })) },
          { key: 'potd', label: 'منتج اليوم', on: !!filters.productOfTheDayOnly, toggle: () => setFilters(f => ({ ...f, productOfTheDayOnly: !f.productOfTheDayOnly })) },
          { key: 'store', label: 'متاجر', on: filters.sellerType === 'store', toggle: () => setFilters(f => ({ ...f, sellerType: f.sellerType === 'store' ? null : 'store' })) },
          { key: 'company', label: 'شركات', on: filters.sellerType === 'company', toggle: () => setFilters(f => ({ ...f, sellerType: f.sellerType === 'company' ? null : 'company' })) },
        ].map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.toggle}
            className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{
              backgroundColor: chip.on ? themeConfig.colors.accent : themeConfig.colors.surface,
              color: chip.on ? '#fff' : themeConfig.colors.textMuted,
              border: `1px solid ${themeConfig.colors.border}`,
            }}
          >
            {chip.label}
          </button>
        ))}
      </section>

      {showFilters && (
        <section className="mx-4 mt-3 p-3 rounded-2xl border space-y-3"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black" style={{ color: themeConfig.colors.text }}>فلاتر متقدمة</h4>
            <button type="button" onClick={() => setShowFilters(false)} aria-label="إغلاق"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>الولاية</span>
              <select
                className="w-full rounded-xl p-2"
                value={filters.wilaya || ''}
                onChange={e => setFilters(f => ({ ...f, wilaya: e.target.value || null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              >
                <option value="">الكل</option>
                {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>منطقة التوصيل</span>
              <select
                className="w-full rounded-xl p-2"
                value={filters.deliveryArea || ''}
                onChange={e => setFilters(f => ({ ...f, deliveryArea: e.target.value || null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              >
                <option value="">الكل</option>
                {deliveryAreas.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>العلامة</span>
              <select
                className="w-full rounded-xl p-2"
                value={filters.brand || ''}
                onChange={e => setFilters(f => ({ ...f, brand: e.target.value || null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              >
                <option value="">الكل</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>متجر</span>
              <select
                className="w-full rounded-xl p-2"
                value={filters.storeId || ''}
                onChange={e => setFilters(f => ({ ...f, storeId: e.target.value || null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              >
                <option value="">الكل</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>شركة</span>
              <select
                className="w-full rounded-xl p-2"
                value={filters.companyId || ''}
                onChange={e => setFilters(f => ({ ...f, companyId: e.target.value || null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              >
                <option value="">الكل</option>
                {companies.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>التقييم الأدنى</span>
              <select
                className="w-full rounded-xl p-2"
                value={filters.minRating ?? ''}
                onChange={e => setFilters(f => ({ ...f, minRating: e.target.value ? Number(e.target.value) : null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              >
                <option value="">الكل</option>
                {[4.5, 4, 3.5, 3].map(r => <option key={r} value={r}>{r}+</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>سعر من</span>
              <input type="number" className="w-full rounded-xl p-2"
                value={filters.minPrice ?? ''}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
            </label>
            <label className="space-y-1">
              <span style={{ color: themeConfig.colors.textMuted }}>سعر إلى</span>
              <input type="number" className="w-full rounded-xl p-2"
                value={filters.maxPrice ?? ''}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : null }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
            </label>
            <label className="space-y-1 col-span-2">
              <span style={{ color: themeConfig.colors.textMuted }}>الترتيب</span>
              <select
                className="w-full rounded-xl p-2"
                value={filters.sortBy || 'popularity'}
                onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as MarketplaceFilters['sortBy'] }))}
                style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              >
                <option value="popularity">الأكثر شعبية</option>
                <option value="newest">الأحدث</option>
                <option value="rating">التقييم</option>
                <option value="featured">المميز أولاً</option>
                <option value="price_asc">السعر ↑</option>
                <option value="price_desc">السعر ↓</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="w-full py-2 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: themeConfig.colors.primary }}
            onClick={() => setFilters({ query: filters.query, sortBy: 'popularity' })}
          >
            إعادة ضبط الفلاتر
          </button>
        </section>
      )}

      {/* Featured strip */}
      {sections.showFeaturedStrip && featured.length > 0 && (
        <section className="mt-5 px-4">
          <h3 className="text-sm font-black mb-2 flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
            <Crown size={14} style={{ color: themeConfig.colors.accent }} /> مميز
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {featured.map(p => (
              <ProductCard key={p.id} product={p} compact onOpen={() => openProduct(p)} />
            ))}
          </div>
        </section>
      )}

      {/* Premium strip */}
      {premium.length > 0 && (
        <section className="mt-4 px-4">
          <h3 className="text-sm font-black mb-2 flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
            <Sparkles size={14} style={{ color: themeConfig.colors.primary }} /> ظهور بريميوم
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {premium.map(p => (
              <ProductCard key={p.id} product={p} compact onOpen={() => openProduct(p)} />
            ))}
          </div>
        </section>
      )}

      {/* Featured sellers */}
      <section className="mt-4 px-4">
        <h3 className="text-sm font-black mb-2" style={{ color: themeConfig.colors.text }}>متاجر وشركات</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {sellers
            .filter(s =>
              (s.sellerType === 'store')
              || (s.sellerType === 'company' && sections.showCompanies)
              || (s.sellerType === 'doctor' && sections.showDoctors)
            )
            .slice(0, 8)
            .map(seller => (
            <button
              key={seller.id}
              type="button"
              onClick={() => openSeller(seller)}
              className="shrink-0 w-36 p-3 rounded-2xl text-right border"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <div className="w-10 h-10 rounded-full bg-cover bg-center mb-2"
                style={{ backgroundImage: `url(${seller.logoUrl})` }} />
              <p className="text-xs font-black line-clamp-1" style={{ color: themeConfig.colors.text }}>{seller.displayName}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {seller.isVerified && <BadgeCheck size={12} style={{ color: themeConfig.colors.primary }} />}
                {seller.isPremium && <Crown size={12} style={{ color: themeConfig.colors.accent }} />}
                {seller.isCompanyBadge && <Building2 size={12} style={{ color: themeConfig.colors.primary }} />}
                {seller.isTrustedDoctor && <Stethoscope size={12} style={{ color: themeConfig.colors.primary }} />}
              </div>
              <p className="text-[10px] mt-1 flex items-center gap-0.5" style={{ color: themeConfig.colors.textMuted }}>
                <MapPin size={10} /> {seller.wilaya}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Results grid */}
      <section className="mt-5 px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-black" style={{ color: themeConfig.colors.text }}>
            النتائج ({products.length})
          </h3>
          <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            {flatCats.find(c => c.id === filters.categoryId)?.nameAr || 'كل الفئات'}
          </span>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <SkeletonMarketplaceCard />
            <SkeletonMarketplaceCard />
            <SkeletonMarketplaceCard />
            <SkeletonMarketplaceCard />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Search}
            title={sellers.length === 0 ? 'السوق فارغ حالياً' : 'لا نتائج'}
            description={sellers.length === 0 ? 'سجّل كمتجر أو شركة لإضافة أول المنتجات' : 'جرّب تغيير الفلاتر أو البحث'}
            themeConfig={themeConfig}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onOpen={() => openProduct(p)} />
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-[10px] mt-6 px-6 pb-4" style={{ color: themeConfig.colors.textMuted }}>
        Hallaqi منصة اكتشاف وإعلان فقط — الشراء يتم عبر موقع المتجر. لا عمولات عند الإطلاق.
      </p>
    </div>
  );
}

function ProductCard({
  product,
  onOpen,
  compact,
}: {
  product: MarketplaceProduct;
  onOpen: () => void;
  compact?: boolean;
}) {
  const { themeConfig } = useApp();
  const pct = discountPercent(product.priceDzd, product.compareAtPriceDzd);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className={`text-right overflow-hidden rounded-2xl border ${compact ? 'shrink-0 w-40' : 'w-full'}`}
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
    >
      <div
        className={`${compact ? 'h-24' : 'h-32'} bg-cover bg-center relative`}
        style={{ backgroundImage: `url(${product.imageUrls[0] || ''})` }}
      >
        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
          {product.isProductOfTheDay && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-black">اليوم</span>
          )}
          {product.isPremiumVisibility && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: themeConfig.colors.primary }}>بريميوم</span>
          )}
          {product.isFeatured && !product.isProductOfTheDay && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: themeConfig.colors.accent }}>مميز</span>
          )}
        </div>
        {pct != null && (
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white">-{pct}%</span>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-xs font-black line-clamp-2" style={{ color: themeConfig.colors.text }}>{product.title}</p>
        <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{product.brand}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-black" style={{ color: themeConfig.colors.primary }}>{formatDzd(product.priceDzd)}</span>
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: themeConfig.colors.textMuted }}>
            <Star size={10} className="fill-amber-400 text-amber-400" /> {product.rating.toFixed(1)}
          </span>
        </div>
        {product.externalUrl && (
          <span className="text-[9px] font-bold inline-flex items-center gap-0.5" style={{ color: themeConfig.colors.accent }}>
            <ExternalLink size={9} /> زيارة المتجر
          </span>
        )}
      </div>
    </motion.button>
  );
}
