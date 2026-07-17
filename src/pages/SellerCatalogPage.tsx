import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  createMarketplaceProduct,
  deleteMarketplaceProduct,
  getMarketplaceCategories,
  getOwnerItemCap,
  listOwnerProducts,
  updateMarketplaceProduct,
  type MarketplaceCategory,
  type MarketplaceProduct,
} from '@/lib/marketplace';
import { ProgressBar } from '@/components/marketplace/MarketUI';
import { ChevronLeft, Plus, Trash2, Sparkles, Copy } from 'lucide-react';

const DRAFT_KEY = 'hallaqi-seller-draft';

export default function SellerCatalogPage() {
  const { themeConfig, goBack, navigate } = useApp();
  const { appUser } = useAuth();
  const ownerType = appUser?.user_role === 'company' ? 'company' : 'store';
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [cap, setCap] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [draftNote, setDraftNote] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_KEY) || '';
    } catch {
      return '';
    }
  });

  const reload = async () => {
    if (!appUser?.id) return;
    const [rows, cats, itemCap] = await Promise.all([
      listOwnerProducts(appUser.id, ownerType),
      getMarketplaceCategories(),
      getOwnerItemCap(appUser.id, ownerType),
    ]);
    setProducts(rows);
    setCategories(cats);
    setCap(itemCap);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        if (!appUser?.id || (appUser.user_role !== 'store' && appUser.user_role !== 'company')) {
          setLoading(false);
          return;
        }
        await reload();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر التحميل');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.id, ownerType]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(''), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, draftNote);
    } catch {
      /* ignore */
    }
  }, [draftNote]);

  const titleTooShort = title.trim().length > 0 && title.trim().length < 3;
  const urlInvalid = !!externalUrl.trim() && !/^https?:\/\//i.test(externalUrl.trim());

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const key = p.category_id || 'other';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [products]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name_ar);
    return map;
  }, [categories]);

  const create = async () => {
    if (!appUser?.id || !title.trim()) return;
    if (title.trim().length < 3) {
      setError('عنوان المنتج يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (urlInvalid) {
      setError('رابط الشراء يجب أن يبدأ بـ http:// أو https://');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await createMarketplaceProduct({
        ownerType,
        ownerId: appUser.id,
        title,
        description,
        categoryId: categoryId || undefined,
        brand: brand || undefined,
        priceDzd: price ? Number(price) : undefined,
        externalUrl: externalUrl || undefined,
      });
      setTitle('');
      setDescription('');
      setBrand('');
      setPrice('');
      setExternalUrl('');
      await reload();
      setSuccess('تمت إضافة المنتج بنجاح');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الإضافة — تحقق من سقف العناصر (≤99)');
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (p: MarketplaceProduct) => {
    if (!appUser?.id || products.length >= cap) return;
    setBusy(true);
    setError('');
    try {
      await createMarketplaceProduct({
        ownerType,
        ownerId: appUser.id,
        title: `${p.title} (نسخة)`,
        description: p.description || undefined,
        categoryId: p.category_id || undefined,
        brand: p.brand || undefined,
        priceDzd: p.price_dzd ?? undefined,
        externalUrl: p.external_url || undefined,
      });
      await reload();
      setSuccess('تم نسخ المنتج');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر النسخ');
    } finally {
      setBusy(false);
    }
  };

  const bulkDeactivate = async () => {
    const active = products.filter(p => p.is_active);
    if (!active.length) return;
    if (!window.confirm(`إيقاف ${active.length} منتج نشط؟`)) return;
    setBusy(true);
    setError('');
    try {
      await Promise.all(active.map(p => updateMarketplaceProduct(p.id, { is_active: false })));
      await reload();
      setSuccess('تم إيقاف جميع المنتجات النشطة');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الإيقاف الجماعي');
    } finally {
      setBusy(false);
    }
  };

  if (!appUser || (appUser.user_role !== 'store' && appUser.user_role !== 'company')) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: themeConfig.colors.background }}>
        <button type="button" onClick={goBack}><ChevronLeft /></button>
        <p className="mt-4" style={{ color: themeConfig.colors.textMuted }}>هذه الصفحة لحسابات المتجر والشركة بعد الموافقة.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ borderColor: themeConfig.colors.border, backgroundColor: `${themeConfig.colors.surface}ee` }}>
        <button type="button" onClick={goBack} className="p-2 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.primary}12` }}>
          <ChevronLeft size={18} style={{ color: themeConfig.colors.primary }} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black" style={{ color: themeConfig.colors.text }}>كتالوج المنتجات</h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
            {products.length} / {cap} (سقف بريميوم 99 — ليس unlimited)
          </p>
          <div className="mt-1.5 max-w-[200px]">
            <ProgressBar
              value={products.length}
              max={cap}
              color={themeConfig.colors.primary}
              track={`${themeConfig.colors.primary}18`}
            />
          </div>
          {products.length / Math.max(cap, 1) >= 0.8 && (
            <p className="text-[10px] font-bold mt-1" style={{ color: themeConfig.colors.warning }}>
              اقتربت من السقف ({Math.round((products.length / cap) * 100)}%) — فكّر بالترقية للظهور الأفضل
            </p>
          )}
        </div>
        <button type="button" onClick={() => navigate('seller-ai-tools')} className="p-2 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.accent}14` }}>
          <Sparkles size={16} style={{ color: themeConfig.colors.accent }} />
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {categoryCounts.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...categoryCounts.entries()].map(([id, count]) => (
              <span
                key={id}
                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ backgroundColor: `${themeConfig.colors.primary}12`, color: themeConfig.colors.primary }}
              >
                {categoryNameById.get(id) || 'أخرى'}: {count}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-2xl border p-3 space-y-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>إضافة منتج (اكتشاف فقط — الدفع على موقعك)</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان المنتج"
            className="w-full h-10 rounded-xl border px-3 text-sm outline-none"
            style={{ borderColor: titleTooShort ? themeConfig.colors.error : themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
          {titleTooShort && (
            <p className="text-[10px]" style={{ color: themeConfig.colors.error }}>العنوان يجب أن يكون 3 أحرف على الأقل</p>
          )}
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف قصير" rows={2}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
          <div className="grid grid-cols-2 gap-2">
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="h-10 rounded-xl border px-2 text-xs"
              style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}>
              <option value="">الفئة</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="الماركة"
              className="h-10 rounded-xl border px-3 text-sm outline-none"
              style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="السعر دج" type="number"
              className="h-10 rounded-xl border px-3 text-sm outline-none"
              style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
            <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="رابط الشراء الخارجي"
              className="h-10 rounded-xl border px-3 text-sm outline-none"
              style={{ borderColor: urlInvalid ? themeConfig.colors.error : themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
          </div>
          {urlInvalid && (
            <p className="text-[10px]" style={{ color: themeConfig.colors.error }}>الرابط يجب أن يبدأ بـ http:// أو https://</p>
          )}
          <button type="button" disabled={busy || !title.trim() || title.trim().length < 3 || urlInvalid || products.length >= cap} onClick={() => void create()}
            className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}>
            <Plus size={16} /> إضافة منتج
          </button>
          {products.length >= cap && (
            <button type="button" onClick={() => navigate('home')}
              className="w-full h-10 rounded-xl text-xs font-bold border"
              style={{ borderColor: themeConfig.colors.accent, color: themeConfig.colors.accent }}>
              وصلت للسقف — ترقّ للاشتراك من الحساب (ابدأ مجاناً وادفع كلما كبرت)
            </button>
          )}
        </div>

        <div className="rounded-2xl border p-3 space-y-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>مسودة محلية</p>
          <textarea
            value={draftNote}
            onChange={e => setDraftNote(e.target.value)}
            rows={2}
            placeholder="ملاحظات سريعة تُحفظ على هذا الجهاز فقط..."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
          />
        </div>

        {products.some(p => p.is_active) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void bulkDeactivate()}
            className="w-full h-10 rounded-xl text-xs font-bold border disabled:opacity-50"
            style={{ borderColor: themeConfig.colors.warning, color: themeConfig.colors.warning }}
          >
            إيقاف جميع المنتجات النشطة
          </button>
        )}

        {loading && <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>}
        {error && <p className="text-sm" style={{ color: themeConfig.colors.error }}>{error}</p>}
        {success && <p className="text-sm" style={{ color: themeConfig.colors.success }}>{success}</p>}
        {!loading && products.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>
            لا منتجات بعد — أضف أول عنصر. ابدأ مجاناً وادفع كلما كبرت.
          </p>
        )}

        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className="rounded-2xl border p-3" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{p.title}</p>
                  <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
                    {p.price_dzd != null ? `${p.price_dzd} دج` : 'بدون سعر'} · {p.is_active ? 'نشط' : 'موقوف'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={busy || products.length >= cap}
                    onClick={() => void duplicate(p)}
                    className="p-2 rounded-xl disabled:opacity-40"
                    style={{ backgroundColor: `${themeConfig.colors.primary}14` }}
                    aria-label="نسخ المنتج"
                  >
                    <Copy size={14} style={{ color: themeConfig.colors.primary }} />
                  </button>
                  <button type="button" onClick={() => {
                    if (!window.confirm(`حذف المنتج «${p.title}»؟`)) return;
                    void deleteMarketplaceProduct(p.id).then(reload).catch(e => setError(e instanceof Error ? e.message : 'فشل الحذف'));
                  }}
                    className="p-2 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.error}14` }}>
                    <Trash2 size={14} style={{ color: themeConfig.colors.error }} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Toggle label="نشط" on={p.is_active} onClick={() => void updateMarketplaceProduct(p.id, { is_active: !p.is_active }).then(reload)} theme={themeConfig} />
                <Toggle label="مميز" on={p.is_featured} onClick={() => void updateMarketplaceProduct(p.id, { is_featured: !p.is_featured }).then(reload)} theme={themeConfig} />
                <Toggle label="الأكثر مبيعًا" on={p.is_best_seller} onClick={() => void updateMarketplaceProduct(p.id, { is_best_seller: !p.is_best_seller }).then(reload)} theme={themeConfig} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, on, onClick, theme }: { label: string; on: boolean; onClick: () => void; theme: { colors: Record<string, string> } }) {
  return (
    <button type="button" onClick={onClick} className="px-2.5 h-7 rounded-full text-[10px] font-bold"
      style={{
        backgroundColor: on ? theme.colors.primary : `${theme.colors.primary}12`,
        color: on ? '#fff' : theme.colors.primary,
      }}>{label}</button>
  );
}
