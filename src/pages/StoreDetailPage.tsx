import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  getStoreById,
  getStoreProducts,
  openVisitStore,
  trackMarketplaceEvent,
  listStoreReviews,
  createStoreReview,
  getMarketplaceCategories,
  getProductOfTheDay,
  type MarketplaceCategory,
  type MarketplaceProduct,
  type ProductOfTheDayRow,
  type StoreRow,
} from '@/lib/marketplace';
import {
  BadgeCheck, Crown, ChevronLeft, ExternalLink, Globe, MapPin, Sparkles, Phone,
} from 'lucide-react';
import { translate } from '@/lib/i18n';
import { InlineBanner, StarRating, BadgePill } from '@/components/marketplace/MarketUI';

type StoreReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

const REVIEW_MAX = 400;
const ABOUT_PREVIEW = 120;

export default function StoreDetailPage() {
  const { themeConfig, navigate, goBack, screenParams, settings } = useApp();
  const { appUser, isAuthenticated } = useAuth();
  const storeId = screenParams?.storeId || '';
  const tx = (key: Parameters<typeof translate>[1]) => translate(settings.language, key);

  const [store, setStore] = useState<StoreRow | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [reviews, setReviews] = useState<StoreReviewRow[]>([]);
  const [potd, setPotd] = useState<ProductOfTheDayRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [sortReviews, setSortReviews] = useState<'newest' | 'highest'>('newest');
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [shareBanner, setShareBanner] = useState('');

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [s, p, cats, revs, potdRow] = await Promise.all([
          getStoreById(storeId),
          getStoreProducts(storeId),
          getMarketplaceCategories(),
          listStoreReviews(storeId),
          getProductOfTheDay(),
        ]);
        if (cancelled) return;
        setStore(s);
        setProducts(p);
        setCategories(cats);
        setReviews(revs as StoreReviewRow[]);
        setPotd(potdRow);
        trackMarketplaceEvent({ event_type: 'profile_visit', store_id: storeId });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل المتجر');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  useEffect(() => {
    if (!shareBanner) return;
    const t = window.setTimeout(() => setShareBanner(''), 2500);
    return () => window.clearTimeout(t);
  }, [shareBanner]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name_ar);
    return map;
  }, [categories]);

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

  const potdForStore = useMemo(() => {
    if (!potd || !store) return null;
    if (potd.store_id === store.id) return potd;
    const product = potd.marketplace_products as MarketplaceProduct | undefined;
    if (product?.store_id === store.id) return potd;
    return null;
  }, [potd, store]);

  const sortedReviews = useMemo(() => {
    const rows = [...reviews];
    if (sortReviews === 'highest') {
      rows.sort((a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at));
    } else {
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return rows;
  }, [reviews, sortReviews]);

  const reviewAvg = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
    }
    return dist;
  }, [reviews]);

  const aboutText = store?.about || store?.short_description || 'هذا المتجر جزء من طبقة الاكتشاف في Hallaqi. الشراء يتم على موقع التاجر مباشرة.';
  const aboutNeedsToggle = aboutText.length > ABOUT_PREVIEW;

  const visit = () => {
    if (!store?.website_url) return;
    trackMarketplaceEvent({ event_type: 'visit_store_click', store_id: store.id });
    navigate('store-webview', { url: store.website_url, title: store.store_name });
  };

  const submitReview = async () => {
    if (!appUser?.id || !storeId) return;
    setSubmittingReview(true);
    setReviewMessage('');
    try {
      await createStoreReview({
        storeId,
        reviewerId: appUser.id,
        rating,
        comment: comment.trim() || undefined,
      });
      const revs = await listStoreReviews(storeId);
      setReviews(revs as StoreReviewRow[]);
      setComment('');
      setRating(5);
      setReviewMessage('تم إرسال تقييمك');
    } catch (e) {
      setReviewMessage(e instanceof Error ? e.message : 'تعذر إرسال التقييم');
    } finally {
      setSubmittingReview(false);
    }
  };

  const shareStore = async () => {
    if (!store) return;
    const url = `${window.location.origin}/?screen=store-detail&storeId=${store.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: store.store_name, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareBanner('تم نسخ رابط المتجر');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareBanner('تم نسخ رابط المتجر');
      } catch {
        setShareBanner('تعذر النسخ');
      }
    }
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
        <button
          type="button"
          onClick={() => navigate('marketplace')}
          className="mt-4 h-10 px-4 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          العودة للسوق
        </button>
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
        <button
          type="button"
          onClick={() => navigate('marketplace')}
          className="text-[11px] font-bold underline"
          style={{ color: themeConfig.colors.primary }}
        >
          ← العودة للسوق
        </button>

        {shareBanner && (
          <InlineBanner
            text={shareBanner}
            tone="success"
            colors={{
              info: themeConfig.colors.primary,
              success: themeConfig.colors.success,
              warning: themeConfig.colors.warning,
              error: themeConfig.colors.error,
              text: themeConfig.colors.text,
            }}
            onDismiss={() => setShareBanner('')}
          />
        )}

        <div className="rounded-3xl border p-4" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-2xl border overflow-hidden shrink-0" style={{
              borderColor: themeConfig.colors.border,
              background: store.logo_url ? `center/cover url(${store.logo_url})` : themeConfig.colors.primary + '22',
            }} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span title="متجر موثّق على Hallaqi">
                  <BadgeCheck size={14} style={{ color: themeConfig.colors.primary }} />
                </span>
                {store.is_premium && (
                  <BadgePill background={`${themeConfig.colors.accent}22`} color={themeConfig.colors.accent}>
                    <Crown size={10} /> بريميوم
                  </BadgePill>
                )}
                {store.is_featured && (
                  <BadgePill background={`${themeConfig.colors.primary}18`} color={themeConfig.colors.primary}>
                    مميز
                  </BadgePill>
                )}
              </div>
              <h1 className="text-lg font-black truncate" style={{ color: themeConfig.colors.text }}>{store.store_name}</h1>
              <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>{store.short_description || 'متجر معتمد على Hallaqi'}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
                <StarRating value={Number(store.average_rating) || 0} color={themeConfig.colors.accent} muted={themeConfig.colors.border} />
                <span>{store.average_rating || '—'} · {store.review_count} تقييم</span>
                {(store.city || store.wilaya_code) && (
                  <span className="inline-flex items-center gap-1"><MapPin size={11} />{store.city || `ولاية ${store.wilaya_code}`}</span>
                )}
              </div>
            </div>
          </div>

          {!!store.delivery_areas?.length && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {store.delivery_areas.map(area => (
                <BadgePill key={area} background={`${themeConfig.colors.primary}12`} color={themeConfig.colors.primary}>
                  {area}
                </BadgePill>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={visit}
            disabled={!store.website_url}
            className="mt-4 w-full h-12 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <Globe size={16} />
            {tx('visitStore')}
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            className="mt-2 w-full h-10 rounded-2xl text-xs font-bold border"
            style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
            onClick={() => void shareStore()}
          >
            مشاركة صفحة المتجر
          </button>
          {!store.website_url && (
            <p className="text-[11px] mt-2 text-center" style={{ color: themeConfig.colors.textMuted }}>
              رابط المتجر غير متوفر بعد — قريبًا
            </p>
          )}
        </div>

        {potdForStore && (
          <div className="rounded-2xl border p-3" style={{
            borderColor: `${themeConfig.colors.accent}55`,
            background: `linear-gradient(120deg, ${themeConfig.colors.accent}14, ${themeConfig.colors.primary}10)`,
          }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} style={{ color: themeConfig.colors.accent }} />
              <p className="text-xs font-black" style={{ color: themeConfig.colors.text }}>{tx('productOfDay')}</p>
            </div>
            <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
              {potdForStore.headline_ar
                || (potdForStore.marketplace_products as MarketplaceProduct | undefined)?.title
                || 'منتج مميز اليوم في هذا المتجر'}
            </p>
            {potdForStore.display_discount_percent != null && (
              <p className="text-[11px] mt-1" style={{ color: themeConfig.colors.accent }}>
                خصم معروض {potdForStore.display_discount_percent}%
              </p>
            )}
          </div>
        )}

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
          <Section key={cat} title={`قسم · ${categoryNameById.get(cat) || cat}`} theme={themeConfig}>
            <ProductStrip products={rows} theme={themeConfig} />
          </Section>
        ))}

        <Section title="التقييمات" theme={themeConfig}>
          {reviews.length > 0 && (
            <div className="rounded-2xl border p-3 mb-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-lg font-black" style={{ color: themeConfig.colors.text }}>{reviewAvg.toFixed(1)}</p>
                  <StarRating value={reviewAvg} color={themeConfig.colors.accent} muted={themeConfig.colors.border} />
                  <p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{reviews.length} تقييم</p>
                </div>
                <div className="flex-1 mr-4 space-y-1">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingDist[star - 1];
                    const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-[10px]">
                        <span style={{ color: themeConfig.colors.textMuted }}>{star}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: themeConfig.colors.accent }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setSortReviews('newest')}
              className="px-2.5 h-7 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: sortReviews === 'newest' ? themeConfig.colors.primary : `${themeConfig.colors.primary}12`,
                color: sortReviews === 'newest' ? '#fff' : themeConfig.colors.primary,
              }}
            >
              الأحدث
            </button>
            <button
              type="button"
              onClick={() => setSortReviews('highest')}
              className="px-2.5 h-7 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: sortReviews === 'highest' ? themeConfig.colors.primary : `${themeConfig.colors.primary}12`,
                color: sortReviews === 'highest' ? '#fff' : themeConfig.colors.primary,
              }}
            >
              الأعلى تقييمًا
            </button>
          </div>

          <div className="space-y-2">
            {sortedReviews.length === 0 && (
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>لا توجد تقييمات بعد</p>
            )}
            {sortedReviews.map(review => (
              <div key={review.id} className="rounded-2xl border p-3"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>
                    {review.profiles?.full_name || 'مستخدم'}
                  </p>
                  <StarRating value={review.rating} size={10} color={themeConfig.colors.accent} muted={themeConfig.colors.border} />
                </div>
                {review.comment && (
                  <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>{review.comment}</p>
                )}
              </div>
            ))}
          </div>

          {isAuthenticated ? (
            <div className="mt-3 rounded-2xl border p-3 space-y-2"
              style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>أضف تقييمك</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="w-9 h-9 rounded-xl border text-xs font-black"
                    style={{
                      borderColor: rating === value ? themeConfig.colors.primary : themeConfig.colors.border,
                      backgroundColor: rating === value ? `${themeConfig.colors.primary}18` : themeConfig.colors.background,
                      color: rating === value ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, REVIEW_MAX))}
                rows={3}
                maxLength={REVIEW_MAX}
                placeholder="تعليق اختياري"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              />
              <p className="text-[10px] text-left" style={{ color: themeConfig.colors.textMuted }}>
                {comment.length}/{REVIEW_MAX}
              </p>
              <button
                type="button"
                disabled={submittingReview}
                onClick={() => void submitReview()}
                className="w-full h-10 rounded-xl text-xs font-black text-white disabled:opacity-50"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                إرسال التقييم
              </button>
              {reviewMessage && (
                <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{reviewMessage}</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
              سجّل الدخول لإضافة تقييم
            </p>
          )}
        </Section>

        <Section title="عن المتجر" theme={themeConfig}>
          <p className="text-sm leading-7" style={{ color: themeConfig.colors.textMuted }}>
            {aboutExpanded || !aboutNeedsToggle ? aboutText : `${aboutText.slice(0, ABOUT_PREVIEW)}…`}
          </p>
          {aboutNeedsToggle && (
            <button
              type="button"
              onClick={() => setAboutExpanded(v => !v)}
              className="text-[11px] font-bold mt-1"
              style={{ color: themeConfig.colors.primary }}
            >
              {aboutExpanded ? 'أقل' : 'المزيد'}
            </button>
          )}
        </Section>

        <Section title="ساعات العمل · قريبًا" theme={themeConfig}>
          <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
            جدول ساعات العمل سيظهر هنا قريبًا.
          </p>
        </Section>

        <Section title="تواصل" theme={themeConfig}>
          <div className="space-y-1 text-xs" style={{ color: themeConfig.colors.textMuted }}>
            {store.contact_phone && (
              <a href={`tel:${store.contact_phone}`} className="inline-flex items-center gap-1.5 underline" style={{ color: themeConfig.colors.primary }}>
                <Phone size={12} />
                هاتف: {store.contact_phone}
              </a>
            )}
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

      {store.website_url && (
        <div
          className="fixed bottom-0 inset-x-0 z-30 border-t px-4 py-3 pb-safe backdrop-blur-xl"
          style={{
            borderColor: themeConfig.colors.border,
            backgroundColor: `${themeConfig.colors.surface}f2`,
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={visit}
              className="w-full h-12 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              <Globe size={16} />
              {tx('visitStore')}
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      )}
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
