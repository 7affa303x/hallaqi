import { useEffect, useState } from 'react';
import { Calendar, MapPin, Scissors } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { MiniSiteService } from '@/lib/growth-layer';
import { supabase, isSupabaseConfigured } from '@/supabase/client';

interface PublicProfile {
  fullName: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
}

export default function MiniSitePage() {
  const { themeConfig, screenParams, navigate } = useApp();
  const slug = screenParams?.slug || '';
  const [siteUserId, setSiteUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const site = await MiniSiteService.bySlug(slug);
        if (!site || !isSupabaseConfigured()) {
          setProfile(null);
          return;
        }
        setSiteUserId(site.userId);
        const { data: prof } = await supabase
          .from('professionals')
          .select('business_name, bio, profiles(full_name, avatar_url, city)')
          .eq('id', site.userId)
          .maybeSingle();
        const p = prof?.profiles as { full_name?: string; avatar_url?: string | null; city?: string | null } | null;
        if (prof || p) {
          setProfile({
            fullName: p?.full_name || prof?.business_name || site.seoTitle || slug,
            avatarUrl: p?.avatar_url ?? null,
            city: p?.city ?? null,
            bio: prof?.bio || site.seoDescription,
          });
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <p style={{ color: themeConfig.colors.textMuted }}>جاري التحميل…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: themeConfig.colors.background }} dir="rtl">
        <p className="text-lg font-bold mb-2" style={{ color: themeConfig.colors.text }}>الصفحة غير موجودة</p>
        <button type="button" onClick={() => navigate('home')} className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>العودة للرئيسية</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: themeConfig.colors.background }} dir="rtl">
      <header
        className="px-4 pt-8 pb-6 text-center"
        style={{ background: `linear-gradient(160deg, ${themeConfig.colors.primary}22, ${themeConfig.colors.background})` }}
      >
        <div className="w-24 h-24 rounded-3xl mx-auto overflow-hidden mb-3 border-4 border-white shadow-lg">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl bg-black/5">💈</div>
          )}
        </div>
        <h1 className="text-2xl font-black" style={{ color: themeConfig.colors.text }}>{profile.fullName}</h1>
        {profile.city && (
          <p className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
            <MapPin size={12} /> {profile.city}
          </p>
        )}
        {profile.bio && (
          <p className="text-sm mt-3 max-w-sm mx-auto leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>{profile.bio}</p>
        )}
      </header>

      <div className="px-4 space-y-3">
        <button
          type="button"
          onClick={() => siteUserId && navigate('barber-detail', { barberId: siteUserId })}
          className="w-full h-12 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          <Calendar size={18} />
          احجز موعداً
        </button>

        <section
          className="rounded-2xl border p-4"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: themeConfig.colors.text }}>
            <Scissors size={16} /> معرض الأعمال
          </h2>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>المعرض الكامل قريباً في الموقع المصغر</p>
        </section>
      </div>
    </div>
  );
}
