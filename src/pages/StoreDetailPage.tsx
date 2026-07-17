import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import {
  getStoreById,
  getStoreProducts,
  openVisitStore,
  trackMarketplaceEvent,
  type MarketplaceProduct,
  type StoreRow,
} from '@/lib/marketplace';
import {
  BadgeCheck, Crown, ChevronLeft, ExternalLink, Globe, MapPin, Star, Sparkles,
} from 'lucide-react';

export default function StoreDetailPage() {
  const { themeConfig, navigate, goBack, screenParams } = useApp();
  const storeId = screenParams?.storeId || '';
  const [store, setStore] = useState<StoreRow | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [s, p] = await Promise.all([getStoreById(storeId), getStoreProducts(storeId)]);
        if (cancelled) return;
        setStore(s);
        setProducts(p);
        trackMarketplaceEvent({ event_type: 'profile_visit', store_id: storeId });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل المتجر');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const featured = useMemo(() => products.filter(p => p.is_featured), [products]);
  const bestSellers = useMemo(() => products.filter(p => p.is_best_seller), [products]);
  const newest = useMemo(() => products.filter(p => p.is_new), [products]);
  const byCategory = useMemo(() => {
    const map = new Map<string, MarketplaceProduct[]>();
    for (const p of products) {
      const key = p.category_id || 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()];
  }, [products]);

  const visit = () => {
    if (!store?.website_url) return;
    trackMarketplaceEvent({ event_type: 'visit_store_click', store_id: store.id });
    navigate('store-webview', { url: store.website_url, title: store.store_name });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <p style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: themeConfig.colors.background }}>
        <button type="button" onClick={goBack} className="mb-4"><ChevronLeft /></button>
        <p style={{ color: themeConfig.colors.error }}>{error || 'المتجر غير موجود أو بانتظار الموافقة'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="relative h-40" style={{
        background: store.cover_url
          ? `center/cover url(${store.cover_url})`
          : `linear-gradient(120deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
      }}>
        <button type="button" onClick={goBack} className="absolute top-4 right-4 p-2 rounded-xl backdrop-blur bg-black/30 text-white" aria-label="رجوع">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-10 space-y-4">
        <div className="rounded-3xl border p-4" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-2xl border overflow-hidden shrink-0" style={{
              borderColor: themeConfig.colors.border,
              background: store.logo_url ? `center/cover url(${store.logo_url})` : themeConfig.colors.primary + '22',
            }} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <BadgeCheck size={14} style={{ color: themeConfig.colors.primary }} />
                {store.is_premium && <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${themeConfig.colors.accent}22`, color: themeConfig.colors.accent }}><Crown size={10} /> بريميوم</span>}
                {store.is_featured && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${themeConfig.colors.primary}18`, color: themeConfig.colors.primary }}>مميز</span>}
              </div>
              <h1 className="text-lg font-black truncate" style={{ color: themeConfig.colors.text }}>{store.store_name}</h1>
              <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>{store.short_description || 'متجر معتمد على Hallaqi'}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
                <Star size={12} style={{ color: themeConfig.colors.accent }} />
                <span>{store.average_rating || '—'} · {store.review_count} تقييم</span>
                {(store.city || store.wilaya_code) && (
                  <span className="inline-flex items-center gap-1"><MapPin size={11} />{store.city || `ولاية ${store.wilaya_code}`}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={visit}
            disabled={!store.website_url}
            className="mt-4 w-full h-12 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <Globe size={16} />
            زيارة المتجر
            <ExternalLink size={14} />
          </button>
          {!store.website_url && (
            <p className="text-[11px] mt-2 text-center" style={{ color: themeConfig.colors.textMuted }}>
              رابط المتجر غير متوفر بعد — قريبًا
            </p>
          )}
        </div>

        {featured.length > 0 && (
          <Section title="منتج مميز" theme={themeConfig}>
            <ProductStrip products={featured} theme={themeConfig} />
          </Section>
        )}

        {bestSellers.length > 0 && (
          <Section title="الأكثر مبيعًا" theme={themeConfig}>
            <ProductStrip products={bestSellers} theme={themeConfig} />
          </Section>
        )}

        {newest.length > 0 && (
          <Section title="جديد" theme={themeConfig}>
            <ProductStrip products={newest} theme={themeConfig} />
          </Section>
        )}

        {byCategory.map(([cat, rows]) => (
          <Section key={cat} title={`قسم · ${cat}`} theme={themeConfig}>
            <ProductStrip products={rows} theme={themeConfig} />
          </Section>
        ))}

        <Section title="عن المتجر" theme={themeConfig}>
          <p className="text-sm leading-7" style={{ color: themeConfig.colors.textMuted }}>
            {store.about || store.short_description || 'هذا المتجر جزء من طبقة الاكتشاف في Hallaqi. الشراء يتم على موقع التاجر مباشرة.'}
          </p>
        </Section>

        <Section title="تواصل" theme={themeConfig}>
          <div className="space-y-1 text-xs" style={{ color: themeConfig.colors.textMuted }}>
            {store.contact_phone && <p>هاتف: {store.contact_phone}</p>}
            {store.contact_email && <p>بريد: {store.contact_email}</p>}
            {store.social_links && Object.keys(store.social_links).length > 0 ? (
              Object.entries(store.social_links).map(([k, v]) => (
                <button key={k} type="button" className="block underline" onClick={() => openVisitStore(String(v))}>{k}</button>
              ))
            ) : (
              <p>روابط التواصل · قريبًا</p>
            )}
          </div>
        </Section>

        <div className="rounded-2xl border p-3 flex items-start gap-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: `${themeConfig.colors.primary}08` }}>
          <Sparkles size={14} style={{ color: themeConfig.colors.primary }} />
          <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>
            Hallaqi منصة اكتشاف وإعلان فقط في هذه المرحلة — لا عمولة ولا دفع داخل التطبيق لمشتريات المتجر.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, theme }: { title: string; children: ReactNode; theme: { colors: Record<string, string> } }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-black" style={{ color: theme.colors.text }}>{title}</h2>
      {children}
    </section>
  );
}

function ProductStrip({ products, theme }: { products: MarketplaceProduct[]; theme: { colors: Record<string, string> } }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {products.map(p => (
        <div key={p.id} className="shrink-0 w-36 rounded-2xl border p-2 text-right"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
          <div className="h-20 rounded-xl mb-2" style={{
            background: p.image_urls?.[0]
              ? `center/cover url(${p.image_urls[0]})`
              : `linear-gradient(135deg, ${theme.colors.primary}33, ${theme.colors.accent}22)`,
          }} />
          <p className="text-[11px] font-bold line-clamp-2" style={{ color: theme.colors.text }}>{p.title}</p>
          {p.price_dzd != null && <p className="text-[10px] font-black mt-1" style={{ color: theme.colors.primary }}>{p.price_dzd} دج</p>}
        </div>
      ))}
    </div>
  );
}
