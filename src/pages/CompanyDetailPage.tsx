import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { supabase, isSupabaseConfigured } from '@/supabase/client';
import { trackMarketplaceEvent } from '@/lib/marketplace';
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
  const { themeConfig, goBack, screenParams, navigate } = useApp();
  const companyId = screenParams?.companyId || '';
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
      if (!cancelled) {
        setCompany(data as CompanyDetail | null);
        trackMarketplaceEvent({ event_type: 'profile_visit', company_id: companyId });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

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
            onClick={() => company.website_url && navigate('store-webview', { url: company.website_url, title: company.company_name })}
            className="mt-4 w-full h-12 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <Globe size={16} /> زيارة المتجر <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
