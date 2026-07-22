import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/useApp';
import { barberTags, serviceCategories } from '@/data/mockData';
import { SkeletonBarberCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import BrandLogo from '@/components/BrandLogo';
import { motion } from 'framer-motion';
import type { BarberTag, ServiceCategory } from '@/types';
import { rankBarberRecommendations } from '@/lib/recommendations';
import { useI18n } from '@/hooks/useI18n';
import { isBarberOpenNow, isDisplayableBarber, formatBarberLocation } from '@/lib/utils';
import { useAuthGate } from '@/hooks/useAuthGate';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { trackProductEvent } from '@/lib/product-analytics';
import type { TranslationKey } from '@/lib/i18n';
import { translate } from '@/lib/i18n';
import {
  ALGERIA_WILAYAS,
  DISCOVERY_COUNTRIES,
  distanceInKm,
  findNearestWilaya,
  filterWilayasByQuery,
  wilayaLabel,
  wilayaLabelsMatch,
} from '@/lib/locale/algeriaWilayas';
import {
  barberMatchesQuery,
  barberMatchesWilaya,
  buildSearchSuggestions,
  scoreBarberSearch,
  QUICK_FILTER_CHIPS,
  type QuickFilterId,
} from '@/lib/discovery/search';
import {
  Search, SlidersHorizontal, MapPin, Star, Clock, Car, Heart,
  Scissors, BadgeCheck, Zap, TrendingUp, ChevronLeft, X,
  Filter, Navigation, Globe, Sparkles, ShoppingBag, CalendarDays,
  Crosshair, Wallet, Home, Crown,
} from 'lucide-react';

const GPS_TRIED_KEY = 'hallaqi-discovery-gps-tried-v1';
const COUNTRY_KEY = 'hallaqi-discovery-country-v1';

const tagIcons: Record<string, typeof Zap> = {
  active: Zap,
  'old-school': Scissors,
  'scissors-user': Scissors,
  mobile: Car,
  verified: BadgeCheck,
  trending: TrendingUp,
  new: Sparkles,
  'top-rated': Star,
  quick: Clock,
  premium: Crown,
  cash: Wallet,
  'home-service': Home,
};

function openInMaps(location: string, isMobile: boolean, countryCode = 'DZ') {
  const countryName = DISCOVERY_COUNTRIES.find(c => c.code === countryCode)?.nameEn || 'Algeria';
  const query = encodeURIComponent(`${location}, ${countryName}`);
  if (isMobile) {
    window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }
}

export default function BookingTab() {
  const { barbers, bookings, currentUser, themeConfig, settings, updateSettings, toggleFollow, navigate, isLoading, setActiveTab } = useApp();
  const { isLoggedIn } = useAuthGate();
  const { t, money } = useI18n();
  const lang = settings.language;
  const tx = useCallback((key: TranslationKey) => translate(lang, key), [lang]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<BarberTag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem(COUNTRY_KEY) || settings.countryCode || 'DZ'; } catch { return settings.countryCode || 'DZ'; }
  });
  const [selectedWilaya, setSelectedWilaya] = useState(
    () => settings.discoveryWilaya || (typeof localStorage !== 'undefined' ? localStorage.getItem('hallaqi-discovery-wilaya') || '' : ''),
  );
  const [wilayaQuery, setWilayaQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'smart' | 'rating' | 'distance' | 'price' | 'newest'>('smart');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [mobileOnly, setMobileOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const gpsAutoTried = useRef(false);
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const [collapsibleHeight, setCollapsibleHeight] = useState(0);
  const [headerReveal, setHeaderReveal] = useState(1);

  const countryMeta = DISCOVERY_COUNTRIES.find(c => c.code === selectedCountry) || DISCOVERY_COUNTRIES[0];
  const countrySupportsWilayas = countryMeta.hasWilayas;

  useEffect(() => {
    const measure = () => {
      if (collapsibleRef.current) setCollapsibleHeight(collapsibleRef.current.offsetHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [showFilters, selectedWilaya, countrySupportsWilayas]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 0) {
        setHeaderReveal(1);
        lastScrollY.current = 0;
        return;
      }
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      const travel = Math.max(collapsibleHeight, 1);
      setHeaderReveal(prev => {
        if (delta > 0) return Math.max(0, prev - delta / travel);
        return Math.min(1, prev - delta / travel);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [collapsibleHeight]);

  const hiddenHeaderPx = Math.round((1 - headerReveal) * collapsibleHeight);

  const openBarberDetail = useCallback((barberId: string, source: string) => {
    trackProductEvent('Barber Viewed', { source, barberId });
    navigate('barber-detail', { barberId });
  }, [navigate]);

  const openBarberBooking = useCallback((barberId: string, serviceId?: string) => {
    if (!isLoggedIn) {
      navigate('login', { redirectScreen: 'booking-flow', barberId, serviceIds: serviceId });
      return;
    }
    trackProductEvent('Booking Started', { source: 'discovery', barberId, serviceId });
    navigate('booking-flow', { barberId, serviceIds: serviceId });
  }, [isLoggedIn, navigate]);

  const userLocation = currentUser as { city?: string; wilaya?: string } | null;
  const preferredCity = userLocation?.city || userLocation?.wilaya || 'الجزائر';

  const wilayaOptions = useMemo(
    () => (countrySupportsWilayas ? filterWilayasByQuery(wilayaQuery, lang) : []),
    [countrySupportsWilayas, wilayaQuery, lang],
  );

  const persistWilaya = useCallback((wilaya: string) => {
    setSelectedWilaya(wilaya);
    try {
      if (wilaya) localStorage.setItem('hallaqi-discovery-wilaya', wilaya);
      else localStorage.removeItem('hallaqi-discovery-wilaya');
    } catch { /* ignore */ }
    updateSettings({ discoveryWilaya: wilaya });
  }, [updateSettings]);

  const persistCountry = useCallback((code: string) => {
    setSelectedCountry(code);
    try { localStorage.setItem(COUNTRY_KEY, code); } catch { /* ignore */ }
    updateSettings({ countryCode: code });
    if (code !== 'DZ') persistWilaya('');
  }, [updateSettings, persistWilaya]);

  const applyGps = useCallback((coords: { lat: number; lng: number }, auto: boolean) => {
    setUserCoordinates(coords);
    if (selectedCountry === 'DZ' || auto) {
      const nearest = findNearestWilaya(coords);
      persistWilaya(nearest.nameAr);
      if (selectedCountry !== 'DZ') persistCountry('DZ');
    }
    setSortBy('distance');
    // Auto GPS only sets wilaya — enabling nearbyOnly on first paint often yields an empty home.
    // Manual "locate me" still filters to nearby salons.
    if (!auto) setNearbyOnly(true);
    setLocationMessage(tx('locationReady'));
  }, [persistCountry, persistWilaya, selectedCountry, tx]);

  const requestLocation = useCallback((auto = false) => {
    if (!navigator.geolocation) {
      setLocationMessage(lang === 'fr' ? 'Géolocalisation non supportée' : lang === 'en' ? 'Geolocation unsupported' : 'الموقع غير مدعوم في هذا المتصفح');
      return;
    }
    setLocationMessage(tx('locating'));
    navigator.geolocation.getCurrentPosition(
      position => {
        applyGps({ lat: position.coords.latitude, lng: position.coords.longitude }, auto);
      },
      () => {
        setLocationMessage(tx('locationDenied'));
        if (!selectedWilaya && userLocation?.wilaya) persistWilaya(userLocation.wilaya);
        else if (!selectedWilaya && userLocation?.city) persistWilaya(userLocation.city);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [applyGps, lang, persistWilaya, selectedWilaya, tx, userLocation]);

  // Default: try GPS once per browser session when no wilaya saved
  useEffect(() => {
    if (gpsAutoTried.current) return;
    gpsAutoTried.current = true;
    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(GPS_TRIED_KEY) === '1';
      if (!alreadyTried) sessionStorage.setItem(GPS_TRIED_KEY, '1');
    } catch { /* ignore */ }
    if (alreadyTried) return;
    const saved = settings.discoveryWilaya || (typeof localStorage !== 'undefined' ? localStorage.getItem('hallaqi-discovery-wilaya') : null);
    if (saved) return;
    requestLocation(true);
  // intentionally once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settings.discoveryWilaya !== undefined && settings.discoveryWilaya !== selectedWilaya) {
      setSelectedWilaya(settings.discoveryWilaya || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.discoveryWilaya]);

  const distances = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const barber of barbers) {
      if (!userCoordinates) {
        map.set(barber.id, null);
        continue;
      }
      if (barber.coordinates) {
        map.set(barber.id, distanceInKm(userCoordinates, barber.coordinates));
        continue;
      }
      const match = ALGERIA_WILAYAS.find(w => barberMatchesWilaya(barber, w.nameAr));
      map.set(
        barber.id,
        match ? distanceInKm(userCoordinates, { lat: match.lat, lng: match.lng }) : null,
      );
    }
    return map;
  }, [barbers, userCoordinates]);

  const suggestions = useMemo(
    () => buildSearchSuggestions(barbers.filter(isDisplayableBarber), searchQuery, 6),
    [barbers, searchQuery],
  );

  const filteredBarbers = useMemo(() => {
    let filtered = barbers.filter(isDisplayableBarber);

    if (searchQuery.trim()) {
      filtered = filtered.filter(b => barberMatchesQuery(b, searchQuery));
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter(b => selectedTags.some(tag => b.tags.includes(tag)));
    }
    if (selectedCategory) {
      filtered = filtered.filter(b => b.services.some(s => s.category === selectedCategory));
    }
    if (selectedWilaya && countrySupportsWilayas) {
      filtered = filtered.filter(b => barberMatchesWilaya(b, selectedWilaya));
    }
    if (onlyFavorites) filtered = filtered.filter(b => b.isFollowing);
    if (openNowOnly) filtered = filtered.filter(b => isBarberOpenNow(b.workingHours));
    if (mobileOnly) filtered = filtered.filter(b => b.isMobile || b.tags.includes('mobile') || b.tags.includes('home-service'));
    if (maxBudget != null) filtered = filtered.filter(b => b.services.some(s => s.price > 0 && s.price <= maxBudget));
    if (maxDuration != null) filtered = filtered.filter(b => b.services.some(s => s.duration > 0 && s.duration <= maxDuration));
    if (nearbyOnly && userCoordinates) {
      filtered = filtered.filter(b => {
        const d = distances.get(b.id);
        return d != null && d <= 40;
      });
    }

    switch (sortBy) {
      case 'smart':
        filtered.sort((a, b) => {
          const searchBoost = scoreBarberSearch(b, searchQuery) - scoreBarberSearch(a, searchQuery);
          if (searchBoost !== 0) return searchBoost;
          const openBoost = (isBarberOpenNow(b.workingHours) ? 1 : 0) - (isBarberOpenNow(a.workingHours) ? 1 : 0);
          if (openBoost !== 0) return openBoost;
          const distA = distances.get(a.id) ?? 9999;
          const distB = distances.get(b.id) ?? 9999;
          if (userCoordinates && Math.abs(distA - distB) > 0.5) return distA - distB;
          const follow = (b.isFollowing ? 1 : 0) - (a.isFollowing ? 1 : 0);
          if (follow !== 0) return follow;
          return b.rating - a.rating;
        });
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'distance':
        filtered.sort((a, b) => (distances.get(a.id) ?? Number.POSITIVE_INFINITY) - (distances.get(b.id) ?? Number.POSITIVE_INFINITY));
        break;
      case 'price':
        filtered.sort((a, b) => {
          const aMin = Math.min(...a.services.map(s => s.price).filter(p => p > 0), Number.POSITIVE_INFINITY);
          const bMin = Math.min(...b.services.map(s => s.price).filter(p => p > 0), Number.POSITIVE_INFINITY);
          return aMin - bMin;
        });
        break;
      case 'newest':
        filtered.sort((a, b) => (b.tags.includes('new') ? 1 : 0) - (a.tags.includes('new') ? 1 : 0));
        break;
    }
    // Deduplicate by id (DB join glitches can surface the same pro twice).
    const seen = new Set<string>();
    filtered = filtered.filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    return filtered;
  }, [
    barbers, distances, onlyFavorites, searchQuery, selectedTags, selectedCategory, selectedWilaya,
    sortBy, openNowOnly, mobileOnly, maxBudget, maxDuration, nearbyOnly, userCoordinates, countrySupportsWilayas,
  ]);

  const recommendations = useMemo(() => {
    return rankBarberRecommendations(barbers.filter(isDisplayableBarber), {
      city: selectedWilaya || preferredCity,
      category: selectedCategory as ServiceCategory | null,
      bookings,
    }).slice(0, 3);
  }, [barbers, bookings, preferredCity, selectedCategory, selectedWilaya]);

  const toggleTag = (tag: BarberTag) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const applyQuickFilter = (id: QuickFilterId) => {
    switch (id) {
      case 'openNow':
        setOpenNowOnly(v => !v);
        break;
      case 'nearby':
        if (!userCoordinates) requestLocation(false);
        setNearbyOnly(v => !v);
        setSortBy('distance');
        break;
      case 'mobile':
        setMobileOnly(v => !v);
        break;
      case 'verified':
        toggleTag('verified');
        break;
      case 'topRated':
        toggleTag('top-rated');
        break;
      case 'budget':
        setMaxBudget(v => (v === 800 ? null : 800));
        break;
      case 'quick':
        setMaxDuration(v => (v === 30 ? null : 30));
        break;
    }
  };

  const isQuickActive = (id: QuickFilterId) => {
    switch (id) {
      case 'openNow': return openNowOnly;
      case 'nearby': return nearbyOnly;
      case 'mobile': return mobileOnly;
      case 'verified': return selectedTags.includes('verified');
      case 'topRated': return selectedTags.includes('top-rated');
      case 'budget': return maxBudget === 800;
      case 'quick': return maxDuration === 30;
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCategory(null);
    persistWilaya('');
    setOnlyFavorites(false);
    setOpenNowOnly(false);
    setMobileOnly(false);
    setNearbyOnly(false);
    setMaxBudget(null);
    setMaxDuration(null);
    setSortBy('smart');
    setWilayaQuery('');
  };

  const activeFilterCount = [
    selectedWilaya,
    selectedCategory,
    onlyFavorites,
    openNowOnly,
    mobileOnly,
    nearbyOnly,
    maxBudget != null,
    maxDuration != null,
    selectedTags.length > 0,
    selectedCountry !== 'DZ',
  ].filter(Boolean).length;

  const showSkeletons = isLoading.barbers && barbers.length === 0;
  const chipLabel = (chip: (typeof QUICK_FILTER_CHIPS)[number]) =>
    lang === 'fr' ? chip.labelFr : lang === 'en' ? chip.labelEn : chip.labelAr;

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 backdrop-blur-lg" style={{ backgroundColor: `${themeConfig.colors.background}ee` }}>
        <div
          ref={collapsibleRef}
          className="px-4 pt-3 overflow-hidden will-change-transform"
          style={{
            transform: `translateY(-${hiddenHeaderPx}px)`,
            marginBottom: `-${hiddenHeaderPx}px`,
          }}
        >
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
              type="button"
              onClick={() => requestLocation(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{ backgroundColor: themeConfig.colors.success + '12', borderColor: themeConfig.colors.success + '40', color: themeConfig.colors.success }}
              title={tx('useMyLocation')}
            >
              <Crosshair size={14} />
              <span className="hidden sm:inline">{tx('useMyLocation')}</span>
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{ backgroundColor: themeConfig.colors.primary + '12', borderColor: themeConfig.colors.primary + '40', color: themeConfig.colors.primary }}
            >
              <ShoppingBag size={14} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{
                backgroundColor: showFilters || activeFilterCount ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: showFilters || activeFilterCount ? '#fff' : themeConfig.colors.text,
                borderColor: themeConfig.colors.border,
              }}
            >
              <SlidersHorizontal size={16} />
              <span>{tx('filters')}</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: themeConfig.colors.textMuted }} />
          <input
            type="search"
            placeholder={tx('searchPlaceholder')}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            className="w-full h-11 pr-10 pl-10 text-sm outline-none"
            style={{
              backgroundColor: themeConfig.colors.surface,
              color: themeConfig.colors.text,
              borderRadius: themeConfig.borderRadius,
              border: `1.5px solid ${searchQuery ? themeConfig.colors.primary : themeConfig.colors.border}`,
            }}
            aria-label={tx('search')}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2" aria-label="مسح">
              <X size={16} style={{ color: themeConfig.colors.textMuted }} />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-40 left-0 right-0 mt-1 rounded-xl border overflow-hidden shadow-lg" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  className="w-full text-right px-3 py-2.5 text-xs border-b last:border-0"
                  style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setSearchQuery(s); setShowSuggestions(false); }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {!countrySupportsWilayas && (
          <p className="text-[10px] mb-2 px-1" style={{ color: themeConfig.colors.warning }}>{tx('countrySoon')}</p>
        )}

        <button
          type="button"
          onClick={() => {
            if (!isLoggedIn) {
              navigate('login', { redirectTab: 'appointments' });
              return;
            }
            setActiveTab('appointments');
          }}
          className="w-full mb-1 flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-right"
          style={{
            background: `linear-gradient(135deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
            color: '#fff',
            boxShadow: `0 8px 24px ${themeConfig.colors.primary}33`,
          }}
        >
          <span className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center"><CalendarDays size={22} /></span>
            <span>
              <span className="block text-base font-black leading-tight">{tx('appointments')}</span>
              <span className="block text-[11px] opacity-90 mt-0.5">{tx('appointmentsDescription')}</span>
            </span>
          </span>
          <ChevronLeft size={20} className="opacity-90" />
        </button>
        </div>

        <div className="px-4 pb-3">
        {/* Country row hidden for Algeria-only launch — wilaya chip stays in filters */}
        {!FEATURE_FLAGS.algeriaOnlyDiscovery && (
        <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide pb-0.5">
          {DISCOVERY_COUNTRIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => persistCountry(c.code)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border"
              style={{
                backgroundColor: selectedCountry === c.code ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: selectedCountry === c.code ? '#fff' : themeConfig.colors.textMuted,
                borderColor: selectedCountry === c.code ? themeConfig.colors.primary : themeConfig.colors.border,
              }}
            >
              {lang === 'fr' ? c.nameFr : lang === 'en' ? c.nameEn : c.nameAr}
            </button>
          ))}
        </div>
        )}

        {selectedWilaya && (
          <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide pb-0.5">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1" style={{ backgroundColor: themeConfig.colors.info + '14', color: themeConfig.colors.info }}>
              <MapPin size={11} /> {selectedWilaya}
              <button type="button" aria-label="مسح الولاية" onClick={() => persistWilaya('')}><X size={12} /></button>
            </span>
          </div>
        )}

        {/* Quick filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                navigate('login', { redirectScreen: 'home', redirectTab: 'booking' });
                return;
              }
              setOnlyFavorites(v => !v);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border"
            style={{
              backgroundColor: onlyFavorites ? '#EF444420' : themeConfig.colors.surface,
              color: onlyFavorites ? '#EF4444' : themeConfig.colors.textMuted,
              borderColor: onlyFavorites ? '#EF4444' : themeConfig.colors.border,
            }}
          >
            <Heart size={12} className={onlyFavorites ? 'fill-current' : ''} /> المفضلة
          </button>
          {QUICK_FILTER_CHIPS.map(chip => {
            const active = isQuickActive(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => applyQuickFilter(chip.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border"
                style={{
                  backgroundColor: active ? themeConfig.colors.primary + '18' : themeConfig.colors.surface,
                  color: active ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                  borderColor: active ? themeConfig.colors.primary : themeConfig.colors.border,
                }}
              >
                {chipLabel(chip)}
              </button>
            );
          })}
          {barberTags.slice(0, 8).map(tag => {
            const isSelected = selectedTags.includes(tag.key as BarberTag);
            const Icon = tagIcons[tag.key] || Zap;
            return (
              <button
                key={tag.key}
                type="button"
                onClick={() => toggleTag(tag.key as BarberTag)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border"
                style={{
                  backgroundColor: isSelected ? tag.color + '20' : themeConfig.colors.surface,
                  color: isSelected ? tag.color : themeConfig.colors.textMuted,
                  borderColor: isSelected ? tag.color : themeConfig.colors.border,
                }}
              >
                <Icon size={12} />
                {tag.label}
              </button>
            );
          })}
        </div>

        {showFilters && (
          <div className="mt-3 p-3 rounded-xl border space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{tx('activeFilters')}{activeFilterCount ? ` (${activeFilterCount})` : ''}</p>
              <button type="button" onClick={clearAllFilters} className="text-[11px] font-bold" style={{ color: themeConfig.colors.error }}>{tx('clearAll')}</button>
            </div>

            {countrySupportsWilayas && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: themeConfig.colors.textMuted }}>{tx('allWilayas')}</p>
                <input
                  type="search"
                  value={wilayaQuery}
                  onChange={e => setWilayaQuery(e.target.value)}
                  placeholder={tx('searchWilaya')}
                  className="w-full h-9 mb-2 px-3 rounded-lg text-xs outline-none border"
                  style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                />
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-h-28 flex-wrap">
                  <button
                    type="button"
                    onClick={() => persistWilaya('')}
                    className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap"
                    style={{ backgroundColor: !selectedWilaya ? themeConfig.colors.primary : themeConfig.colors.background, color: !selectedWilaya ? '#fff' : themeConfig.colors.textMuted }}
                  >
                    {tx('allWilayas')}
                  </button>
                  {wilayaOptions.map(w => {
                    const label = wilayaLabel(w, lang);
                    const active = Boolean(selectedWilaya && wilayaLabelsMatch(selectedWilaya, w.nameAr));
                    return (
                      <button
                        key={w.code}
                        type="button"
                        onClick={() => persistWilaya(w.nameAr)}
                        className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap"
                        style={{
                          backgroundColor: active ? themeConfig.colors.primary : themeConfig.colors.background,
                          color: active ? '#fff' : themeConfig.colors.textMuted,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium mb-2" style={{ color: themeConfig.colors.textMuted }}>نوع الخدمة</p>
              <div className="flex gap-2 flex-wrap">
                {serviceCategories.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{
                      backgroundColor: selectedCategory === cat.key ? themeConfig.colors.primary + '20' : themeConfig.colors.background,
                      color: selectedCategory === cat.key ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                      borderColor: selectedCategory === cat.key ? themeConfig.colors.primary : themeConfig.colors.border,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                ميزانية أقصى (دج)
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={maxBudget ?? ''}
                  onChange={e => setMaxBudget(e.target.value === '' ? null : Number(e.target.value))}
                  className="mt-1 w-full h-9 px-2 rounded-lg text-xs border outline-none"
                  style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                  placeholder="مثلاً 1000"
                />
              </label>
              <label className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                مدة أقصى (د)
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={maxDuration ?? ''}
                  onChange={e => setMaxDuration(e.target.value === '' ? null : Number(e.target.value))}
                  className="mt-1 w-full h-9 px-2 rounded-lg text-xs border outline-none"
                  style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                  placeholder="مثلاً 45"
                />
              </label>
            </div>

            <div>
              <p className="text-xs font-medium mb-2" style={{ color: themeConfig.colors.textMuted }}>الترتيب حسب</p>
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'smart' as const, label: tx('smartSort'), icon: Sparkles },
                  { key: 'rating' as const, label: 'التقييم', icon: Star },
                  { key: 'distance' as const, label: 'المسافة', icon: MapPin },
                  { key: 'price' as const, label: 'السعر', icon: Filter },
                  { key: 'newest' as const, label: 'الأحدث', icon: Clock },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.key);
                      if (opt.key === 'distance' && !userCoordinates) requestLocation(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{
                      backgroundColor: sortBy === opt.key ? themeConfig.colors.accent + '20' : themeConfig.colors.background,
                      color: sortBy === opt.key ? themeConfig.colors.accent : themeConfig.colors.textMuted,
                      borderColor: sortBy === opt.key ? themeConfig.colors.accent : themeConfig.colors.border,
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
        {locationMessage && (
          <p role="status" className="text-[10px] mt-2 text-center" style={{ color: themeConfig.colors.textMuted }}>{locationMessage}</p>
        )}
        <p className="text-[10px] mt-1 text-center" style={{ color: themeConfig.colors.textMuted }}>
          {filteredBarbers.length} نتيجة
          {selectedWilaya ? ` · ${selectedWilaya}` : ''}
          {userCoordinates ? ' · GPS' : ''}
        </p>
        </div>
      </div>

      {isLoggedIn && !searchQuery && selectedTags.length === 0 && recommendations.length > 0 && (
        <section className="px-4 mt-1" aria-labelledby="recommended-title">
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

      <div className="px-4 space-y-3 mt-2">
        {showSkeletons ? (
          <><SkeletonBarberCard /><SkeletonBarberCard /><SkeletonBarberCard /></>
        ) : (
          filteredBarbers.map((barber, index) => (
            <motion.div
              key={barber.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35 }}
              className="rounded-2xl overflow-hidden border"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <div className="relative h-32 overflow-hidden cursor-pointer" role="button" tabIndex={0}
                onClick={() => openBarberDetail(barber.id, 'discovery_cover')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openBarberDetail(barber.id, 'discovery_cover'); }}>
                <img src={barber.coverImage} alt={barber.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap pointer-events-none">
                  {isBarberOpenNow(barber.workingHours) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-green-500">مفتوح</span>
                  )}
                  {barber.isMobile && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-blue-500"><Car size={10} /> متنقل</span>
                  )}
                  {barber.isVerified && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-sky-500"><BadgeCheck size={10} /> موثق</span>
                  )}
                </div>
                <div className="absolute bottom-2 right-2 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>{barber.priceRange}</span>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openBarberDetail(barber.id, 'discovery_avatar')}
                      className="flex items-center gap-2 min-w-0 text-right"
                    >
                      <img src={barber.avatar} alt={barber.name} loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover border-2 shrink-0" style={{ borderColor: themeConfig.colors.primary + '40' }} />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate" style={{ color: themeConfig.colors.text }}>{barber.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star size={12} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium" style={{ color: themeConfig.colors.text }}>{barber.rating}</span>
                          <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>({barber.reviewCount})</span>
                        </div>
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLoggedIn) {
                        navigate('login', { redirectScreen: 'home', redirectTab: 'booking' });
                        return;
                      }
                      void toggleFollow(barber.id);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{
                      backgroundColor: barber.isFollowing ? themeConfig.colors.primary + '15' : themeConfig.colors.primary,
                      color: barber.isFollowing ? themeConfig.colors.primary : '#fff',
                    }}
                  >
                    {barber.isFollowing ? tx('following') : tx('follow')}
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin size={12} style={{ color: themeConfig.colors.textMuted }} />
                    <span className="text-[11px] truncate" style={{ color: themeConfig.colors.textMuted }}>{formatBarberLocation(barber)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInMaps(`${barber.location}, ${barber.wilaya}`, barber.isMobile, selectedCountry)}
                    className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}
                  >
                    <Navigation size={9} /> {distances.get(barber.id) != null ? `${distances.get(barber.id)?.toFixed(1)} كم` : barber.distance}
                  </button>
                </div>

                <div className="flex gap-1 mt-2 flex-wrap">
                  {barber.tags.map(tag => {
                    const tagInfo = barberTags.find(t => t.key === tag);
                    if (!tagInfo) return null;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                        style={{ backgroundColor: tagInfo.color + '15', color: tagInfo.color }}
                      >
                        {tagInfo.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 space-y-1">
                  {barber.services.slice(0, 2).map(svc => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => openBarberBooking(barber.id, svc.id)}
                      className="w-full flex items-center justify-between py-1 text-right rounded-lg px-1 -mx-1 active:bg-black/5"
                    >
                      <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}><Clock size={10} className="inline ml-0.5" />{svc.duration}د</span>
                        <span className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>{money(svc.price)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => openBarberBooking(barber.id)}
                    className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: themeConfig.colors.primary }}
                  >
                    {tx('bookNow')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openInMaps(`${barber.location}, ${barber.wilaya}`, barber.isMobile, selectedCountry)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl border"
                    style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.success }}
                    title="خريطة"
                  >
                    <Globe size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openBarberDetail(barber.id, 'discovery_chevron')}
                    className="h-10 w-10 flex items-center justify-center rounded-xl border"
                    style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {!showSkeletons && filteredBarbers.length === 0 && (
        <EmptyState
          icon={Search}
          title={tx('noResults')}
          description={countrySupportsWilayas ? 'جرّب ولاية أخرى أو امسح الفلاتر' : tx('countrySoon')}
          actionLabel={tx('resetFilters')}
          onAction={clearAllFilters}
          themeConfig={themeConfig}
        />
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
