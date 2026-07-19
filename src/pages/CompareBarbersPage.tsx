import { useMemo } from 'react';
import { ArrowLeft, BadgeCheck, Car, Star } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { isBarberOpenNow } from '@/lib/utils';
import { getNextAvailableSlotHint, nextSlotLabel } from '@/lib/scheduling';
import { translate } from '@/lib/i18n';

export default function CompareBarbersPage() {
  const { themeConfig, screenParams, barbers, navigate, goBack, settings } = useApp();
  const { isAuthenticated } = useAuth();
  const { money } = useI18n();
  const ids = (screenParams?.barberIds || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .slice(0, 3);

  const selected = useMemo(
    () => ids.map(id => barbers.find(b => b.id === id)).filter(Boolean),
    [barbers, ids]
  );

  if (selected.length < 2) {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: themeConfig.colors.background }}>
        <button type="button" onClick={goBack} className="w-9 h-9 rounded-xl flex items-center justify-center mb-4">
          <ArrowLeft size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>
          {settings.language === 'en' ? 'Select at least 2 barbers to compare.' : settings.language === 'fr' ? 'Sélectionnez au moins 2 coiffeurs.' : 'اختر حلاقين على الأقل للمقارنة.'}
        </p>
      </div>
    );
  }

  const rows: { label: string; values: string[] }[] = [
    {
      label: settings.language === 'en' ? 'Rating' : settings.language === 'fr' ? 'Note' : 'التقييم',
      values: selected.map(b => `${b!.rating} (${b!.reviewCount})`),
    },
    {
      label: settings.language === 'en' ? 'Wilaya' : settings.language === 'fr' ? 'Wilaya' : 'الولاية',
      values: selected.map(b => b!.wilaya),
    },
    {
      label: settings.language === 'en' ? 'Price' : settings.language === 'fr' ? 'Prix' : 'السعر',
      values: selected.map(b => {
        const prices = b!.services.map(s => s.price).filter(p => p > 0);
        if (!prices.length) return '—';
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max ? money(min) : `${money(min)} – ${money(max)}`;
      }),
    },
    {
      label: settings.language === 'en' ? 'Status' : settings.language === 'fr' ? 'Statut' : 'الحالة',
      values: selected.map(b => (isBarberOpenNow(b!.workingHours)
        ? (settings.language === 'en' ? 'Open' : settings.language === 'fr' ? 'Ouvert' : 'مفتوح')
        : (settings.language === 'en' ? 'Closed' : settings.language === 'fr' ? 'Fermé' : 'مغلق'))),
    },
    {
      label: settings.language === 'en' ? 'Next slot' : settings.language === 'fr' ? 'Prochain créneau' : 'أقرب موعد',
      values: selected.map(b => nextSlotLabel(getNextAvailableSlotHint(b!.workingHours), settings.language) || '—'),
    },
    {
      label: settings.language === 'en' ? 'Mobile' : settings.language === 'fr' ? 'Mobile' : 'متنقل',
      values: selected.map(b => (b!.isMobile ? '✓' : '—')),
    },
  ];

  return (
    <div className="pb-20 min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button type="button" onClick={goBack} aria-label={translate(settings.language, 'back')} className="w-9 h-9 rounded-xl flex items-center justify-center">
          <ArrowLeft size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <h1 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>
          {settings.language === 'en' ? 'Compare barbers' : settings.language === 'fr' ? 'Comparer' : 'مقارنة الحلاقين'}
        </h1>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `120px repeat(${selected.length}, 1fr)` }}>
            <div />
            {selected.map(b => (
              <div key={b!.id} className="rounded-2xl border p-3 text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <img src={b!.avatar} alt={b!.name} className="w-14 h-14 rounded-xl object-cover mx-auto" />
                <p className="text-xs font-bold mt-2 flex items-center justify-center gap-1" style={{ color: themeConfig.colors.text }}>
                  {b!.name}
                  {b!.isVerified && <BadgeCheck size={12} style={{ color: themeConfig.colors.info }} />}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1 text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                  <Star size={10} className="text-yellow-500 fill-yellow-500" /> {b!.rating}
                  {b!.isMobile && <Car size={10} />}
                </div>
              </div>
            ))}
          </div>

          {rows.map(row => (
            <div key={row.label} className="grid gap-2 py-2 border-b" style={{ gridTemplateColumns: `120px repeat(${selected.length}, 1fr)`, borderColor: themeConfig.colors.border + '70' }}>
              <p className="text-[11px] font-bold self-center" style={{ color: themeConfig.colors.textMuted }}>{row.label}</p>
              {row.values.map((value, i) => (
                <p key={`${row.label}-${i}`} className="text-xs text-center self-center" style={{ color: themeConfig.colors.text }}>{value}</p>
              ))}
            </div>
          ))}

          <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `120px repeat(${selected.length}, 1fr)` }}>
            <div />
            {selected.map(b => (
              <div key={`cta-${b!.id}`} className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('login', { redirectScreen: 'booking-flow', barberId: b!.id });
                      return;
                    }
                    navigate('booking-flow', { barberId: b!.id });
                  }}
                  className="w-full h-10 rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: themeConfig.colors.primary }}
                >
                  {translate(settings.language, 'bookNow')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('barber-detail', { barberId: b!.id })}
                  className="w-full h-9 rounded-xl text-[10px] font-bold border"
                  style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                >
                  {settings.language === 'en' ? 'Profile' : settings.language === 'fr' ? 'Profil' : 'الملف'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
