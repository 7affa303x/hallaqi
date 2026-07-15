import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Clock, MapPin, Car, CreditCard,
  Wallet, Banknote, Calendar, X, AlertTriangle
} from 'lucide-react';
import { createBooking, getProfessionalBookings, sendNotification } from '@/supabase/database';
import type { Service, BookingStatus, PaymentStatus } from '@/types';
import type { Database } from '@/types/supabase';

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

/** Check if a time slot overlaps with existing bookings */
function isSlotOverlapping(
  slotTime: string,
  durationMinutes: number,
  existingBookings: Array<{ booking_start_time: string | null; booking_end_time: string | null; status: BookingStatus | null }>,
  selectedDate: string
): boolean {
  const slotStart = new Date(`${selectedDate}T${slotTime}`);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

  for (const booking of existingBookings) {
    if (!booking.booking_start_time || !booking.booking_end_time) continue;
    if (booking.status === 'cancelled' || booking.status === 'no_show') continue;

    const bookStart = new Date(booking.booking_start_time);
    const bookEnd = new Date(booking.booking_end_time);

    // Overlap check: [slotStart, slotEnd) overlaps with [bookStart, bookEnd)
    if (slotStart < bookEnd && slotEnd > bookStart) {
      return true; // overlapping
    }
  }
  return false; // no overlap = available
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
  const [existingBookings, setExistingBookings] = useState<Array<{
    booking_start_time: string | null;
    booking_end_time: string | null;
    status: BookingStatus | null;
  }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const barber = barbers.find(b => b.id === screenParams?.barberId);
  const dates = generateDates();

  /** Fetch existing bookings for this professional */
  useEffect(() => {
    if (!barber?.id || !selectedDate) {
      setExistingBookings([]);
      return;
    }
    let cancelled = false;
    const fetch = async () => {
      setIsLoadingSlots(true);
      try {
        const bookings = await getProfessionalBookings(barber.id);
        if (!cancelled) setExistingBookings(bookings.map(b => ({ ...b, status: b.status as unknown as BookingStatus })) || []);
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
        !isSlotOverlapping(slot, totalDuration, existingBookings, dateStr)
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
        <p>المختص غير موجود</p>
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

  /** Compute end time from start time + duration */
  const computeEndTime = (dateStr: string, timeStr: string, durationMin: number): string => {
    const start = new Date(`${dateStr}T${timeStr}`);
    const end = new Date(start.getTime() + durationMin * 60000);
    return end.toISOString();
  };

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
      const overlaps = isSlotOverlapping(selectedTime, totalDuration, existingBookings, selectedDate);
      if (overlaps) {
        setSaveError('هذا الوقت لم يعد متاحاً. يرجى اختيار وقت آخر.');
        setIsSaving(false);
        return;
      }

      const bookingStartTime = `${selectedDate}T${selectedTime}`;
      const bookingEndTime = computeEndTime(selectedDate, selectedTime, totalDuration);

      // Build Supabase booking row with Live DB column names
      const bookingRow = {
        client_id: appUser.id,
        professional_id: barber.id,
        service_id: selectedServicesData[0]?.id || null,
        booking_start_time: bookingStartTime,
        booking_end_time: bookingEndTime,
        status: 'pending' as BookingStatus,
        total_price: totalPrice,
        notes: note || null,
        payment_status: 'pending' as PaymentStatus,
      };

      const saved = await createBooking({ ...bookingRow, status: bookingRow.status as unknown as Database["public"]["Enums"]["booking_status"] });

      if (saved) {
        // Notify the barber that they received a new booking
        try {
          await sendNotification({
            userId: barber.id,
            title: 'حجز جديد',
            message: `لديك حجز جديد من ${appUser.full_name || 'عميل'} - ${selectedDate} ${selectedTime}`,
            type: 'booking',
          });
        } catch (err) {
          console.error('Failed to notify barber:', err);
        }

        // Notify the client that their booking was submitted
        try {
          await sendNotification({
            userId: appUser.id,
            title: 'تم إرسال طلب الحجز',
            message: `تم إرسال طلب الحجز إلى ${barber.name} - سيتم تأكيده قريباً`,
            type: 'booking',
          });
        } catch (err) {
          console.error('Failed to notify client:', err);
        }

        // Add to local state for immediate UI update
        const newBooking = {
          id: saved.id,
          barberId: barber.id,
          barberName: barber.name,
          barberAvatar: barber.avatar,
          services: selectedServicesData,
          date: selectedDate,
          time: selectedTime,
          status: 'pending' as BookingStatus,
          totalPrice: totalPrice,
          note: note || undefined,
          createdAt: new Date().toISOString(),
          location: barber.location,
          isMobileService: isMobileService,
          paymentMethod: paymentMethod,
          paymentStatus: 'pending' as PaymentStatus,
          reviewed: false,
          address: isMobileService ? address : undefined,
        };
        addBooking(newBooking as unknown as Parameters<typeof addBooking>[0]);

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
            تفاصيل المختص
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
        <div className="flex-1">
          <h1 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
            {step === 1 ? 'اختيار الخدمات' : step === 2 ? 'اختيار الموعد' : 'تأكيد الحجز'}
          </h1>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3].map(s => (
              <div key={s} className="h-1 flex-1 rounded-full" style={{ backgroundColor: s <= step ? themeConfig.colors.primary : themeConfig.colors.border }} />
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>{totalPrice} دج</p>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{totalDuration} دقيقة</p>
        </div>
      </div>

      {/* === STEP 1: SERVICES === */}
      {step === 1 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <img src={barber.avatar} alt={barber.name} className="w-8 h-8 rounded-lg object-cover" />
            <div><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{barber.name}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>اختر الخدمات المطلوبة</p></div>
          </div>

          <div className="space-y-2">
            {barber.services.map((svc: Service) => {
              const isSelected = selectedServices.includes(svc.id);
              return (
                <button key={svc.id} onClick={() => toggleService(svc.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-right"
                  style={{ backgroundColor: isSelected ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border }}>
                  <div className="w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border, backgroundColor: isSelected ? themeConfig.colors.primary : 'transparent' }}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{svc.name}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{svc.duration} دقيقة</p></div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{svc.price} دج</p>
                </button>
              );
            })}
          </div>

          <button onClick={() => selectedServices.length > 0 ? setStep(2) : setSaveError('اختر خدمة واحدة على الأقل')} className="w-full h-12 rounded-xl text-sm font-bold text-white mt-4" style={{ backgroundColor: themeConfig.colors.primary }}>متابعة</button>
        </div>
      )}

      {/* === STEP 2: DATE & TIME === */}
      {step === 2 && (
        <div className="px-4 mt-4">
          {/* Date selector */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3"><Calendar size={16} style={{ color: themeConfig.colors.primary }} /><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>اختر التاريخ</p></div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {dates.map(d => {
                const isAvailable = isDateAvailable(d.full);
                const isSelected = selectedDate === d.full;
                return (
                  <button key={d.full} onClick={() => { if (isAvailable) { setSelectedDate(d.full); setSelectedTime(''); } }}
                    disabled={!isAvailable}
                    className="flex-shrink-0 w-16 h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
                    style={{ backgroundColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.surface, borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border }}>
                    <span className="text-[10px] font-medium" style={{ color: isSelected ? '#fff' : themeConfig.colors.textMuted }}>{d.day}</span>
                    <span className="text-lg font-bold" style={{ color: isSelected ? '#fff' : themeConfig.colors.text }}>{d.date}</span>
                    <span className="text-[9px]" style={{ color: isSelected ? '#fff' : themeConfig.colors.textMuted }}>{d.month}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Clock size={16} style={{ color: themeConfig.colors.primary }} /><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>اختر الوقت</p></div>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} /></div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button key={slot} onClick={() => setSelectedTime(slot)}
                        className="h-10 rounded-xl text-xs font-bold border transition-all"
                        style={{ backgroundColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.surface, borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border, color: isSelected ? '#fff' : themeConfig.colors.text }}>
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button onClick={() => selectedTime ? setStep(3) : setSaveError('اختر الوقت')} className="w-full h-12 rounded-xl text-sm font-bold text-white mt-4" style={{ backgroundColor: themeConfig.colors.primary }}>متابعة</button>
        </div>
      )}

      {/* === STEP 3: CONFIRM === */}
      {step === 3 && (
        <div className="px-4 mt-4 space-y-4">
          {/* Booking summary */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="flex items-center gap-2 mb-3"><img src={barber.avatar} alt={barber.name} className="w-8 h-8 rounded-lg object-cover" /><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{barber.name}</p></div>
            <div className="space-y-2">
              {selectedServicesData.map(svc => (
                <div key={svc.id} className="flex justify-between"><span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name}</span><span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{svc.price} دج</span></div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
              <span className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإجمالي</span>
              <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{totalPrice} دج</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>طريقة الدفع</p>
            <div className="grid grid-cols-3 gap-2">
              {[{ key: 'cash' as const, label: 'نقداً', icon: Banknote }, { key: 'ccp' as const, label: 'CCP', icon: CreditCard }, { key: 'baridi-mob' as const, label: 'بريدي موب', icon: Wallet }].map(pm => (
                <button key={pm.key} onClick={() => setPaymentMethod(pm.key)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all"
                  style={{ backgroundColor: paymentMethod === pm.key ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, borderColor: paymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.border }}>
                  <pm.icon size={20} style={{ color: paymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.textMuted }} />
                  <span className="text-[10px] font-bold" style={{ color: paymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.textMuted }}>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile service */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="flex items-center gap-2"><Car size={18} style={{ color: themeConfig.colors.primary }} /><span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>خدمة متنقلة (يأتي لعندك)</span></div>
            <button onClick={() => setIsMobileService(!isMobileService)} className="w-12 h-6 rounded-full relative transition-all" style={{ backgroundColor: isMobileService ? themeConfig.colors.primary : themeConfig.colors.border }}>
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ right: isMobileService ? '2px' : 'auto', left: isMobileService ? 'auto' : '2px' }} />
            </button>
          </div>

          {/* Address for mobile */}
          {isMobileService && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>العنوان</p>
              <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <MapPin size={16} style={{ color: themeConfig.colors.primary }} />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="أدخل عنوانك" className="flex-1 bg-transparent text-xs outline-none" style={{ color: themeConfig.colors.text }} />
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>ملاحظات (اختياري)</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي ملاحظات خاصة..." rows={2} className="w-full p-3 rounded-xl border text-xs resize-none" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} />
          </div>

          {saveError && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
              <AlertTriangle size={16} style={{ color: themeConfig.colors.error }} />
              <p className="text-xs" style={{ color: themeConfig.colors.error }}>{saveError}</p>
            </div>
          )}

          <button onClick={handleConfirm} disabled={isSaving}
            className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}>
            {isSaving ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</> : <>تأكيد الحجز - {totalPrice} دج</>}
          </button>
        </div>
      )}
    </motion.div>
  );
}