import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import {
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
  Search, Filter, Star, BadgeCheck, Crown, Building2, Sparkles, ChevronLeft, ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MarketplacePage() {
  const { themeConfig, navigate, goBack } = useApp();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [featuredStores, setFeaturedStores] = useState<StoreRow[]>([]);
  const [potd, setPotd] = useState<ProductOfTheDayRow | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<'popularity' | 'newest' | 'featured' | 'premium' | 'price_asc' | 'price_desc'>('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [cats, day, stores] = await Promise.all([
          getMarketplaceCategories(),
          getProductOfTheDay(),
          getFeaturedStores(),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setPotd(day);
        setFeaturedStores(stores);
        trackMarketplaceEvent({ event_type: 'search_impression', meta: { surface: 'marketplace' } });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل السوق');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        });
        if (cancelled) return;
        if (todayOnly && potd?.marketplace_products) {
          setProducts([potd.marketplace_products as MarketplaceProduct]);
        } else {
          setProducts(rows);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر البحث');
      }
    })();
    return () => { cancelled = true; };
  }, [q, category, sort, featuredOnly, premiumOnly, todayOnly, minRating, potd]);

  const potdProduct = potd?.marketplace_products as MarketplaceProduct | undefined;

  const filterChips = useMemo(() => ([
    { id: 'featured', label: 'مميز', active: featuredOnly, toggle: () => setFeaturedOnly(v => !v) },
    { id: 'premium', label: 'بريميوم', active: premiumOnly, toggle: () => setPremiumOnly(v => !v) },
    { id: 'today', label: 'منتج اليوم', active: todayOnly, toggle: () => setTodayOnly(v => !v) },
  ]), [featuredOnly, premiumOnly, todayOnly]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-20 border-b backdrop-blur-xl px-4 py-3"
        style={{ backgroundColor: `${themeConfig.colors.surface}ee`, borderColor: themeConfig.colors.border }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button type="button" onClick={goBack} aria-label="رجوع" className="p-2 rounded-xl"
            style={{ backgroundColor: `${themeConfig.colors.primary}12` }}>
            <ChevronLeft size={18} style={{ color: themeConfig.colors.primary }} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black" style={{ color: themeConfig.colors.text }}>السوق</h1>
            <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>اكتشف متاجر ومنتجات — الدفع على موقع التاجر</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-2xl border px-3 h-11"
            style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            <Search size={16} style={{ color: themeConfig.colors.textMuted }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="ابحث عن منتج، ماركة، متجر..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: themeConfig.colors.text }}
            />
          </div>
          <button type="button" onClick={() => setShowFilters(v => !v)} className="h-11 w-11 rounded-2xl border flex items-center justify-center"
            style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            <Filter size={16} style={{ color: themeConfig.colors.primary }} />
          </button>
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
            <div className="flex flex-wrap gap-2">
              {filterChips.map(chip => (
                <button key={chip.id} type="button" onClick={chip.toggle}
                  className="px-3 h-8 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: chip.active ? themeConfig.colors.accent : `${themeConfig.colors.accent}14`,
                    color: chip.active ? '#fff' : themeConfig.colors.accent,
                  }}>{chip.label}</button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold" style={{ color: themeConfig.colors.textMuted }}>الترتيب</label>
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
                className="text-xs rounded-xl border px-2 h-8"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}>
                <option value="popularity">الأكثر شعبية</option>
                <option value="newest">الأحدث</option>
                <option value="featured">مميز</option>
                <option value="premium">بريميوم</option>
                <option value="price_asc">السعر ↑</option>
                <option value="price_desc">السعر ↓</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold" style={{ color: themeConfig.colors.textMuted }}>التقييم الأدنى</label>
              <input type="range" min={0} max={5} step={0.5} value={minRating}
                onChange={e => setMinRating(Number(e.target.value))} className="flex-1" />
              <span className="text-xs font-bold w-8" style={{ color: themeConfig.colors.text }}>{minRating || '—'}</span>
            </div>
          </div>
        )}

        {potdProduct && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              trackMarketplaceEvent({
                event_type: 'product_of_day_view',
                product_id: potdProduct.id,
                store_id: potdProduct.store_id,
              });
              if (potdProduct.store_id) navigate('store-detail', { storeId: potdProduct.store_id });
            }}
            className="w-full text-right rounded-3xl overflow-hidden border relative"
            style={{
              borderColor: themeConfig.colors.accent,
              background: `linear-gradient(135deg, ${themeConfig.colors.accent}22, ${themeConfig.colors.primary}18)`,
            }}
          >
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: themeConfig.colors.accent }} />
                <span className="text-[11px] font-black" style={{ color: themeConfig.colors.accent }}>منتج اليوم — مساحة إعلانية مدفوعة</span>
              </div>
              <h2 className="text-lg font-black leading-snug" style={{ color: themeConfig.colors.text }}>
                {potd?.headline_ar || potdProduct.title}
              </h2>
              <div className="flex items-center gap-2">
                {potd?.display_discount_percent != null && (
                  <span className="text-xs font-black px-2 py-1 rounded-lg text-white" style={{ backgroundColor: themeConfig.colors.error }}>
                    خصم شكلي {potd.display_discount_percent}%
                  </span>
                )}
                {potdProduct.price_dzd != null && (
                  <span className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{potdProduct.price_dzd} دج</span>
                )}
              </div>
            </div>
          </motion.button>
        )}

        {featuredStores.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-black" style={{ color: themeConfig.colors.text }}>متاجر مميزة</h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {featuredStores.map(store => (
                <button key={store.id} type="button"
                  onClick={() => navigate('store-detail', { storeId: store.id })}
                  className="shrink-0 w-36 rounded-2xl border p-3 text-right"
                  style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
                  <div className="flex items-center gap-1 mb-1">
                    {store.is_premium && <Crown size={12} style={{ color: themeConfig.colors.accent }} />}
                    <BadgeCheck size={12} style={{ color: themeConfig.colors.primary }} />
                  </div>
                  <p className="text-xs font-bold truncate" style={{ color: themeConfig.colors.text }}>{store.store_name}</p>
                  <p className="text-[10px] truncate" style={{ color: themeConfig.colors.textMuted }}>{store.short_description || 'متجر معتمد'}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {loading && <p className="text-sm text-center py-8" style={{ color: themeConfig.colors.textMuted }}>جاري تحميل السوق...</p>}
        {error && <p className="text-sm text-center py-4" style={{ color: themeConfig.colors.error }}>{error}</p>}

        {!loading && products.length === 0 && (
          <div className="rounded-2xl border p-6 text-center space-y-2"
            style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>لا توجد منتجات بعد</p>
            <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
              السوق جاهز — بانتظار موافقة المتاجر وإضافة القوائم. قريبًا المزيد من العروض.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                trackMarketplaceEvent({
                  event_type: 'click',
                  product_id: product.id,
                  store_id: product.store_id,
                  company_id: product.company_id,
                  category_id: product.category_id,
                });
                if (product.store_id) navigate('store-detail', { storeId: product.store_id });
                else if (product.company_id) navigate('company-detail', { companyId: product.company_id });
              }}
              className="rounded-2xl border overflow-hidden text-right"
              style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}
            >
              <div className="h-24" style={{
                background: product.image_urls?.[0]
                  ? `center/cover url(${product.image_urls[0]})`
                  : `linear-gradient(135deg, ${themeConfig.colors.primary}33, ${themeConfig.colors.accent}22)`,
              }} />
              <div className="p-2.5 space-y-1">
                <div className="flex items-center gap-1">
                  {product.is_featured && <Star size={10} style={{ color: themeConfig.colors.accent }} />}
                  {product.is_premium_placement && <Crown size={10} style={{ color: themeConfig.colors.primary }} />}
                  {product.owner_type === 'company' && <Building2 size={10} style={{ color: themeConfig.colors.textMuted }} />}
                </div>
                <p className="text-xs font-bold line-clamp-2" style={{ color: themeConfig.colors.text }}>{product.title}</p>
                {product.price_dzd != null && (
                  <p className="text-[11px] font-black" style={{ color: themeConfig.colors.primary }}>{product.price_dzd} دج</p>
                )}
                <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                  <ExternalLink size={10} /> زيارة المتجر
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
