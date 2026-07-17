import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import EmptyState from '@/components/EmptyState';
import {
  BadgePill,
  ProductCardSkeleton,
  StarRating,
  countActiveMarketplaceFilters,
  getRecentlyViewed,
  getSavedProducts,
  pushRecentlyViewed,
  toggleSavedProduct,
} from '@/components/marketplace/MarketUI';
import {
  ALGERIA_WILAYAS,
  getMarketplaceCategories,
  getProductOfTheDay,
  searchMarketplaceProducts,
  getFeaturedStores,
  trackMarketplaceEvent,
  type MarketplaceCategory,
  type MarketplaceProduct,
  type ProductOfTheDayRow,
  type StoreRow,
} from '@/lib/marketplace';
import {
  Search, Filter, Star, BadgeCheck, Crown, Building2, Sparkles, ChevronLeft, ExternalLink, Store, Heart, Share2, RefreshCw, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { translate } from '@/lib/i18n';

const PRICE_PRESETS = [
  { id: 'any', label: 'كل الأسعار', min: '', max: '' },
  { id: 'low', label: '0–1000', min: '0', max: '1000' },
  { id: 'mid', label: '1000–5000', min: '1000', max: '5000' },
  { id: 'high', label: '5000+', min: '5000', max: '' },
] as const;

export default function MarketplacePage() {
  const { themeConfig, navigate, goBack, settings } = useApp();
  const tx = (key: Parameters<typeof translate>[1]) => translate(settings.language, key);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [featuredStores, setFeaturedStores] = useState<StoreRow[]>([]);
  const [potd, setPotd] = useState<ProductOfTheDayRow | null>(null);
  const [recent, setRecent] = useState(getRecentlyViewed());
  const [saved, setSaved] = useState<string[]>(getSavedProducts());
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<'popularity' | 'newest' | 'featured' | 'premium' | 'price_asc' | 'price_desc'>('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [wilaya, setWilaya] = useState<number | ''>('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [hideNoUrl, setHideNoUrl] = useState(false);
  const [compact, setCompact] = useState(false);
  const [headerShadow, setHeaderShadow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hallaqi-mp-filters');
      if (!raw) return;
      const savedFilters = JSON.parse(raw) as Record<string, unknown>;
      if (typeof savedFilters.category === 'string') setCategory(savedFilters.category);
      if (typeof savedFilters.sort === 'string') setSort(savedFilters.sort as typeof sort);
      if (typeof savedFilters.wilaya === 'number') setWilaya(savedFilters.wilaya);
      if (typeof savedFilters.brand === 'string') setBrand(savedFilters.brand);
      if (typeof savedFilters.compact === 'boolean') setCompact(savedFilters.compact);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('hallaqi-mp-filters', JSON.stringify({ category, sort, wilaya, brand, compact }));
  }, [category, sort, wilaya, brand, compact]);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 250);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const loadShell = async () => {
    const [cats, day, stores] = await Promise.all([
      getMarketplaceCategories(),
      getProductOfTheDay(),
      getFeaturedStores(),
    ]);
    setCategories(cats);
    setPotd(day);
    try {
      localStorage.setItem('hallaqi-has-potd', day ? '1' : '0');
    } catch {
      /* ignore */
    }
    setFeaturedStores(stores);
    setRecent(getRecentlyViewed());
    trackMarketplaceEvent({ event_type: 'search_impression', meta: { surface: 'marketplace' } });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        await loadShell();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل السوق');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await searchMarketplaceProducts({
          q: q || undefined,
          category: category || undefined,
          sort,
          featuredOnly: featuredOnly || undefined,
          premiumOnly: premiumOnly || undefined,
          minRating: minRating || undefined,
          wilaya: wilaya === '' ? undefined : wilaya,
          brand: brand.trim() || undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          deliveryArea: deliveryArea.trim() || undefined,
        });
        if (cancelled) return;
        let next = todayOnly && potd?.marketplace_products
          ? [potd.marketplace_products as MarketplaceProduct]
          : rows;
        if (hideNoUrl) next = next.filter(p => !!p.external_url);
        setProducts(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر البحث');
      }
    })();
    return () => { cancelled = true; };
  }, [q, category, sort, featuredOnly, premiumOnly, todayOnly, minRating, potd, wilaya, brand, minPrice, maxPrice, deliveryArea, hideNoUrl, reloadKey]);

  const potdProduct = potd?.marketplace_products as MarketplaceProduct | undefined;
  const activeFilterCount = countActiveMarketplaceFilters({
    category, featuredOnly, premiumOnly, todayOnly, wilaya, brand, minPrice, maxPrice, minRating, deliveryArea, hideNoUrl,
  });

  const brandSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.brand) set.add(p.brand);
    return [...set].slice(0, 8);
  }, [products]);

  const clearFilters = () => {
    setCategory(null);
    setFeaturedOnly(false);
    setPremiumOnly(false);
    setTodayOnly(false);
    setMinRating(0);
    setWilaya('');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setDeliveryArea('');
    setHideNoUrl(false);
    setSort('featured');
  };

  const openProduct = (product: MarketplaceProduct) => {
    pushRecentlyViewed({
      id: product.id,
      title: product.title,
      price_dzd: product.price_dzd,
      store_id: product.store_id,
    });
    setRecent(getRecentlyViewed());
    trackMarketplaceEvent({
      event_type: 'click',
      product_id: product.id,
      store_id: product.store_id,
      company_id: product.company_id,
      category_id: product.category_id,
    });
    if (product.store_id) navigate('store-detail', { storeId: product.store_id });
    else if (product.company_id) navigate('company-detail', { companyId: product.company_id });
  };

  return (
    <div
      ref={scrollerRef}
      className="min-h-screen pb-24"
      style={{ backgroundColor: themeConfig.colors.background }}
      onScroll={e => setHeaderShadow((e.target as HTMLDivElement).scrollTop > 8)}
    >
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-xl px-4 py-3 transition-shadow"
        style={{
          backgroundColor: `${themeConfig.colors.surface}ee`,
          borderColor: themeConfig.colors.border,
          boxShadow: headerShadow ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button type="button" onClick={goBack} aria-label="رجوع" className="p-2 rounded-xl focus-visible:outline focus-visible:outline-2"
            style={{ backgroundColor: `${themeConfig.colors.primary}12`, outlineColor: themeConfig.colors.primary }}>
            <ChevronLeft size={18} style={{ color: themeConfig.colors.primary }} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black" style={{ color: themeConfig.colors.text }}>{tx('marketplace')}</h1>
            <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{tx('marketplaceHint')} — {tx('startFree')}</p>
          </div>
          <button type="button" aria-label="تحديث" onClick={() => setReloadKey(k => k + 1)} className="p-2 rounded-xl"
            style={{ backgroundColor: `${themeConfig.colors.accent}14` }}>
            <RefreshCw size={16} style={{ color: themeConfig.colors.accent }} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-2xl border px-3 h-11"
            style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            <Search size={16} style={{ color: themeConfig.colors.textMuted }} />
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder={tx('searchPlaceholder')}
              aria-label={tx('searchPlaceholder')}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: themeConfig.colors.text }}
            />
            {qInput && (
              <button type="button" aria-label="مسح" onClick={() => setQInput('')}>
                <X size={14} style={{ color: themeConfig.colors.textMuted }} />
              </button>
            )}
          </div>
          <button type="button" onClick={() => setShowFilters(v => !v)} className="relative h-11 w-11 rounded-2xl border flex items-center justify-center"
            style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}
            aria-label={tx('filters')} aria-expanded={showFilters}>
            <Filter size={16} style={{ color: themeConfig.colors.primary }} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                style={{ backgroundColor: themeConfig.colors.error }}>{activeFilterCount}</span>
            )}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="الولايات السريعة">
          {ALGERIA_WILAYAS.slice(0, 6).map(w => (
            <button key={w.code} type="button" onClick={() => setWilaya(wilaya === w.code ? '' : w.code)}
              className="shrink-0 px-3 h-8 rounded-full text-xs font-bold"
              style={{
                backgroundColor: wilaya === w.code ? themeConfig.colors.accent : `${themeConfig.colors.accent}12`,
                color: wilaya === w.code ? '#fff' : themeConfig.colors.accent,
              }}>{w.nameAr}</button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button type="button" onClick={() => setCategory(null)}
            className="shrink-0 px-3 h-8 rounded-full text-xs font-bold"
            style={{
              backgroundColor: !category ? themeConfig.colors.primary : `${themeConfig.colors.primary}10`,
              color: !category ? '#fff' : themeConfig.colors.primary,
            }}>الكل</button>
          {categories.map(c => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)}
              className="shrink-0 px-3 h-8 rounded-full text-xs font-bold"
              style={{
                backgroundColor: category === c.id ? themeConfig.colors.primary : `${themeConfig.colors.primary}10`,
                color: category === c.id ? '#fff' : themeConfig.colors.primary,
              }}>{c.name_ar}</button>
          ))}
        </div>

        {showFilters && (
          <div className="rounded-2xl border p-3 space-y-3" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-black" style={{ color: themeConfig.colors.text }}>{tx('filters')}</p>
              <button type="button" onClick={clearFilters} className="text-[11px] font-bold" style={{ color: themeConfig.colors.error }}>مسح الكل</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'featured', label: 'مميز', active: featuredOnly, toggle: () => setFeaturedOnly(v => !v) },
                { id: 'premium', label: 'بريميوم', active: premiumOnly, toggle: () => setPremiumOnly(v => !v) },
                { id: 'today', label: tx('productOfDay'), active: todayOnly, toggle: () => setTodayOnly(v => !v) },
                { id: 'url', label: 'بروابط شراء فقط', active: hideNoUrl, toggle: () => setHideNoUrl(v => !v) },
                { id: 'compact', label: 'عرض مضغوط', active: compact, toggle: () => setCompact(v => !v) },
              ].map(chip => (
                <button key={chip.id} type="button" onClick={chip.toggle}
                  className="px-3 h-8 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: chip.active ? themeConfig.colors.accent : `${themeConfig.colors.accent}14`,
                    color: chip.active ? '#fff' : themeConfig.colors.accent,
                  }}>{chip.label}</button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {PRICE_PRESETS.map(p => (
                <button key={p.id} type="button" onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); }}
                  className="shrink-0 px-3 h-8 rounded-full text-[11px] font-bold border"
                  style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={wilaya} onChange={e => setWilaya(e.target.value ? Number(e.target.value) : '')} aria-label="الولاية"
                className="h-9 rounded-xl border px-2 text-xs"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}>
                <option value="">الولاية</option>
                {ALGERIA_WILAYAS.map(w => <option key={w.code} value={w.code}>{w.nameAr}</option>)}
              </select>
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="الماركة" aria-label="الماركة"
                className="h-9 rounded-xl border px-2 text-xs outline-none"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
              <input value={minPrice} onChange={e => setMinPrice(e.target.value)} type="number" placeholder="أقل سعر" aria-label="أقل سعر"
                className="h-9 rounded-xl border px-2 text-xs outline-none"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
              <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} type="number" placeholder="أعلى سعر" aria-label="أعلى سعر"
                className="h-9 rounded-xl border px-2 text-xs outline-none"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
              <input value={deliveryArea} onChange={e => setDeliveryArea(e.target.value)} placeholder="منطقة التوصيل" aria-label="منطقة التوصيل"
                className="col-span-2 h-9 rounded-xl border px-2 text-xs outline-none"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
            </div>
            {brandSuggestions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {brandSuggestions.map(b => (
                  <button key={b} type="button" onClick={() => setBrand(b)} className="shrink-0 text-[10px] font-bold px-2 h-7 rounded-full border"
                    style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>{b}</button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold" style={{ color: themeConfig.colors.textMuted }}>الترتيب</label>
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} aria-label="الترتيب"
                className="text-xs rounded-xl border px-2 h-8"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}>
                <option value="featured">مميز ثم شعبي</option>
                <option value="popularity">الأكثر شعبية</option>
                <option value="newest">الأحدث</option>
                <option value="premium">بريميوم</option>
                <option value="price_asc">السعر ↑</option>
                <option value="price_desc">السعر ↓</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold" style={{ color: themeConfig.colors.textMuted }}>التقييم الأدنى</label>
              <input type="range" min={0} max={5} step={0.5} value={minRating} aria-label="التقييم الأدنى"
                onChange={e => setMinRating(Number(e.target.value))} className="flex-1" />
              <span className="text-xs font-bold w-8" style={{ color: themeConfig.colors.text }}>{minRating || '—'}</span>
            </div>
          </div>
        )}

        {potdProduct && (
          <motion.button
            type="button"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => openProduct(potdProduct)}
            className="w-full text-right rounded-3xl overflow-hidden border relative focus-visible:outline focus-visible:outline-2"
            style={{
              borderColor: themeConfig.colors.accent,
              background: `linear-gradient(135deg, ${themeConfig.colors.accent}22, ${themeConfig.colors.primary}18)`,
              outlineColor: themeConfig.colors.accent,
            }}
          >
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: themeConfig.colors.accent }} />
                <span className="text-[11px] font-black" style={{ color: themeConfig.colors.accent }}>{tx('productOfDay')} — مساحة إعلانية مدفوعة</span>
              </div>
              <h2 className="text-lg font-black leading-snug" style={{ color: themeConfig.colors.text }}>
                {potd?.headline_ar || potdProduct.title}
              </h2>
            </div>
          </motion.button>
        )}

        {recent.length > 0 && (
          <section className="space-y-2" aria-label="شوهد مؤخرًا">
            <h3 className="text-sm font-black" style={{ color: themeConfig.colors.text }}>شوهد مؤخرًا</h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {recent.map(item => (
                <button key={item.id} type="button"
                  onClick={() => item.store_id && navigate('store-detail', { storeId: item.store_id })}
                  className="shrink-0 w-32 rounded-2xl border p-2 text-right"
                  style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
                  <p className="text-[11px] font-bold line-clamp-2" style={{ color: themeConfig.colors.text }}>{item.title}</p>
                  {item.price_dzd != null && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.primary }}>{item.price_dzd} دج</p>}
                </button>
              ))}
            </div>
          </section>
        )}

        {featuredStores.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-black" style={{ color: themeConfig.colors.text }}>متاجر مميزة</h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {featuredStores.map(store => (
                <button key={store.id} type="button"
                  onClick={() => navigate('store-detail', { storeId: store.id })}
                  className="shrink-0 w-36 rounded-2xl border p-3 text-right focus-visible:outline focus-visible:outline-2"
                  style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface, outlineColor: themeConfig.colors.primary }}>
                  <div className="flex items-center gap-1 mb-1">
                    {store.is_premium && <Crown size={12} style={{ color: themeConfig.colors.accent }} />}
                    <BadgeCheck size={12} style={{ color: themeConfig.colors.primary }} />
                  </div>
                  <p className="text-xs font-bold truncate" style={{ color: themeConfig.colors.text }}>{store.store_name}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border p-4 text-center space-y-2" style={{ borderColor: themeConfig.colors.error, backgroundColor: themeConfig.colors.surface }}>
            <p className="text-sm" style={{ color: themeConfig.colors.error }}>{error}</p>
            <button type="button" onClick={() => setReloadKey(k => k + 1)} className="h-9 px-4 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: themeConfig.colors.primary }}>إعادة المحاولة</button>
          </div>
        )}

        {!loading && !error && products.length === 0 && activeFilterCount > 0 && (
          <EmptyState
            icon={Filter}
            title="لا نتائج لهذه الفلاتر"
            description="جرّب مسح الفلاتر أو توسيع نطاق السعر/الولاية."
            actionLabel="مسح الفلاتر"
            onAction={clearFilters}
            themeConfig={themeConfig}
          />
        )}

        {!loading && !error && products.length === 0 && activeFilterCount === 0 && (
          <EmptyState
            icon={Store}
            title="لا توجد منتجات بعد"
            description="السوق جاهز — بانتظار موافقة المتاجر وإضافة القوائم."
            themeConfig={themeConfig}
          />
        )}

        <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              compact={compact}
              saved={saved.includes(product.id)}
              theme={themeConfig}
              visitLabel={tx('visitStore')}
              onOpen={() => openProduct(product)}
              onSave={() => setSaved(toggleSavedProduct(product.id))}
              onShare={() => {
                const url = `${window.location.origin}/?screen=marketplace&q=${encodeURIComponent(product.title)}`;
                if (navigator.share) void navigator.share({ title: product.title, url });
                else void navigator.clipboard.writeText(url);
              }}
            />
          ))}
        </div>

        <div className="rounded-2xl border p-3 text-center" style={{ borderColor: themeConfig.colors.border, backgroundColor: `${themeConfig.colors.primary}08` }}>
          <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.textMuted }}>
            Hallaqi طبقة اكتشاف فقط عند الإطلاق — بدون عمولة على مشتريات المتاجر
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product, compact, saved, theme, visitLabel, onOpen, onSave, onShare,
}: {
  product: MarketplaceProduct;
  compact: boolean;
  saved: boolean;
  theme: { colors: Record<string, string> };
  visitLabel: string;
  onOpen: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        trackMarketplaceEvent({
          event_type: 'view',
          product_id: product.id,
          store_id: product.store_id,
          company_id: product.company_id,
          category_id: product.category_id,
        });
        obs.disconnect();
      }
    }, { threshold: 0.55 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [product]);

  return (
    <div className="rounded-2xl border overflow-hidden text-right relative"
      style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
      <button ref={ref} type="button" onClick={onOpen} className="w-full text-right focus-visible:outline focus-visible:outline-2"
        style={{ outlineColor: theme.colors.primary }}>
        <div className={compact ? 'h-16' : 'h-24'} style={{
          background: product.image_urls?.[0]
            ? `center/cover url(${product.image_urls[0]})`
            : `linear-gradient(135deg, ${theme.colors.primary}33, ${theme.colors.accent}22)`,
        }}>
          {/* lazy decode hint via CSS background already; img would use loading=lazy */}
        </div>
        <div className="p-2.5 space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            {product.is_featured && <Star size={10} style={{ color: theme.colors.accent }} />}
            {product.is_premium_placement && (
              <BadgePill background={`${theme.colors.primary}18`} color={theme.colors.primary}>إعلان مموّل</BadgePill>
            )}
            {product.is_new && <BadgePill background={`${theme.colors.success}18`} color={theme.colors.success}>جديد</BadgePill>}
            {product.is_best_seller && <BadgePill background={`${theme.colors.accent}18`} color={theme.colors.accent}>الأكثر مبيعًا</BadgePill>}
            {product.owner_type === 'company' && <Building2 size={10} style={{ color: theme.colors.textMuted }} />}
          </div>
          <p className={`font-bold line-clamp-2 ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: theme.colors.text }}>{product.title}</p>
          {!compact && <StarRating value={product.average_rating || 0} color={theme.colors.accent} muted={`${theme.colors.border}`} />}
          {product.price_dzd != null && (
            <p className="text-[11px] font-black" style={{ color: theme.colors.primary }}>{product.price_dzd} دج</p>
          )}
          <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: theme.colors.textMuted }}>
            <ExternalLink size={10} /> {visitLabel}
          </span>
        </div>
      </button>
      <div className="absolute top-2 left-2 flex gap-1">
        <button type="button" aria-label="حفظ" onClick={onSave} className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <Heart size={12} fill={saved ? theme.colors.error : 'transparent'} style={{ color: theme.colors.error }} />
        </button>
        <button type="button" aria-label="مشاركة" onClick={onShare} className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <Share2 size={12} style={{ color: theme.colors.primary }} />
        </button>
      </div>
    </div>
  );
}
