import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  createOrUpdateSellerProduct,
  getMarketplaceCategories,
  getSellerProducts,
  removeSellerProduct,
  listingCapForPlan,
} from '@/supabase/marketplace';
import { formatDzd, flattenCategories } from '@/lib/marketplace/filters';
import { MARKETPLACE_PREMIUM_LISTING_CAP } from '@/types/marketplace';
import type { MarketplaceCategory, MarketplacePlanTier, MarketplaceProduct, MarketplaceProductKind } from '@/types/marketplace';

export default function SellerProductsPage() {
  const { themeConfig, goBack, screenParams, navigate } = useApp();
  const { appUser } = useAuth();
  const sellerId = appUser?.id || screenParams?.sellerId || `demo-${screenParams?.role || 'store'}`;
  const role = (screenParams?.role || 'store') as 'store' | 'company' | 'doctor';
  const plan = (screenParams?.plan || 'free') as MarketplacePlanTier;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    brand: '',
    categoryId: 'hair',
    kind: 'physical' as MarketplaceProductKind,
    priceDzd: 1000,
    compareAtPriceDzd: undefined as number | undefined,
    externalUrl: '',
    offerText: '',
  });

  const cap = listingCapForPlan(plan);
  const flatCats = useMemo(() => flattenCategories(categories), [categories]);

  useEffect(() => {
    void getMarketplaceCategories().then(setCategories);
    void getSellerProducts(sellerId).then(setProducts);
  }, [sellerId]);

  const save = async () => {
    setError('');
    if (!form.title.trim() || !form.description.trim()) {
      setError('العنوان والوصف مطلوبان');
      return;
    }
    if (!form.externalUrl.trim()) {
      setError('رابط المتجر الخارجي مطلوب (لا يوجد دفع داخل التطبيق)');
      return;
    }
    const result = await createOrUpdateSellerProduct(sellerId, plan, {
      ...form,
      sellerName: appUser?.full_name || (role === 'company' ? 'شركتي' : role === 'doctor' ? 'عيادتي' : 'متجري'),
      sellerType: role,
      keywords: form.title.split(/\s+/).slice(0, 6),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm({
      title: '', description: '', brand: '', categoryId: 'hair', kind: 'physical',
      priceDzd: 1000, compareAtPriceDzd: undefined, externalUrl: '', offerText: '',
    });
    setProducts(await getSellerProducts(sellerId));
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
            <Package size={16} /> إدارة المنتجات
          </h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
            {products.length}/{cap} (الحد الأقصى المطلق {MARKETPLACE_PREMIUM_LISTING_CAP})
          </p>
        </div>
        <button
          type="button"
          className="text-[11px] font-bold px-2 py-1 rounded-lg"
          style={{ backgroundColor: `${themeConfig.colors.accent}18`, color: themeConfig.colors.accent }}
          onClick={() => navigate('ai-listing-tools', { role })}
        >
          AI
        </button>
      </div>

      <div className="rounded-2xl border p-3 space-y-2 mb-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <input className="w-full rounded-xl p-2.5 text-sm outline-none" placeholder="عنوان المنتج"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
        <textarea className="w-full rounded-xl p-2.5 text-sm outline-none" rows={3} placeholder="الوصف"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-xl p-2.5 text-sm outline-none" placeholder="العلامة"
            value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
            style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
          <input type="number" className="rounded-xl p-2.5 text-sm outline-none" placeholder="السعر"
            value={form.priceDzd} onChange={e => setForm(f => ({ ...f, priceDzd: Number(e.target.value) }))}
            style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
          <select className="rounded-xl p-2.5 text-sm" value={form.categoryId}
            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}>
            {flatCats.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
          <select className="rounded-xl p-2.5 text-sm" value={form.kind}
            onChange={e => setForm(f => ({ ...f, kind: e.target.value as MarketplaceProductKind }))}
            style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}>
            <option value="physical">منتج فيزيائي</option>
            <option value="device">جهاز</option>
            <option value="course">دورة</option>
            <option value="accessory">إكسسوار</option>
          </select>
        </div>
        <input className="w-full rounded-xl p-2.5 text-sm outline-none" placeholder="رابط المتجر الخارجي (إجباري للشراء)"
          value={form.externalUrl} onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))}
          style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
        <input className="w-full rounded-xl p-2.5 text-sm outline-none" placeholder="نص العرض الإعلاني (اختياري)"
          value={form.offerText} onChange={e => setForm(f => ({ ...f, offerText: e.target.value }))}
          style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }} />
        {error && <p className="text-xs font-bold" style={{ color: themeConfig.colors.error }}>{error}</p>}
        <button type="button" onClick={() => void save()} className="w-full py-2.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-1"
          style={{ backgroundColor: themeConfig.colors.primary }}>
          <Plus size={16} /> إضافة منتج
        </button>
        <p className="text-[10px] text-center" style={{ color: themeConfig.colors.textMuted }}>
          لا يوجد دفع داخل التطبيق — الرابط الخارجي هو نقطة الشراء
        </p>
      </div>

      <div className="space-y-2">
        {products.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: themeConfig.colors.textMuted }}>لا منتجات بعد</p>
        )}
        {products.map(p => (
          <div key={p.id} className="rounded-2xl border p-3 flex items-start gap-3"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="w-14 h-14 rounded-xl bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${p.imageUrls[0]})` }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black line-clamp-1" style={{ color: themeConfig.colors.text }}>{p.title}</p>
              <p className="text-xs" style={{ color: themeConfig.colors.primary }}>{formatDzd(p.priceDzd)}</p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{p.kind} · {p.categoryId}</p>
            </div>
            <button
              type="button"
              aria-label="حذف"
              onClick={() => { void removeSellerProduct(sellerId, p.id).then(() => getSellerProducts(sellerId).then(setProducts)); }}
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${themeConfig.colors.error}12`, color: themeConfig.colors.error }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
