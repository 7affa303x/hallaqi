import { useEffect, useState } from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { MiniSiteService } from '@/lib/growth-layer';

export default function MiniSiteCard() {
  const { themeConfig, navigate } = useApp();
  const { appUser } = useAuth();
  const [slug, setSlug] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!appUser) return;
    MiniSiteService.forUser(appUser.id).then(site => {
      if (site) {
        setSlug(site.slug);
        setPublished(site.isPublished);
      }
    }).catch(() => undefined);
  }, [appUser]);

  if (!appUser) return null;
  const isBarber = appUser.user_role === 'barber' || appUser.user_role === 'specialist';
  if (!isBarber) return null;

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await MiniSiteService.save({
        userId: appUser.id,
        slug,
        seoTitle: appUser.full_name || undefined,
        isPublished: published,
      });
      setMsg('تم الحفظ');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      dir="rtl"
    >
      <div className="flex items-center gap-2 mb-3">
        <Globe size={16} style={{ color: themeConfig.colors.primary }} />
        <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>موقعي المصغر</h3>
      </div>
      <p className="text-[10px] mb-3" style={{ color: themeConfig.colors.textMuted }}>
        hallaqi.app/u/{slug || 'اسمك'}
      </p>
      <input
        value={slug}
        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        placeholder="samir"
        className="w-full h-10 rounded-xl border px-3 text-sm mb-2"
        style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
      />
      <label className="flex items-center gap-2 text-[11px] mb-3" style={{ color: themeConfig.colors.text }}>
        <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
        نشر الموقع العام
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={saving || !slug} onClick={() => void save()} className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>
          {saving ? 'جاري الحفظ…' : 'حفظ'}
        </button>
        {published && slug && (
          <button type="button" onClick={() => navigate('mini-site', { slug })} className="h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
            <ExternalLink size={12} /> معاينة
          </button>
        )}
      </div>
      {msg && <p className="text-[10px] mt-2" style={{ color: themeConfig.colors.textMuted }}>{msg}</p>}
    </section>
  );
}
