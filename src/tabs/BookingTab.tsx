import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { barberTags, serviceCategories } from '@/data/mockData';
import { SkeletonBarberCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import BrandLogo from '@/components/BrandLogo';
import { motion } from 'framer-motion';
import type { BarberTag, ServiceCategory } from '@/types';
import { rankBarberRecommendations } from '@/lib/recommendations';
import { useI18n } from '@/hooks/useI18n';
import { isBarberOpenNow, isDisplayableBarber } from '@/lib/utils';
import { getNextAvailableSlotHint, nextSlotLabel } from '@/lib/scheduling';
import { getRecentBarberIds } from '@/lib/deviceStorage';
import { trackProductEvent } from '@/lib/product-analytics';
import type { TranslationKey } from '@/lib/i18n';
import { translate } from '@/lib/i18n';
import {
  Search, SlidersHorizontal, MapPin, Star, Clock, Car, Heart,
  Scissors, BadgeCheck, Zap, TrendingUp, ChevronLeft, X,
  Filter, Navigation, Globe, Sparkles, ShoppingBag, CalendarDays, GitCompare
} from 'lucide-react';

const tagIcons: Record<string, typeof Zap> = {
  active: Zap, 'old-school': Scissors, 'scissors-user': Scissors,
  mobile: Car, verified: BadgeCheck, trending: TrendingUp,
};

/** Open location in Google Maps (deep link or web fallback) */
function openInMaps(location: string, isMobile: boolean) {
  const query = encodeURIComponent(`${location}, Algeria`);
  if (isMobile) {
    window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }
}

function distanceInKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const deltaLat = radians(to.lat - from.lat);
  const deltaLng = radians(to.lng - from.lng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat))
    * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BookingTab() {
  const { barbers, bookings, currentUser, themeConfig, settings, updateSettings, toggleFollow, navigate, isLoading, setActiveTab } = useApp();
  const { isAuthenticated } = useAuth();
  const { t, money } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<BarberTag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedWilaya, setSelectedWilaya] = useState(
    () => settings.discoveryWilaya || localStorage.getItem('hallaqi-discovery-wilaya') || ''
  );
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'smart' | 'rating' | 'distance' | 'price' | 'newest'>('smart');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [mobileOnly, setMobileOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentBarberIds());
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const userLocation = currentUser as { city?: string; wilaya?: string } | null;
  const preferredCity = userLocation?.city || userLocation?.wilaya || 'الجزائر';
  const tx = (key: TranslationKey) => translate(settings.language, key);
  const availableWilayas = useMemo(
    () => [...new Set(barbers.filter(isDisplayableBarber).map(barber => barber.wilaya).filter(Boolean))].sort(),
    [barbers]
  );

  useEffect(() => {
    if (settings.discoveryWilaya !== undefined && settings.discoveryWilaya !== selectedWilaya) {
      setSelectedWilaya(settings.discoveryWilaya);
    }
  // Only sync when server prefs arrive / change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.discoveryWilaya]);

  useEffect(() => {
    setRecentIds(getRecentBarberIds());
  }, [barbers]);

  const popularServiceNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const barber of barbers.filter(isDisplayableBarber)) {
      for (const service of barber.services) {
        const name = service.name.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
      .slice(0, 6)
      .map(([name]) => name);
  }, [barbers]);

  const persistWilaya = (wilaya: string) => {
    setSelectedWilaya(wilaya);
    if (wilaya) localStorage.setItem('hallaqi-discovery-wilaya', wilaya);
    else localStorage.removeItem('hallaqi-discovery-wilaya');
    updateSettings({ discoveryWilaya: wilaya });
  };

  const toggleCompare = (barberId: string) => {
    setCompareIds(prev => {
      if (prev.includes(barberId)) return prev.filter(id => id !== barberId);
      if (prev.length >= 3) return prev;
      return [...prev, barberId];
    });
  };

  const recentBarbers = useMemo(
    () => recentIds
      .map(id => barbers.find(b => b.id === id))
      .filter((b): b is NonNullable<typeof b> => Boolean(b && isDisplayableBarber(b)))
      .slice(0, 8),
    [barbers, recentIds]
  );

  const distances = useMemo(() => new Map(
    barbers.map(barber => [
      barber.id,
      userCoordinates && barber.coordinates
        ? distanceInKm(userCoordinates, barber.coordinates)
        : null,
    ])
  ), [barbers, userCoordinates]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('الموقع غير مدعوم في هذا المتصفح');
      return;
    }
    setLocationMessage('جاري تحديد موقعك...');
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationMessage('تم ترتيب الحلاقين حسب موقعك');
      },
      () => setLocationMessage('تعذر الوصول للموقع؛ يمكنك المتابعة بالولاية المسجلة'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const filteredBarbers = useMemo(() => {
    let filtered = barbers.filter(isDisplayableBarber);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.wilaya.toLowerCase().includes(q) ||
        b.services.some(s => s.name.toLowerCase().includes(q))
      );
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter(b => selectedTags.some(tag => b.tags.includes(tag)));
    }
    if (selectedCategory) {
      filtered = filtered.filter(b => b.services.some(s => s.category === selectedCategory));
    }
    if (selectedWilaya) {
      filtered = filtered.filter(barber => barber.wilaya === selectedWilaya);
    }
    if (onlyFavorites) {
      filtered = filtered.filter(barber => barber.isFollowing);
    }
    if (openNowOnly) {
      filtered = filtered.filter(barber => isBarberOpenNow(barber.workingHours));
    }
    if (mobileOnly) {
      filtered = filtered.filter(barber => barber.isMobile);
    }
    switch (sortBy) {
      case 'smart':
        filtered.sort((a, b) => {
          const distA = distances.get(a.id);
          const distB = distances.get(b.id);
          const knownA = distA != null;
          const knownB = distB != null;
          if (knownA && knownB && distA !== distB) return distA - distB;
          if (knownA !== knownB) return knownA ? -1 : 1;
          if (b.rating !== a.rating) return b.rating - a.rating;
          const openA = isBarberOpenNow(a.workingHours) ? 1 : 0;
          const openB = isBarberOpenNow(b.workingHours) ? 1 : 0;
          return openB - openA;
        });
        break;
      case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
      case 'distance': filtered.sort((a, b) => (distances.get(a.id) ?? Number.POSITIVE_INFINITY) - (distances.get(b.id) ?? Number.POSITIVE_INFINITY)); break;
      case 'price':
        filtered.sort((a, b) => {
          const aMin = Math.min(...a.services.map(s => s.price));
          const bMin = Math.min(...b.services.map(s => s.price));
          return aMin - bMin;
        });
        break;
      case 'newest': filtered.sort((a, b) => (b.tags.includes('new') ? 1 : 0) - (a.tags.includes('new') ? 1 : 0)); break;
    }
    return filtered;
  }, [barbers, distances, mobileOnly, onlyFavorites, openNowOnly, searchQuery, selectedTags, selectedCategory, selectedWilaya, sortBy]);

  const recommendations = useMemo(() => {
    return rankBarberRecommendations(barbers.filter(isDisplayableBarber), {
      city: selectedWilaya || preferredCity,
      category: selectedCategory as ServiceCategory | null,
      bookings,
    }).slice(0, 3);
  }, [barbers, bookings, preferredCity, selectedCategory, selectedWilaya]);

  const toggleTag = (tag: BarberTag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // Show skeleton loaders while data is loading
  const showSkeletons = isLoading.barbers && barbers.length === 0;

  return (
    <div className="pb-20">
      {/* === HEADER === */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-3 backdrop-blur-lg" style={{ backgroundColor: `${themeConfig.colors.background}ee` }}>
        {/* Logo Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-9 h-9 shadow-sm" priority />
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: themeConfig.colors.text }}>HALLAQI</h1>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>حلاقي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('marketplace')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{ backgroundColor: themeConfig.colors.primary + '12', borderColor: themeConfig.colors.primary + '40', color: themeConfig.colors.primary }}
              title="السوق"
            >
              <ShoppingBag size={14} />
              <span className="hidden sm:inline">{tx('marketplace')}</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-hub')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{ backgroundColor: themeConfig.colors.accent + '12', borderColor: themeConfig.colors.accent + '40', color: themeConfig.colors.accent }}
              title="مساعد حلاقي"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">{tx('assistant')}</span>
            </button>
            <button
              onClick={() => openInMaps(selectedWilaya || preferredCity, false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
              title="عرض الحلاقين على الخريطة"
            >
              <Navigation size={14} />
              <span className="hidden sm:inline">{tx('map')}</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{
                backgroundColor: showFilters ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: showFilters ? '#fff' : themeConfig.colors.text,
                borderColor: themeConfig.colors.border,
              }}
            >
              <SlidersHorizontal size={16} />
              <span>{tx('filters')}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3" style={{ borderRadius: themeConfig.borderRadius }}>
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: themeConfig.colors.textMuted }} />
          <input
            type="text"
            placeholder={tx('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pr-10 pl-10 text-sm outline-none transition-all"
            style={{
              backgroundColor: themeConfig.colors.surface,
              color: themeConfig.colors.text,
              borderRadius: themeConfig.borderRadius,
              border: `1.5px solid ${searchQuery ? themeConfig.colors.primary : themeConfig.colors.border}`,
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X size={16} style={{ color: themeConfig.colors.textMuted }} />
            </button>
          )}
        </div>

        {popularServiceNames.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide">
            {popularServiceNames.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setSearchQuery(name)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: searchQuery === name ? themeConfig.colors.primary + '18' : themeConfig.colors.surface,
                  color: searchQuery === name ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                  border: `1px solid ${searchQuery === name ? themeConfig.colors.primary : themeConfig.colors.border}`,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Appointments — large entry point (moved out of bottom nav) */}
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              navigate('login', { redirectTab: 'appointments' });
              return;
            }
            setActiveTab('appointments');
          }}
          className="w-full mb-3 flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-right active:scale-[0.99] transition-transform"
          style={{
            background: `linear-gradient(135deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
            color: '#fff',
            boxShadow: `0 8px 24px ${themeConfig.colors.primary}33`,
          }}
          aria-label={tx('appointments')}
        >
          <span className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarDays size={22} />
            </span>
            <span>
              <span className="block text-base font-black leading-tight">{tx('appointments')}</span>
              <span className="block text-[11px] opacity-90 mt-0.5">{tx('appointmentsDescription')}</span>
            </span>
          </span>
          <ChevronLeft size={20} className="opacity-90" />
        </button>

        {/* Quick Tags */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => {
            if (!isAuthenticated) {
              navigate('login', { redirectScreen: 'home', redirectTab: 'booking' });
              return;
            }
            setOnlyFavorites(value => !value);
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all" style={{ backgroundColor: onlyFavorites ? '#EF444420' : themeConfig.colors.surface, color: onlyFavorites ? '#EF4444' : themeConfig.colors.textMuted, border: `1.5px solid ${onlyFavorites ? '#EF4444' : themeConfig.colors.border}` }}><Heart size={12} className={onlyFavorites ? 'fill-current' : ''} />{tx('favoritesOnly')}</button>
          <button
            type="button"
            onClick={() => setOpenNowOnly(value => !value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: openNowOnly ? themeConfig.colors.success + '20' : themeConfig.colors.surface,
              color: openNowOnly ? themeConfig.colors.success : themeConfig.colors.textMuted,
              border: `1.5px solid ${openNowOnly ? themeConfig.colors.success : themeConfig.colors.border}`,
            }}
          >
            <Clock size={12} /> {tx('openNowFilter')}
          </button>
          <button
            type="button"
            onClick={() => setMobileOnly(value => !value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: mobileOnly ? '#3B82F620' : themeConfig.colors.surface,
              color: mobileOnly ? '#3B82F6' : themeConfig.colors.textMuted,
              border: `1.5px solid ${mobileOnly ? '#3B82F6' : themeConfig.colors.border}`,
            }}
          >
            <Car size={12} /> {tx('mobileOnlyFilter')}
          </button>
          {barberTags.slice(0, 6).map(tag => {
            const isSelected = selectedTags.includes(tag.key as BarberTag);
            const Icon = tagIcons[tag.key] || Zap;
            return (
              <button
                key={tag.key}
                onClick={() => toggleTag(tag.key as BarberTag)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: isSelected ? tag.color + '20' : themeConfig.colors.surface,
                  color: isSelected ? tag.color : themeConfig.colors.textMuted,
                  border: `1.5px solid ${isSelected ? tag.color : themeConfig.colors.border}`,
                }}
              >
                <Icon size={12} />
                {tag.label}
              </button>
            );
          })}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: themeConfig.colors.textMuted }}>الولاية</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button type="button" onClick={() => persistWilaya('')} className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap" style={{ backgroundColor: !selectedWilaya ? themeConfig.colors.primary : themeConfig.colors.background, color: !selectedWilaya ? '#fff' : themeConfig.colors.textMuted }}>{t('allWilayas')}</button>
                {availableWilayas.map(wilaya => (
                  <button key={wilaya} type="button" onClick={() => persistWilaya(wilaya)} className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap" style={{ backgroundColor: selectedWilaya === wilaya ? themeConfig.colors.primary : themeConfig.colors.background, color: selectedWilaya === wilaya ? '#fff' : themeConfig.colors.textMuted }}>{wilaya}</button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: themeConfig.colors.textMuted }}>نوع الخدمة</p>
              <div className="flex gap-2 flex-wrap">
                {serviceCategories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: selectedCategory === cat.key ? themeConfig.colors.primary + '20' : themeConfig.colors.background,
                      color: selectedCategory === cat.key ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                      border: `1px solid ${selectedCategory === cat.key ? themeConfig.colors.primary : themeConfig.colors.border}`,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: themeConfig.colors.textMuted }}>الترتيب حسب</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'smart' as const, label: tx('sortSmart'), icon: Sparkles },
                  { key: 'rating' as const, label: tx('sortRating'), icon: Star },
                  { key: 'distance' as const, label: tx('sortDistance'), icon: MapPin },
                  { key: 'price' as const, label: tx('sortPrice'), icon: Filter },
                  { key: 'newest' as const, label: tx('sortNewest'), icon: Clock },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSortBy(opt.key);
                      if ((opt.key === 'distance' || opt.key === 'smart') && !userCoordinates) requestLocation();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: sortBy === opt.key ? themeConfig.colors.accent + '20' : themeConfig.colors.background,
                      color: sortBy === opt.key ? themeConfig.colors.accent : themeConfig.colors.textMuted,
                      border: `1px solid ${sortBy === opt.key ? themeConfig.colors.accent : themeConfig.colors.border}`,
                    }}
                  >
                    <opt.icon size={12} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {locationMessage && <p role="status" className="text-[10px] mt-2 text-center" style={{ color: themeConfig.colors.textMuted }}>{locationMessage}</p>}
      </div>

      {recentBarbers.length > 0 && !searchQuery && (
        <section className="px-4 mt-3" aria-labelledby="recent-title">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} style={{ color: themeConfig.colors.textMuted }} />
            <h2 id="recent-title" className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
              {tx('recentlyVisited')}
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {recentBarbers.map(barber => (
              <button
                key={`recent-${barber.id}`}
                type="button"
                onClick={() => navigate('barber-detail', { barberId: barber.id })}
                className="min-w-[140px] p-2.5 rounded-2xl border text-right"
                style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
              >
                <div className="flex items-center gap-2">
                  <img src={barber.avatar} alt="" className="w-9 h-9 rounded-xl object-cover" loading="lazy" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate" style={{ color: themeConfig.colors.text }}>{barber.name}</p>
                    <p className="text-[9px] truncate" style={{ color: themeConfig.colors.textMuted }}>{barber.wilaya}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {isAuthenticated && !searchQuery && selectedTags.length === 0 && recommendations.length > 0 && (
        <section className="px-4 mt-3" aria-labelledby="recommended-title">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} style={{ color: themeConfig.colors.accent }} />
            <div>
              <h2 id="recommended-title" className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{tx('recommended')}</h2>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{tx('recommendedDescription')}</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {recommendations.map(recommendation => (
              <button
                key={recommendation.barber.id}
                type="button"
                onClick={() => {
                  trackProductEvent('Barber Viewed', { source: 'recommendation', barberId: recommendation.barber.id, score: recommendation.score });
                  navigate('barber-detail', { barberId: recommendation.barber.id });
                }}
                className="min-w-[220px] p-3 rounded-2xl border text-right"
                style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.accent + '50' }}
              >
                <div className="flex items-center gap-2">
                  <img src={recommendation.barber.avatar} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate" style={{ color: themeConfig.colors.text }}>{recommendation.barber.name}</p>
                    <p className="text-[10px]" style={{ color: themeConfig.colors.accent }}>توافق {recommendation.score}%</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {recommendation.reasons.map(reason => (
                    <span key={reason} className="text-[9px] px-2 py-1 rounded-full" style={{ color: themeConfig.colors.primary, backgroundColor: themeConfig.colors.primary + '10' }}>{reason}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* === BARBERS LIST === */}
      <div className="px-4 space-y-3 mt-2">
        {!showSkeletons && filteredBarbers.length > 0 && (
          <p className="text-xs font-medium pt-1" style={{ color: themeConfig.colors.textMuted }}>
            {tx('barbersCount').replace('{n}', String(filteredBarbers.length))}
          </p>
        )}
        {showSkeletons ? (
          <>
            <SkeletonBarberCard />
            <SkeletonBarberCard />
            <SkeletonBarberCard />
          </>
        ) : (
          filteredBarbers.map((barber, index) => {
            const openNow = isBarberOpenNow(barber.workingHours);
            const nextSlot = nextSlotLabel(getNextAvailableSlotHint(barber.workingHours), settings.language);
            const inCompare = compareIds.includes(barber.id);
            const servicePrices = barber.services.map(s => s.price).filter(p => p > 0);
            const minPrice = servicePrices.length ? Math.min(...servicePrices) : null;
            const maxPrice = servicePrices.length ? Math.max(...servicePrices) : null;
            const priceLabel = minPrice == null
              ? '—'
              : minPrice === maxPrice
                ? money(minPrice)
                : `${money(minPrice)} – ${money(maxPrice!)}`;
            return (
            <motion.div
              key={barber.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
              className="rounded-2xl overflow-hidden border transition-shadow duration-300 hover:shadow-md"
              style={{
                backgroundColor: themeConfig.colors.surface,
                borderColor: inCompare ? themeConfig.colors.primary : themeConfig.colors.border,
              }}
            >
              {/* Cover */}
              <div className="relative h-32 overflow-hidden">
                <img src={barber.coverImage} alt={barber.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  type="button"
                  onClick={() => toggleCompare(barber.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: inCompare ? themeConfig.colors.primary : 'rgba(0,0,0,.45)' }}
                  aria-pressed={inCompare}
                  title={tx('compare')}
                >
                  <GitCompare size={14} />
                </button>
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap justify-end max-w-[70%]">
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: openNow ? themeConfig.colors.success : '#6B7280' }}
                  >
                    <Clock size={10} /> {openNow ? tx('openNow') : tx('closedNow')}
                  </span>
                  {nextSlot && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-black/50">
                      <CalendarDays size={10} /> {nextSlot}
                    </span>
                  )}
                  {barber.isMobile && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-blue-500">
                      <Car size={10} /> {tx('mobileBarber')}
                    </span>
                  )}
                  {barber.isVerified && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-sky-500">
                      <BadgeCheck size={10} /> {tx('verified')}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>
                    {priceLabel}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={barber.avatar} alt={barber.name} loading="lazy" decoding="async"
                      className="w-12 h-12 rounded-xl object-cover border-2"
                      style={{ borderColor: themeConfig.colors.primary + '40' }}
                    />
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: themeConfig.colors.text }}>{barber.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium" style={{ color: themeConfig.colors.text }}>{barber.rating}</span>
                        <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>({barber.reviewCount})</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('login', { redirectScreen: 'home', redirectTab: 'booking' });
                        return;
                      }
                      void toggleFollow(barber.id);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      backgroundColor: barber.isFollowing ? themeConfig.colors.primary + '15' : themeConfig.colors.primary,
                      color: barber.isFollowing ? themeConfig.colors.primary : '#fff',
                    }}
                  >
                    {barber.isFollowing ? tx('following') : tx('follow')}
                  </button>
                </div>

                {/* Location + Map Link */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} style={{ color: themeConfig.colors.textMuted }} />
                    <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{barber.location}, {barber.wilaya}</span>
                  </div>
                  <button
                    onClick={() => openInMaps(`${barber.location}, ${barber.wilaya}`, barber.isMobile)}
                    className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-all"
                    style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}
                  >
                    <Navigation size={9} /> {distances.get(barber.id) != null ? `${distances.get(barber.id)?.toFixed(1)} كم` : barber.distance}
                  </button>
                </div>

                {/* Tags */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {barber.tags.map(tag => {
                    const tagInfo = barberTags.find(t => t.key === tag);
                    if (!tagInfo) return null;
                    return (
                      <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: tagInfo.color + '15', color: tagInfo.color }}>
                        {tagInfo.label}
                      </span>
                    );
                  })}
                </div>

                {/* Services */}
                <div className="mt-2 space-y-1">
                  {barber.services.slice(0, 2).map(svc => (
                    <div key={svc.id} className="flex items-center justify-between py-1">
                      <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                          <Clock size={10} className="inline ml-0.5" />{svc.duration}د
                        </span>
                        <span className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>{money(svc.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('login', { redirectScreen: 'booking-flow', barberId: barber.id });
                        return;
                      }
                      trackProductEvent('Booking Started', { source: 'discovery', barberId: barber.id });
                      navigate('booking-flow', { barberId: barber.id });
                    }}
                    className="flex-1 h-10 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: themeConfig.colors.primary }}
                  >
                    {tx('bookNow')}
                  </button>
                  <button
                    onClick={() => openInMaps(`${barber.location}, ${barber.wilaya}`, barber.isMobile)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl border transition-all"
                    style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.success }}
                    title="فتح في الخريطة"
                  >
                    <Globe size={18} />
                  </button>
                  <button
                    onClick={() => {
                      trackProductEvent('Barber Viewed', { source: 'discovery', barberId: barber.id });
                      navigate('barber-detail', { barberId: barber.id });
                    }}
                    className="h-10 w-10 flex items-center justify-center rounded-xl border transition-all"
                    style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
            );
          })
        )}
      </div>

      {/* Empty State */}
      {!showSkeletons && filteredBarbers.length === 0 && (
        <EmptyState
          icon={Search}
          title={tx('noResults')}
          description={settings.language === 'en' ? 'Try changing search or filters' : settings.language === 'fr' ? 'Modifiez la recherche ou les filtres' : 'جرب تغيير كلمات البحث أو الفلاتر'}
          actionLabel={tx('resetFilters')}
          onAction={() => {
            setSearchQuery('');
            setSelectedTags([]);
            setSelectedCategory(null);
            persistWilaya('');
            setOnlyFavorites(false);
            setOpenNowOnly(false);
            setMobileOnly(false);
            setCompareIds([]);
            setSortBy('smart');
          }}
          themeConfig={themeConfig}
        />
      )}

      {compareIds.length >= 2 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-2rem)] max-w-md">
          <button
            type="button"
            onClick={() => navigate('compare-barbers', { barberIds: compareIds.join(',') })}
            className="w-full h-12 rounded-2xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <GitCompare size={16} />
            {tx('compareNow')} ({compareIds.length})
          </button>
        </div>
      )}

      <div className="px-4 mt-6 mb-4 text-center space-y-2">
        <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>
          {t('cashOnVisit')} · support@hallaqi.app
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-bold">
          <button type="button" onClick={() => navigate('home', { openLegal: 'help', redirectTab: 'profile' })} style={{ color: themeConfig.colors.primary }}>{t('help')}</button>
          <button type="button" onClick={() => navigate('home', { openLegal: 'about', redirectTab: 'profile' })} style={{ color: themeConfig.colors.primary }}>{t('about')}</button>
          <button type="button" onClick={() => navigate('home', { openLegal: 'privacy', redirectTab: 'profile' })} style={{ color: themeConfig.colors.primary }}>{t('privacy')}</button>
          <button type="button" onClick={() => navigate('home', { openLegal: 'terms', redirectTab: 'profile' })} style={{ color: themeConfig.colors.primary }}>{t('terms')}</button>
        </div>
      </div>
    </div>
  );
}
