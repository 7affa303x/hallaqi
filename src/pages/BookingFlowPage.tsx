import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Clock, MapPin, Car, CreditCard,
  Wallet, Banknote, Calendar, X, AlertTriangle
} from 'lucide-react';
import { createBooking, getBarberBookings, checkSlotAgainstBookings, filterSlotsByWorkingHours } from '@/supabase/database';
import type { Service } from '@/types';

const ALL_TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

/** Map JS Date getDay() (0=Sun) to workingHours day key */
const JS_DAY_TO_KEY: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

/** Generate time slots between start and end times */
function generateTimeSlotsForRange(start: string, end: string): string[] {
  const slots: string[] = [];
  for (const slot of ALL_TIME_SLOTS) {
    if (slot >= start && slot < end) {
      slots.push(slot);
    }
  }
  return slots;
}

const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      day: d.toLocaleDateString('ar-DZ', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('ar-DZ', { month: 'short' }),
      full: d.toISOString().split('T')[0],
    });
  }
  return dates;
};

export default function BookingFlowPage() {
  const { themeConfig, screenParams, barbers, addBooking, navigate, goBack, refreshData } = useApp();
  const { appUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'ccp' | 'baridi-mob' | 'cash'>('cash');
  const [note, setNote] = useState('');
  const [isMobileService, setIsMobileService] = useState(false);
  const [address, setAddress] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [existingBookings, setExistingBookings] = useState<Array<{ time: string; services: Array<{ duration?: number }> }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const barber = barbers.find(b => b.id === screenParams?.barberId);
  const dates = generateDates();

  /** Fetch existing bookings when date changes */
  useEffect(() => {
    if (!barber?.id || !selectedDate) {
      setExistingBookings([]);
      return;
    }
    let cancelled = false;
    const fetch = async () => {
      setIsLoadingSlots(true);
      try {
        const bookings = await getBarberBookings(barber.id, selectedDate);
        if (!cancelled) setExistingBookings(bookings);
      } catch (err) {
        console.error('Failed to fetch existing bookings:', err);
        if (!cancelled) setExistingBookings([]);
      } finally {
        if (!cancelled) setIsLoadingSlots(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [barber?.id, selectedDate]);

  /** Get working hours for a specific date */
  const getDayHours = useCallback((dateStr: string): { open: string; close: string } | null => {
    if (!barber?.workingHours) return null;
    const jsDay = new Date(dateStr).getDay();
    const dayKey = JS_DAY_TO_KEY[jsDay];
    return (barber.workingHours as Record<string, { open: string; close: string }>)[dayKey] || null;
  }, [barber?.workingHours]);

  /** Check if a date is available (barber works that day) */
  const isDateAvailable = useCallback((dateStr: string): boolean => {
    const hours = getDayHours(dateStr);
    if (!hours) return false;
    if (hours.open === 'closed' || hours.close === 'closed') return false;
    return true;
  }, [getDayHours]);

  /** Get available time slots for a specific date */
  const getAvailableTimeSlots = useCallback((dateStr: string): string[] => {
    const hours = getDayHours(dateStr);
    if (!hours || hours.open === 'closed' || hours.close === 'closed') return [];

    // 1. Start with slots within working hours
    let slots = generateTimeSlotsForRange(hours.open, hours.close);

    // 2. If date is selected, filter out slots occupied by existing bookings
    if (dateStr === selectedDate && existingBookings.length > 0) {
      const selectedServicesData = barber?.services?.filter(
        (s: Service) => selectedServices.includes(s.id)
      ) || [];
      const totalDuration = selectedServicesData.reduce((sum: number, s: Service) => sum + s.duration, 0) || 30;
      slots = slots.filter(slot =>
        checkSlotAgainstBookings(slot, totalDuration, existingBookings)
      );
    }

    return slots;
  }, [getDayHours, selectedDate, existingBookings, barber?.services, selectedServices]);

  /** Memoize available time slots for selected date */
  const timeSlots = useMemo(() => {
    if (!selectedDate) return ALL_TIME_SLOTS;
    return getAvailableTimeSlots(selectedDate);
  }, [selectedDate, getAvailableTimeSlots]);

  if (!barber) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p>الحلاق غير موجود</p>
        <button onClick={goBack}>رجوع</button>
      </div>
    );
  }

  const toggleService = (svcId: string) => {
    setSelectedServices(prev =>
      prev.includes(svcId) ? prev.filter(id => id !== svcId) : [...prev, svcId]
    );
    setSelectedTime(''); // Reset time when services change (duration changes)
  };

  const selectedServicesData = barber.services.filter((s: Service) => selectedServices.includes(s.id));
  const totalPrice = selectedServicesData.reduce((sum: number, s: Service) => sum + s.price, 0);
  const totalDuration = selectedServicesData.reduce((sum: number, s: Service) => sum + s.duration, 0);

  const handleConfirm = async () => {
    if (!appUser) {
      setSaveError('يجب تسجيل الدخول لإتمام الحجز');
      return;
    }
    if (!selectedDate || !selectedTime) {
      setSaveError('يرجى اختيار التاريخ والوقت');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Validate: check slot is still available
      const available = await checkSlotAgainstBookings(
        selectedTime, totalDuration, existingBookings
      );
      if (!available) {
        setSaveError('هذا الوقت لم يعد متاحاً. يرجى اختيار وقت آخر.');
        setIsSaving(false);
        return;
      }

      // Build Supabase booking row
      const bookingRow = {
        user_id: appUser.id,
        barberId: barber.id,
        barberName: barber.name,
        barberAvatar: barber.avatar || '',
        services: selectedServicesData as unknown as Service[],
        date: selectedDate,
        time: selectedTime,
        status: 'pending' as const,
        totalPrice,
        note: note || null,
        location: isMobileService ? (address || 'المنزل') : barber.location,
        isMobileService,
        paymentMethod,
        paymentStatus: 'pending' as const,
        reviewed: false,
        address: isMobileService ? address || null : null,
      };

      const saved = await createBooking(bookingRow);

      if (saved) {
        // Add to local state for immediate UI update
        const newBooking = {
          id: (saved as Record<string, unknown>).id as string,
          barberId: barber.id,
          barberName: barber.name,
          barberAvatar: barber.avatar || '',
          services: selectedServicesData,
          date: selectedDate,
          time: selectedTime,
          status: 'pending' as const,
          totalPrice,
          note: note || undefined,
          createdAt: new Date().toISOString(),
          location: isMobileService ? (address || 'المنزل') : barber.location,
          isMobileService,
          paymentMethod,
          paymentStatus: 'pending' as const,
          reviewed: false,
          address: isMobileService ? address : undefined,
        };
        addBooking(newBooking);

        // Refresh from server to ensure consistency
        await refreshData();

        setConfirmed(true);
      }
    } catch (err) {
      console.error('Booking save failed:', err);
      setSaveError(err instanceof Error ? err.message : 'فشل حفظ الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: themeConfig.colors.background }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: themeConfig.colors.success + '20' }}
        >
          <Check size={40} style={{ color: themeConfig.colors.success }} />
        </motion.div>
        <h2 className="text-xl font-bold mb-2" style={{ color: themeConfig.colors.text }}>تم إرسال طلب الحجز!</h2>
        <p className="text-sm mb-1" style={{ color: themeConfig.colors.textMuted }}>
          {barber.name} سيرد على طلبك قريباً
        </p>
        <p className="text-xs mb-6" style={{ color: themeConfig.colors.textMuted }}>
          {selectedDate} - {selectedTime}
        </p>
        <div className="w-full max-w-xs p-4 rounded-xl border mb-6" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex justify-between mb-2">
            <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>الخدمات</span>
            <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{selectedServicesData.length}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>المدة</span>
            <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{totalDuration} دقيقة</span>
          </div>
          <div className="flex justify-between pt-2 border-t" style={{ borderColor: themeConfig.colors.border }}>
            <span className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإجمالي</span>
            <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{totalPrice} دج</span>
          </div>
        </div>
        <div className="flex gap-2 w-full max-w-xs">
          <button
            onClick={() => navigate('barber-detail', { barberId: barber.id })}
            className="flex-1 h-12 rounded-xl text-sm font-bold border"
            style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          >
            تفاصيل الحلاق
          </button>
          <button
            onClick={() => { setConfirmed(false); goBack(); }}
            className="flex-1 h-12 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            تم
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="min-h-screen pb-20"
      style={{ backgroundColor: themeConfig.colors.background }}
    >
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}
      >
        <button onClick={step > 1 ? () => setStep((prev: number) => (prev - 1) as 1 | 2 | 3) : goBack} className="w-10 h-10 rounded-xl flex items-center justify-center">
          {step > 1 ? <ArrowLeft size={22} style={{ color: themeConfig.colors.text }} /> : <X size={22} style={{ color: themeConfig.colors.text }} />}
        </button>
        <h1 className="text-base font-bold flex-1" style={{ color: themeConfig.colors.text }}>
          {step === 1 && 'اختر الخدمات'}
          {step === 2 && 'اختر الموعد'}
          {step === 3 && 'تأكيد الحجز'}
        </h1>
        <div className="flex gap-1">
          {[1, 2, 3].map(s => (
            <div key={s} className="w-6 h-1.5 rounded-full" style={{ backgroundColor: s <= step ? themeConfig.colors.primary : themeConfig.colors.border }} />
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {saveError && (
        <div className="mx-4 mt-3 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: themeConfig.colors.error + '15', border: `1px solid ${themeConfig.colors.error}30` }}>
          <AlertTriangle size={16} style={{ color: themeConfig.colors.error }} />
          <p className="text-xs flex-1" style={{ color: themeConfig.colors.error }}>{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-xs font-bold px-2" style={{ color: themeConfig.colors.error }}>×</button>
        </div>
      )}

      {/* Step 1: Services */}
      {step === 1 && (
        <div className="p-4">
          {/* Barber Info */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <img src={barber.avatar} alt={barber.name} className="w-12 h-12 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{barber.name}</p>
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{barber.location}</p>
            </div>
          </div>

          {/* Mobile Service Toggle */}
          {barber.isMobile && (
            <div className="flex items-center justify-between p-3 rounded-xl border mb-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="flex items-center gap-2">
                <Car size={18} style={{ color: themeConfig.colors.info }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>خدمة متنقلة</p>
                  <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>سيأتي الحلاق إلى عنوانك</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileService(!isMobileService)}
                className="w-12 h-7 rounded-full transition-all relative"
                style={{ backgroundColor: isMobileService ? themeConfig.colors.primary : themeConfig.colors.border }}
              >
                <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all"
                  style={{ right: isMobileService ? '2px' : 'auto', left: isMobileService ? 'auto' : '2px' }}
                />
              </button>
            </div>
          )}

          {isMobileService && (
            <div className="mb-4">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="أدخل عنوانك..."
                className="w-full h-11 px-4 text-sm rounded-xl outline-none border"
                style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
              />
            </div>
          )}

          {/* Services */}
          <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>الخدمات المتاحة</h3>
          <div className="space-y-2">
            {barber.services.map((svc: Service) => {
              const isSelected = selectedServices.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className="w-full text-right p-3 rounded-xl border flex items-center justify-between transition-all"
                  style={{
                    backgroundColor: isSelected ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                    borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border }}
                    >
                      {isSelected && <Check size={14} style={{ color: themeConfig.colors.primary }} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{svc.name}</p>
                      <p className="text-[10px] flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
                        <Clock size={10} /> {svc.duration} دقيقة
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{svc.price} دج</span>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          {selectedServices.length > 0 && (
            <div className="mt-4 p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>المدة الإجمالية</span>
                <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{totalDuration} دقيقة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإجمالي</span>
                <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{totalPrice} دج</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div className="p-4">
          {/* Date Selection */}
          <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>اختر التاريخ</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
            {dates.map(d => {
              const available = isDateAvailable(d.full);
              return (
                <button
                  key={d.full}
                  onClick={() => available && (setSelectedDate(d.full), setSelectedTime(''))}
                  disabled={!available}
                  className="flex flex-col items-center justify-center min-w-[60px] h-16 rounded-xl border transition-all relative"
                  style={{
                    backgroundColor: !available ? themeConfig.colors.surface : selectedDate === d.full ? themeConfig.colors.primary : themeConfig.colors.surface,
                    borderColor: !available ? themeConfig.colors.border : selectedDate === d.full ? themeConfig.colors.primary : themeConfig.colors.border,
                    color: !available ? themeConfig.colors.textMuted : selectedDate === d.full ? '#fff' : themeConfig.colors.text,
                    opacity: available ? 1 : 0.4,
                  }}
                >
                  <span className="text-[10px]">{d.day}</span>
                  <span className="text-lg font-bold">{d.date}</span>
                  <span className="text-[9px]">{d.month}</span>
                  {!available && <div className="absolute inset-0 flex items-center justify-center"><X size={20} className="opacity-30" style={{ color: themeConfig.colors.error }} /></div>}
                </button>
              );
            })}
          </div>

          {/* Time Selection */}
          <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>اختر الوقت</h3>
          {isLoadingSlots ? (
            <div className="text-center py-6 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2" style={{ borderColor: themeConfig.colors.primary, borderTopColor: 'transparent' }} />
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>جاري تحميل الأوقات المتاحة...</p>
            </div>
          ) : timeSlots.length === 0 && selectedDate ? (
            <div className="text-center py-6 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <Clock size={24} className="mx-auto mb-2 opacity-40" style={{ color: themeConfig.colors.textMuted }} />
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>لا توجد أوقات متاحة في هذا اليوم</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className="py-2.5 rounded-xl border text-xs font-bold transition-all"
                  style={{
                    backgroundColor: selectedTime === t ? themeConfig.colors.primary : themeConfig.colors.surface,
                    borderColor: selectedTime === t ? themeConfig.colors.primary : themeConfig.colors.border,
                    color: selectedTime === t ? '#fff' : themeConfig.colors.text,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Info about filtered slots */}
          {selectedDate && existingBookings.length > 0 && timeSlots.length > 0 && (
            <p className="text-[10px] mt-3 text-center" style={{ color: themeConfig.colors.textMuted }}>
              تم إخفاء الأوقات المحجوزة ({existingBookings.length} حجز موجود)
            </p>
          )}
        </div>
      )}
      
      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="p-4 space-y-3">
          {/* Summary Card */}
          <div className="p-4 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: themeConfig.colors.text }}>ملخص الحجز</h3>
            
            <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: themeConfig.colors.border }}>
              <img src={barber.avatar} alt={barber.name} className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{barber.name}</p>
                <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{barber.location}</p>
              </div>
            </div>

            <div className="space-y-2 mb-3 pb-3 border-b" style={{ borderColor: themeConfig.colors.border }}>
              {selectedServicesData.map((svc: Service) => (
                <div key={svc.id} className="flex justify-between">
                  <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name} ({svc.duration}د)</span>
                  <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{svc.price} دج</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: themeConfig.colors.textMuted }} />
                <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>التاريخ: {selectedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: themeConfig.colors.textMuted }} />
                <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>الوقت: {selectedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: themeConfig.colors.textMuted }} />
                <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{isMobileService ? (address || 'المنزل') : barber.location}</span>
              </div>
            </div>

            <div className="flex justify-between pt-3 mt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
              <span className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإجمالي</span>
              <span className="text-lg font-bold" style={{ color: themeConfig.colors.primary }}>{totalPrice} دج</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>طريقة الدفع</h3>
            <div className="space-y-2">
              {[
                { key: 'cash' as const, label: 'نقدي', desc: 'الدفع عند الزيارة', icon: Banknote },
                { key: 'ccp' as const, label: 'CCP', desc: 'الحساب البريدي الجزائري', icon: CreditCard },
                { key: 'baridi-mob' as const, label: 'بريدي موب', desc: 'قريباً', icon: Wallet },
              ].map(pm => (
                <button
                  key={pm.key}
                  onClick={() => pm.key !== 'baridi-mob' && setPaymentMethod(pm.key)}
                  className="w-full text-right p-3 rounded-xl border flex items-center justify-between"
                  style={{
                    backgroundColor: paymentMethod === pm.key ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                    borderColor: paymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.border,
                    opacity: pm.key === 'baridi-mob' ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
                      <pm.icon size={20} style={{ color: themeConfig.colors.primary }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{pm.label}</p>
                      <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{pm.desc}</p>
                    </div>
                  </div>
                  {pm.key !== 'baridi-mob' && (
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: paymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.border }}
                    >
                      {paymentMethod === pm.key && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeConfig.colors.primary }} />}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>ملاحظات (اختياري)</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أي ملاحظات خاصة..."
              className="w-full h-20 p-3 text-sm rounded-xl outline-none border resize-none"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
            />
          </div>
        </div>
      )}

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t backdrop-blur-lg z-30"
        style={{ backgroundColor: `${themeConfig.colors.surface}ee`, borderColor: themeConfig.colors.border }}
      >
        <div className="max-w-lg mx-auto">
          {step === 1 && (
            <button
              onClick={() => selectedServices.length > 0 && setStep(2)}
              disabled={selectedServices.length === 0}
              className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              التالي ({selectedServices.length} خدمة - {totalPrice} دج)
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => selectedDate && selectedTime && setStep(3)}
              disabled={!selectedDate || !selectedTime}
              className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              التالي
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Check size={18} />
                  تأكيد الحجز - {totalPrice} دج
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
