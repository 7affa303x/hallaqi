import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Star, MapPin, Clock, Car, BadgeCheck,
  Scissors, Heart, Share2, Phone, MessageSquare,
  Calendar, Navigation, Globe, AlertTriangle
} from 'lucide-react';
import {
  getProfessionalById,
  getProfessionalSchedules,
  getProfessionalExceptions,
  getProfessionalMetrics,
  getPortfolioItems,
  getOrCreateConversation,
  reportProfessional,
} from '@/supabase/database';
import type { PortfolioItem } from '@/types/supabase-aliases';
import type { Barber } from '@/types';
import BrandLogo from '@/components/BrandLogo';
import { useI18n } from '@/hooks/useI18n';

// Saturday=0, Sunday=1, Monday=2, Tuesday=3, Wednesday=4, Thursday=5, Friday=6
const daysArSchedule = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const daysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Open Google Maps with directions */
function openGoogleMaps(location: string, wilaya: string) {
  const query = encodeURIComponent(`${location}, ${wilaya}, Algeria`);
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
}

/** Open location in Google Maps search */
function viewOnMap(location: string, wilaya: string) {
  const query = encodeURIComponent(`${location}, ${wilaya}, Algeria`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
}

export default function BarberDetailPage() {
  const { themeConfig, screenParams, navigate, goBack, barbers, toggleFollow } = useApp();
  const { appUser, isAuthenticated } = useAuth();
  const { money } = useI18n();
  const [activeSection, setActiveSection] = useState<'services' | 'reviews' | 'portfolio' | 'hours'>('services');
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [likedImages, setLikedImages] = useState<Set<number>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [availabilitySchedule, setAvailabilitySchedule] = useState<Array<{ day_of_week: number; start_time: string; end_time: string; is_active: boolean }>>([]);
  const [availabilityExceptions, setAvailabilityExceptions] = useState<Array<{ date: string; type: string; reason: string }>>([]);
  const [professionalMetrics, setProfessionalMetrics] = useState({
    average_response_minutes: 0,
    acceptance_rate: 0,
    completed_bookings: 0,
  });

  const listedBarber = barbers.find(b => b.id === screenParams?.barberId);
  const [barber, setBarber] = useState<Barber | undefined>(listedBarber);
  const [loadingDetails, setLoadingDetails] = useState(!listedBarber && Boolean(screenParams?.barberId));

  useEffect(() => {
    const barberId = screenParams?.barberId;
    if (!barberId) {
      setLoadingDetails(false);
      return;
    }
    if (listedBarber) setBarber(listedBarber);
    setLoadingDetails(true);
    void getProfessionalById(barberId)
      .then(details => {
        if (details) setBarber(details);
      })
      .finally(() => setLoadingDetails(false));
    const fetchPortfolio = async () => {
      setLoadingPortfolio(true);
      try {
        const items = await getPortfolioItems(barberId);
        setPortfolioItems(items);
      } catch (err) {
        console.error('Failed to fetch portfolio items:', err);
      } finally {
        setLoadingPortfolio(false);
      }
    };
    fetchPortfolio();

    const fetchAvailability = async () => {
      try {
        const [schedData, excData] = await Promise.all([
          getProfessionalSchedules(barberId),
          getProfessionalExceptions(barberId),
        ]);
        setAvailabilitySchedule(schedData.map(s => ({
          day_of_week: s.day_of_week as number,
          start_time: s.start_time as string,
          end_time: s.end_time as string,
          is_active: s.is_active as boolean,
        })));
        setAvailabilityExceptions(excData.map(e => ({
          date: e.date as string,
          type: e.type as string,
          reason: e.reason as string,
        })));
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      }
    };
    fetchAvailability();
    void getProfessionalMetrics(barberId).then(metrics => setProfessionalMetrics({
      average_response_minutes: Number(metrics.average_response_minutes || 0),
      acceptance_rate: Number(metrics.acceptance_rate || 0),
      completed_bookings: Number(metrics.completed_bookings || 0),
    })).catch(() => {});
  }, [listedBarber, screenParams?.barberId]);

  useEffect(() => {
    if (!barber) return;
    const previousTitle = document.title;
    document.title = `${barber.name} — حجز حلاق عبر Hallaqi`;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    if (description) description.content = `احجز خدمات ${barber.name} في ${barber.wilaya}. التقييم ${barber.rating} من 5.`;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'hallaqi-local-business';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      name: barber.name,
      url: `${window.location.origin}/barber/${barber.id}`,
      image: barber.coverImage,
      telephone: barber.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: barber.location,
        addressLocality: barber.wilaya,
        addressCountry: 'DZ',
      },
      aggregateRating: barber.reviewCount > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: barber.rating,
        reviewCount: barber.reviewCount,
      } : undefined,
      geo: barber.coordinates ? {
        '@type': 'GeoCoordinates',
        latitude: barber.coordinates.lat,
        longitude: barber.coordinates.lng,
      } : undefined,
      priceRange: barber.priceRange,
    });
    document.head.appendChild(script);
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
      script.remove();
    };
  }, [barber]);

  if (loadingDetails && !barber) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: themeConfig.colors.background }}>
        <BrandLogo variant="icon" className="w-16 h-16 animate-pulse opacity-70" />
        <p className="text-sm font-medium" style={{ color: themeConfig.colors.textMuted }}>جاري تحميل ملف الحلاق...</p>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
          <BrandLogo variant="icon" className="w-16 h-16 mb-4 opacity-60" />
        <p className="text-sm font-medium" style={{ color: themeConfig.colors.textMuted }}>المختص غير موجود أو غير متاح حالياً</p>
        <button onClick={goBack} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>رجوع</button>
      </div>
    );
  }

  const toggleImageLike = (idx: number) => {
    setLikedImages(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  };

  const handleReport = async () => {
    if (!reportReason.trim() || !barber) return;
    if (!appUser) {
      setShowReport(false);
      navigate('login', { redirectScreen: 'barber-detail', barberId: barber.id });
      return;
    }
    try {
      await reportProfessional({
        reporterId: appUser.id,
        professionalId: barber.id,
        reason: reportReason.trim(),
      });
      setReportSent(true);
      setTimeout(() => { setShowReport(false); setReportSent(false); setReportReason(''); }, 1500);
    } catch {
      setReportSent(false);
    }
  };

  const shareBarber = async () => {
    const url = `${window.location.origin}/barber/${barber.id}`;
    try {
      if (navigator.share) await navigator.share({ title: barber.name, text: `احجز مع ${barber.name} عبر Hallaqi`, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // The native share sheet may be dismissed by the user.
    }
  };

  const startChat = async () => {
    if (!appUser) {
      navigate('login', { redirectScreen: 'barber-detail', barberId: barber.id });
      return;
    }
    try {
      const conversationId = await getOrCreateConversation(appUser.id, barber.id);
      navigate('chat-room', {
        conversationId,
        participantId: barber.id,
        participantName: barber.name,
        participantAvatar: barber.avatar,
      });
    } catch {
      // Chat errors are surfaced by the destination flow on retry.
    }
  };

  const bookNow = (serviceId?: string) => {
    if (!isAuthenticated) {
      navigate('login', { redirectScreen: 'booking-flow', barberId: barber.id, serviceIds: serviceId });
      return;
    }
    navigate('booking-flow', { barberId: barber.id, serviceIds: serviceId });
  };

  const mapSrc = barber.coordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${barber.coordinates.lng - 0.03}%2C${barber.coordinates.lat - 0.02}%2C${barber.coordinates.lng + 0.03}%2C${barber.coordinates.lat + 0.02}&layer=mapnik&marker=${barber.coordinates.lat}%2C${barber.coordinates.lng}`
    : null;

  return (
    <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="pb-20 min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>

      {/* === COVER === */}
      <div className="relative h-56">
        <img src={barber.coverImage} alt={barber.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4">
          <button onClick={goBack} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowReport(true)} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <AlertTriangle size={18} className="text-white" />
            </button>
            <button onClick={() => void shareBarber()} aria-label="مشاركة ملف الحلاق" className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Share2 size={18} className="text-white" />
            </button>
            <button onClick={() => {
              if (!isAuthenticated) {
                navigate('login', { redirectScreen: 'barber-detail', barberId: barber.id });
                return;
              }
              void toggleFollow(barber.id);
            }} aria-label={barber.isFollowing ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Heart size={18} className={barber.isFollowing ? 'fill-red-500 text-red-500' : 'text-white'} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 right-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>{barber.priceRange}</span>
        </div>
      </div>

      {/* === PROFILE INFO === */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="flex items-end gap-3">
          <img src={barber.avatar} alt={barber.name}
            className="w-20 h-20 rounded-2xl object-cover border-4"
            style={{ borderColor: themeConfig.colors.background }} />
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{barber.name}</h1>
              {barber.isVerified && <BadgeCheck size={18} className="text-sky-400" />}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold text-white">{barber.rating}</span>
              <span className="text-xs text-white/70">({barber.reviewCount} تقييم)</span>
            </div>
          </div>
        </div>
      </div>

      {/* === STATS === */}
      <div className="px-4 mt-4">
        <div className="flex gap-3">
          {[
            { icon: Clock, label: `${barber.yearsOfExperience} سنة`, sub: 'خبرة' },
            { icon: Clock, label: professionalMetrics.average_response_minutes > 0 ? `${professionalMetrics.average_response_minutes} د` : 'جديد', sub: 'متوسط الرد' },
            { icon: barber.isMobile ? Car : Scissors, label: barber.isMobile ? 'متنقل' : 'في الصالون', sub: 'نوع الخدمة' },
            { icon: Star, label: professionalMetrics.acceptance_rate > 0 ? `${professionalMetrics.acceptance_rate}%` : `${barber.rating}`, sub: professionalMetrics.acceptance_rate > 0 ? 'نسبة القبول' : 'التقييم' },
          ].map((stat, i) => (
            <div key={i} className="flex-1 rounded-xl p-2.5 text-center border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <stat.icon size={16} style={{ color: themeConfig.colors.primary }} className="mx-auto mb-1" />
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{stat.label}</p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* === TAGS === */}
      <div className="px-4 mt-3 flex gap-1.5 flex-wrap">
        {barber.tags.map(tag => (
          <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: themeConfig.colors.primary + '12', color: themeConfig.colors.primary }}>
            {tag === 'active' ? 'متفاعل' : tag === 'old-school' ? 'تقليدي' : tag === 'scissors-user' ? 'يستخدم المقص' :
             tag === 'mobile' ? 'متنقل' : tag === 'verified' ? 'موثق' : tag === 'trending' ? 'رائج' :
             tag === 'new' ? 'جديد' : tag === 'top-rated' ? 'الأعلى تقييماً' : tag === 'quick' ? 'سريع' : 'فاخر'}
          </span>
        ))}
        {professionalMetrics.completed_bookings > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: themeConfig.colors.success + '12', color: themeConfig.colors.success }}>
            {professionalMetrics.completed_bookings} موعد مكتمل
          </span>
        )}
      </div>

      {/* === BIO === */}
      <div className="px-4 mt-4">
        <p className="text-sm leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>{barber.bio}</p>
        {barber.phone && (
          <a
            href={`tel:${barber.phone}`}
            className="mt-3 inline-flex items-center gap-2 text-xs font-bold"
            style={{ color: themeConfig.colors.primary }}
          >
            <Phone size={14} />
            اتصل: {barber.phone}
          </a>
        )}
      </div>

      {/* === QUICK ACTIONS === */}
      <div className="px-4 mt-4 flex gap-2">
        <button onClick={() => bookNow()}
          className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: themeConfig.colors.primary }}>
          <Calendar size={18} /> احجز موعداً
        </button>
        <button onClick={() => setShowQR(true)}
          className="h-12 w-12 rounded-xl border flex items-center justify-center" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
          <BrandLogo className="w-6 h-6" />
        </button>
        <button onClick={() => barber.phone && (window.location.href = `tel:${barber.phone}`)} disabled={!barber.phone} aria-label="الاتصال بالحلاق" className="h-12 w-12 rounded-xl border flex items-center justify-center disabled:opacity-40" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
          <Phone size={18} />
        </button>
        <button onClick={() => void startChat()} aria-label="مراسلة الحلاق" className="h-12 w-12 rounded-xl border flex items-center justify-center" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
          <MessageSquare size={18} />
        </button>
      </div>

      {/* === QR MODAL === */}
      {showQR && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowQR(false)}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="p-6 rounded-3xl bg-white max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <BrandLogo className="w-7 h-7" />
              <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>HALLAQI</span>
            </div>
            <div className="p-3 rounded-2xl inline-block" style={{ backgroundColor: themeConfig.colors.background }}>
              <QRCodeSVG value={`https://www.hallaqi.app/barber/${barber.id}`} size={180} bgColor="#FFFFFF" fgColor={themeConfig.colors.primary} level="H"
                imageSettings={{ src: '/logo-symbol.svg', height: 36, width: 36, excavate: true }} />
            </div>
            <h3 className="text-base font-bold mt-3" style={{ color: themeConfig.colors.text }}>{barber.name}</h3>
            <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>امسح للوصول للبروفايل</p>
            <button onClick={() => setShowQR(false)} className="mt-4 w-full h-10 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>إغلاق</button>
          </motion.div>
        </motion.div>
      )}

      {/* === REPORT MODAL === */}
      {showReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowReport(false)}>
          <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="p-5 rounded-2xl bg-white max-w-sm w-full" onClick={e => e.stopPropagation()}>
            {!reportSent ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={20} style={{ color: themeConfig.colors.error }} />
                  <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإبلاغ عن {barber.name}</h3>
                </div>
                <p className="text-xs mb-3" style={{ color: themeConfig.colors.textMuted }}>اختر سبب الإبلاغ:</p>
                <div className="space-y-2 mb-4">
                  {['محتوى غير لائق', 'معلومات مضللة', 'سلوك غير مهني', 'سبب آخر'].map(reason => (
                    <button key={reason} onClick={() => setReportReason(reason)}
                      className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                      style={{ backgroundColor: reportReason === reason ? themeConfig.colors.error + '10' : themeConfig.colors.background, borderColor: reportReason === reason ? themeConfig.colors.error : themeConfig.colors.border, color: reportReason === reason ? themeConfig.colors.error : themeConfig.colors.text }}>
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowReport(false)} className="flex-1 h-10 rounded-xl text-xs font-bold border" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>إلغاء</button>
                  <button onClick={handleReport} disabled={!reportReason}
                    className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: themeConfig.colors.error }}>إرسال</button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.success + '15' }}>
                  <BadgeCheck size={24} style={{ color: themeConfig.colors.success }} />
                </div>
                <p className="text-sm font-bold" style={{ color: themeConfig.colors.success }}>تم إرسال الإبلاغ</p>
                <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>سنراجع البلاغ في أقرب وقت</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* === MAP SECTION === */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الموقع على الخريطة</h3>
          <span className="text-[10px] flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
            <Navigation size={10} /> {barber.distance}
          </span>
        </div>
        <div className="relative rounded-2xl overflow-hidden border aspect-[2/1] flex items-center justify-center" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          {mapSrc ? (
            <iframe title={`خريطة ${barber.name}`} width="100%" height="100%" style={{ border: 0, minHeight: '160px' }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={mapSrc} />
          ) : (
            <div className="text-center px-4">
              <MapPin size={28} className="mx-auto mb-2" style={{ color: themeConfig.colors.primary }} />
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>الإحداثيات غير مضافة بعد؛ استخدم زر الخريطة للبحث بالعنوان.</p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-white/90 backdrop-blur text-[10px] font-medium shadow-sm" style={{ color: themeConfig.colors.text }}>
            <MapPin size={10} className="inline ml-1" />{barber.location}, {barber.wilaya}
          </div>
        </div>
        {/* Map Action Buttons */}
        <div className="flex gap-2 mt-2">
          <button onClick={() => viewOnMap(barber.location, barber.wilaya)}
            className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border"
            style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.primary, backgroundColor: themeConfig.colors.surface }}>
            <Globe size={14} /> عرض على الخريطة
          </button>
          <button onClick={() => openGoogleMaps(barber.location, barber.wilaya)}
            className="flex-1 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
            style={{ backgroundColor: themeConfig.colors.success }}>
            <Navigation size={14} /> الاتجاهات (Google Maps)
          </button>
        </div>
      </div>

      {/* === SECTION TABS === */}
      <div className="px-4 mt-6 flex gap-1 p-1 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface }}>
        {[
          { key: 'services' as const, label: 'الخدمات' },
          { key: 'reviews' as const, label: 'التقييمات' },
          { key: 'portfolio' as const, label: 'الأعمال' },
          { key: 'hours' as const, label: 'المواعيد' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ backgroundColor: activeSection === tab.key ? themeConfig.colors.primary : 'transparent', color: activeSection === tab.key ? '#fff' : themeConfig.colors.textMuted }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* === SECTION CONTENT === */}
      <AnimatePresence mode="wait">
        {activeSection === 'services' && (
          <motion.div key="services" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="px-4 mt-3 space-y-2">
            {barber.services.map(svc => (
              <button
                key={svc.id}
                type="button"
                onClick={() => bookNow(svc.id)}
                className="w-full p-3 rounded-xl border flex items-center justify-between text-right active:scale-[0.99] transition-transform"
                style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{svc.name}</p>
                  {svc.description && <p className="text-[11px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{svc.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}><Clock size={10} /> {svc.duration} دقيقة</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{money(svc.price)}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {activeSection === 'reviews' && (
          <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="px-4 mt-3 space-y-3">
            {barber.reviews && barber.reviews.length > 0 ? barber.reviews.map(review => (
              <div key={review.id} className="p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <img src={review.authorAvatar} alt={review.authorName} className="w-8 h-8 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{review.authorName}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={10} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{review.date}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>{review.comment}</p>
                {review.reply && (
                  <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: themeConfig.colors.background }}>
                    <p className="text-[10px] font-bold" style={{ color: themeConfig.colors.primary }}>رد {barber.name}:</p>
                    <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{review.reply}</p>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-8">
                <Star size={40} style={{ color: themeConfig.colors.textMuted + '30' }} className="mx-auto" />
                <p className="text-sm mt-2" style={{ color: themeConfig.colors.textMuted }}>لا توجد تقييمات بعد</p>
              </div>
            )}
          </motion.div>
        )}

        {activeSection === 'portfolio' && (
          <motion.div key="portfolio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="px-4 mt-3">
            {loadingPortfolio ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
              </div>
            ) : portfolioItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {portfolioItems.map((item, idx) => (
                  <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square">
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" controls={false} muted preload="metadata" />
                    ) : (
                      <img src={item.url} alt={item.caption || `عمل ${idx + 1}`} className="w-full h-full object-cover" />
                    )}
                    <button onClick={() => toggleImageLike(idx)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
                      <Heart size={14} className={likedImages.has(idx) ? 'text-red-500 fill-red-500' : 'text-white'} />
                    </button>
                    {/* Type badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-white/20 backdrop-blur text-white">
                      {item.type === 'video' ? 'فيديو' : 'صورة'}
                    </div>
                  </div>
                ))}
              </div>
            ) : barber.portfolio.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {barber.portfolio.map((img, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden aspect-square">
                    <img src={img} alt={`عمل ${idx + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => toggleImageLike(idx)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
                      <Heart size={14} className={likedImages.has(idx) ? 'text-red-500 fill-red-500' : 'text-white'} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart size={40} style={{ color: themeConfig.colors.textMuted + '30' }} className="mx-auto" />
                <p className="text-sm mt-2" style={{ color: themeConfig.colors.textMuted }}>لا توجد صور معرض</p>
              </div>
            )}
          </motion.div>
        )}

        {activeSection === 'hours' && (
          <motion.div key="hours" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="px-4 mt-3 space-y-1">
            {availabilitySchedule.length > 0 ? (
              // Show from availability_schedules table
              daysArSchedule.map((dayLabel, idx) => {
                const schedule = availabilitySchedule.find(s => s.day_of_week === idx);
                const isToday = new Date().getDay() === (idx === 0 ? 6 : idx === 1 ? 0 : idx);
                return (
                  <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                    style={{ backgroundColor: isToday ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, border: isToday ? `1px solid ${themeConfig.colors.primary}20` : 'none' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{dayLabel}</span>
                      {isToday && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>اليوم</span>}
                    </div>
                    {schedule?.is_active
                      ? <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{schedule.start_time} - {schedule.end_time}</span>
                      : <span className="text-xs font-bold" style={{ color: themeConfig.colors.error }}>مغلق</span>
                    }
                  </div>
                );
              })
            ) : (
              // Fallback to old workingHours field
              daysEn.map((day, idx) => {
                const hours = barber.workingHours[day];
                const isToday = idx === new Date().getDay();
                return (
                  <div key={day} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                    style={{ backgroundColor: isToday ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, border: isToday ? `1px solid ${themeConfig.colors.primary}20` : 'none' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{daysAr[idx]}</span>
                      {isToday && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>اليوم</span>}
                    </div>
                    {hours?.isOpen
                      ? <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{hours.open} - {hours.close}</span>
                      : <span className="text-xs font-bold" style={{ color: themeConfig.colors.error }}>مغلق</span>
                    }
                  </div>
                );
              })
            )}
            {/* Upcoming exceptions */}
            {availabilityExceptions.filter(e => new Date(e.date) >= new Date()).length > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: themeConfig.colors.textMuted }}>أيام الإغلاق القادمة</p>
                {availabilityExceptions.filter(e => new Date(e.date) >= new Date()).slice(0, 5).map((exc, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-[10px]" style={{ color: themeConfig.colors.text }}>
                      {new Date(exc.date).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>
                      {exc.reason || exc.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}