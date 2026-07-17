import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { supabase, isSupabaseConfigured } from '@/supabase/client';
import {
  getCompanyProducts,
  trackMarketplaceEvent,
  type MarketplaceProduct,
} from '@/lib/marketplace';
import { translate } from '@/lib/i18n';
import { BadgeCheck, Building2, ChevronLeft, Crown, ExternalLink, Globe } from 'lucide-react';

interface CompanyDetail {
  id: string;
  company_name: string;
  logo_url: string | null;
  cover_url: string | null;
  short_description: string | null;
  about: string | null;
  website_url: string | null;
  has_company_badge: boolean;
  is_premium: boolean;
  is_featured: boolean;
  trust_tag: string;
}

export default function CompanyDetailPage() {
  const { themeConfig, goBack, screenParams, navigate, settings } = useApp();
  const companyId = screenParams?.companyId || '';
  const tx = (key: Parameters<typeof translate>[1]) => translate(settings.language, key);
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data }, productRows] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).maybeSingle(),
        getCompanyProducts(companyId),
      ]);
      if (!cancelled) {
        setCompany(data as CompanyDetail | null);
        setProducts(productRows);
        trackMarketplaceEvent({ event_type: 'profile_visit', company_id: companyId });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const featured = useMemo(() => products.filter(p => p.is_featured), [products]);
  const bestSellers = useMemo(() => products.filter(p => p.is_best_seller), [products]);
  const newest = useMemo(() => products.filter(p => p.is_new), [products]);
  const rest = useMemo(
    () => products.filter(p => !p.is_featured && !p.is_best_seller && !p.is_new),
    [products],
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
      <p style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
    </div>;
  }

  if (!company) {
    return <div className="min-h-screen p-6" style={{ backgroundColor: themeConfig.colors.background }}>
      <button type="button" onClick={goBack}><ChevronLeft /></button>
      <p style={{ color: themeConfig.colors.error }}>الشركة غير موجودة أو بانتظار الموافقة</p>
    </div>;
  }

  const visitLabel = tx('visitStore');

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="h-36" style={{
        background: company.cover_url
          ? `center/cover url(${company.cover_url})`
          : `linear-gradient(120deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
      }}>
        <button type="button" onClick={goBack} className="m-4 p-2 rounded-xl bg-black/30 text-white"><ChevronLeft size={18} /></button>
      </div>
      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-4">
        <div className="rounded-3xl border p-4" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} style={{ color: themeConfig.colors.primary }} />
            {company.has_company_badge && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${themeConfig.colors.primary}18`, color: themeConfig.colors.primary }}>شارة شركة</span>}
            {company.is_premium && <span className="inline-flex items-center gap-1 text-[10px] font-black" style={{ color: themeConfig.colors.accent }}><Crown size={10} /> بريميوم</span>}
            <BadgeCheck size={14} style={{ color: themeConfig.colors.primary }} />
          </div>
          <h1 className="text-lg font-black" style={{ color: themeConfig.colors.text }}>{company.company_name}</h1>
          <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>{company.short_description || company.trust_tag}</p>
          <p className="text-sm mt-3 leading-7" style={{ color: themeConfig.colors.textMuted }}>{company.about || 'علامة رسمية بحضور أكبر وثقة أعلى على Hallaqi.'}</p>
          <button
            type="button"
            disabled={!company.website_url}
            onClick={() => {
              if (!company.website_url) return;
              trackMarketplaceEvent({ event_type: 'visit_store_click', company_id: company.id });
              navigate('store-webview', { url: company.website_url, title: company.company_name });
            }}
            className="mt-4 w-full h-12 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <Globe size={16} /> {visitLabel} <ExternalLink size={14} />
          </button>
        </div>

        {featured.length > 0 && (
          <ProductShelf title="منتج مميز" products={featured} theme={themeConfig} />
        )}
        {bestSellers.length > 0 && (
          <ProductShelf title="الأكثر مبيعًا" products={bestSellers} theme={themeConfig} />
        )}
        {newest.length > 0 && (
          <ProductShelf title="جديد" products={newest} theme={themeConfig} />
        )}
        {rest.length > 0 && (
          <ProductShelf title="منتجات الشركة" products={rest} theme={themeConfig} />
        )}
        {products.length === 0 && (
          <div className="rounded-2xl border p-6 text-center space-y-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>لا منتجات بعد</p>
            <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
              هذه الشركة لم تعرض منتجات في السوق بعد — تابع لاحقًا أو زر موقعها إن وُجد.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('marketplace')}
          className="w-full h-10 rounded-xl text-xs font-bold border"
          style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.primary }}
        >
          ← العودة للسوق
        </button>
      </div>
    </div>
  );
}

function ProductShelf({
  title,
  products,
  theme,
}: {
  title: string;
  products: MarketplaceProduct[];
  theme: { colors: Record<string, string> };
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-black" style={{ color: theme.colors.text }}>{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {products.map(p => (
          <div key={p.id} className="rounded-2xl border p-2 text-right"
            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
            <div className="h-24 rounded-xl mb-2" style={{
              background: p.image_urls?.[0]
                ? `center/cover url(${p.image_urls[0]})`
                : `linear-gradient(135deg, ${theme.colors.primary}33, ${theme.colors.accent}22)`,
            }} />
            <p className="text-[11px] font-bold line-clamp-2" style={{ color: theme.colors.text }}>{p.title}</p>
            {p.price_dzd != null && (
              <p className="text-[10px] font-black mt-1" style={{ color: theme.colors.primary }}>{p.price_dzd} دج</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
