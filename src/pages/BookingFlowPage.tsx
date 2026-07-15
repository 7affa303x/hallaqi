import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Clock, MapPin, Car, CreditCard,
  Wallet, Banknote, Calendar, X, AlertTriangle
} from 'lucide-react';
import { createBooking, getProfessionalBookings, sendNotification } from '@/supabase/database';
import { usePayment } from '@/hooks/usePayment';
import { useCCPPayment } from '@/hooks/useCCPPayment';
import { ReceiptUpload } from '@/components/payment/ReceiptUpload';
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
  const [paymentMethod, setPaymentMethod] = useState<'ccp' | 'baridi-mob' | 'cash' | 'card'>('cash');
  const { initiatePayment, isProcessing: isPaymentProcessing, error: paymentError } = usePayment();
  const { createCCPPayment, uploadReceiptAndSubmit, isProcessing: isCCPProcessing, uploadProgress, error: ccpError } = useCCPPayment();
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [ccpPaymentId, setCcpPaymentId] = useState<string | null>(null);
  const [savedBookingId, setSavedBookingId] = useState<string | null>(null);
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
        // If card payment selected, redirect to Stripe Checkout
        if (paymentMethod === 'card') {
          const baseUrl = window.location.origin;
          const lineItems = selectedServicesData.map(svc => ({
            name: svc.name,
            description: `خدمة من ${barber.name}`,
            amount: Math.round(svc.price * 100), // convert to centimes
            quantity: 1,
            currency: 'dzd',
          }));

          await initiatePayment('stripe', {
            bookingId: saved.id,
            clientId: appUser.id,
            professionalId: barber.id,
            lineItems,
            totalAmount: totalPrice,
            currency: 'dzd',
            metadata: {
              barber_name: barber.name,
              booking_date: selectedDate,
              booking_time: selectedTime,
            },
            successUrl: `${baseUrl}/?screen=payment-success`,
            cancelUrl: `${baseUrl}/?screen=booking-flow&barberId=${barber.id}`,
            customerEmail: undefined, // email from auth session if needed
          });
          // User will be redirected to Stripe, no need to continue
          return;
        }

        // For CCP/BaridiMob, create a payment record and show receipt upload
        if (paymentMethod === 'ccp' || paymentMethod === 'baridi-mob') {
          const paymentId = await createCCPPayment({
            bookingId: saved.id,
            clientId: appUser.id,
            professionalId: barber.id,
            amount: totalPrice,
            currency: 'dzd',
            metadata: {
              barber_name: barber.name,
              booking_date: selectedDate,
              booking_time: selectedTime,
              payment_method: paymentMethod,
            },
          });
          if (paymentId) {
            setCcpPaymentId(paymentId);
            setSavedBookingId(saved.id);
            setShowReceiptUpload(true);
            setIsSaving(false);
            return;
          }
        }
        // For non-card payments, proceed as before
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

  // Show receipt upload screen for CCP/BaridiMob
  if (showReceiptUpload && ccpPaymentId && savedBookingId) {
    const barber = barbers.find(b => b.id === screenParams?.barberId);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-screen flex flex-col p-4 overflow-y-auto"
        style={{ backgroundColor: themeConfig.colors.background }}
      >
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setShowReceiptUpload(false); setConfirmed(true); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }}>
            <X size={18} style={{ color: themeConfig.colors.text }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>إيصال الدفع</h1>
        </div>
        <ReceiptUpload
          paymentId={ccpPaymentId}
          bookingId={savedBookingId}
          clientId={appUser.id}
          professionalId={barber.id}
          clientName={appUser.full_name || 'عميل'}
          onUploadSuccess={() => {
            // After successful upload, the payment record is updated by ccpProvider.submitPaymentWithReceipt
            // We can now navigate to confirmation or show a success message
            setConfirmed(true);
            setShowReceiptUpload(false);
            refreshData();
          }}
          onCancel={() => {
            // If user cancels receipt upload, we should probably cancel the booking or mark it as failed
            // For now, just go back
            goBack();
          }}
          uploadProgress={uploadProgress}
          error={ccpError}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-screen flex flex-col p-4 overflow-y-auto"
      style={{ backgroundColor: themeConfig.colors.background }}
    >
      {confirmed ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Check size={48} className="text-green-500 mb-4" />
          <h1 className="text-xl font-bold mb-2" style={{ color: themeConfig.colors.text }}>تم تأكيد الحجز!</h1>
          <p className="text-sm mb-6" style={{ color: themeConfig.colors.textMuted }}>
            تم إرسال طلب الحجز بنجاح. سيتم مراجعته من قبل المختص قريباً.
          </p>
          <button
            onClick={() => navigate('appointments')}
            className="px-6 py-3 rounded-lg font-semibold"
            style={{ backgroundColor: themeConfig.colors.primary, color: themeConfig.colors.onPrimary }}
          >
            عرض مواعيدي
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={goBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }}>
              <ArrowLeft size={18} style={{ color: themeConfig.colors.text }} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>تأكيد الحجز</h1>
          </div>

          {/* Step 1: Services Selection */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-md font-bold mb-4" style={{ color: themeConfig.colors.text }}>الخدمات المختارة</h2>
              <div className="flex-1 overflow-y-auto pr-2">
                {barber.services.map((svc: Service) => (
                  <div
                    key={svc.id}
                    onClick={() => toggleService(svc.id)}
                    className={`flex items-center justify-between p-3 mb-3 rounded-lg cursor-pointer ${selectedServices.includes(svc.id) ? 'border-2 border-blue-500' : ''}`}
                    style={{ backgroundColor: themeConfig.colors.surface }}
                  >
                    <div>
                      <p className="font-medium" style={{ color: themeConfig.colors.text }}>{svc.name}</p>
                      <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.duration} دقيقة - {svc.price} دج</p>
                    </div>
                    {selectedServices.includes(svc.id) && <Check size={20} className="text-blue-500" />}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={selectedServices.length === 0}
                className="mt-4 px-6 py-3 rounded-lg font-semibold"
                style={{ backgroundColor: selectedServices.length === 0 ? themeConfig.colors.muted : themeConfig.colors.primary, color: themeConfig.colors.onPrimary }}
              >
                التالي
              </button>
            </motion.div>
          )}

          {/* Step 2: Date and Time Selection */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-md font-bold mb-4" style={{ color: themeConfig.colors.text }}>اختيار التاريخ والوقت</h2>
              <div className="flex mb-4 overflow-x-auto pb-2 no-scrollbar">
                {dates.map((d, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      if (isDateAvailable(d.full)) {
                        setSelectedDate(d.full);
                        setSelectedTime(''); // Reset time when date changes
                      }
                    }}
                    className={`flex-shrink-0 w-16 h-20 rounded-lg flex flex-col items-center justify-center mr-3
                      ${selectedDate === d.full ? 'border-2 border-blue-500' : ''}
                      ${isDateAvailable(d.full) ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    style={{ backgroundColor: themeConfig.colors.surface }}
                  >
                    <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{d.day}</p>
                    <p className="text-xl font-bold" style={{ color: themeConfig.colors.text }}>{d.date}</p>
                    <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{d.month}</p>
                  </div>
                ))}
              </div>

              {selectedDate && (
                <div className="flex-1 overflow-y-auto pr-2">
                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : timeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {timeSlots.map((slot, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedTime(slot)}
                          className={`p-3 rounded-lg text-center font-medium
                            ${selectedTime === slot ? 'border-2 border-blue-500' : ''}
                            cursor-pointer`}
                          style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.text }}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center" style={{ color: themeConfig.colors.textMuted }}>لا توجد أوقات متاحة لهذا اليوم.</p>
                  )}
                </div>
              )}

              <button
                onClick={() => setStep(3)}
                disabled={!selectedDate || !selectedTime}
                className="mt-4 px-6 py-3 rounded-lg font-semibold"
                style={{ backgroundColor: (!selectedDate || !selectedTime) ? themeConfig.colors.muted : themeConfig.colors.primary, color: themeConfig.colors.onPrimary }}
              >
                التالي
              </button>
            </motion.div>
          )}

          {/* Step 3: Payment Method and Confirmation */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-md font-bold mb-4" style={{ color: themeConfig.colors.text }}>طريقة الدفع</h2>
              <div className="flex-1 overflow-y-auto pr-2">
                {/* Payment Methods */}
                {[{
                  key: 'cash',
                  label: 'الدفع نقداً',
                  icon: Banknote,
                  description: 'الدفع مباشرة للمختص عند الوصول.',
                },
                {
                  key: 'ccp',
                  label: 'CCP - حساب بريد الجزائر',
                  icon: Wallet,
                  description: 'الدفع عبر الحساب البريدي الجاري (CCP). يتطلب رفع إيصال الدفع.',
                },
                {
                  key: 'baridi-mob',
                  label: 'بريدي موب',
                  icon: Wallet,
                  description: 'الدفع عبر تطبيق بريدي موب. يتطلب رفع إيصال الدفع.',
                },
                {
                  key: 'card',
                  label: 'البطاقة المصرفية',
                  icon: CreditCard,
                  description: 'الدفع الآمن عبر البطاقة المصرفية (CIB/Visa).',
                }].map((pm) => (
                  <div
                    key={pm.key}
                    onClick={() => setPaymentMethod(pm.key as 'ccp' | 'baridi-mob' | 'cash' | 'card')}
                    className={`flex items-center p-3 mb-3 rounded-lg cursor-pointer ${paymentMethod === pm.key ? 'border-2 border-blue-500' : ''}`}
                    style={{ backgroundColor: themeConfig.colors.surface }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                      style={{ backgroundColor: themeConfig.colors.primary + '15' }}>
                      <pm.icon size={20} style={{ color: themeConfig.colors.primary }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: themeConfig.colors.text }}>{pm.label}</p>
                      <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{pm.description}</p>
                    </div>
                    {paymentMethod === pm.key && <Check size={20} className="text-blue-500" />}
                  </div>
                ))}

                {/* Mobile Service Option */}
                <div
                  onClick={() => setIsMobileService(prev => !prev)}
                  className={`flex items-center p-3 mb-3 rounded-lg cursor-pointer ${isMobileService ? 'border-2 border-blue-500' : ''}`}
                  style={{ backgroundColor: themeConfig.colors.surface }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                    style={{ backgroundColor: themeConfig.colors.primary + '15' }}>
                    <Car size={20} style={{ color: themeConfig.colors.primary }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: themeConfig.colors.text }}>خدمة متنقلة (في المنزل)</p>
                    <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>يأتي المختص إليك. قد يتم تطبيق رسوم إضافية.</p>
                  </div>
                  {isMobileService && <Check size={20} className="text-blue-500" />}
                </div>

                {isMobileService && (
                  <input
                    type="text"
                    placeholder="عنوان الخدمة (مثال: حي النصر، عمارة 5، شقة 12)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 mb-3 rounded-lg text-sm"
                    style={{ backgroundColor: themeConfig.colors.inputBackground, color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}
                  />
                )}

                {/* Notes */}
                <textarea
                  placeholder="ملاحظات إضافية للمختص (اختياري)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full p-3 mb-3 rounded-lg text-sm resize-none"
                  style={{ backgroundColor: themeConfig.colors.inputBackground, color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}
                />

                {/* Summary */}
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: themeConfig.colors.surface }}>
                  <h3 className="text-md font-bold mb-3" style={{ color: themeConfig.colors.text }}>ملخص الحجز</h3>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>الخدمات:</p>
                    <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{selectedServicesData.map(s => s.name).join(', ')}</p>
                  </div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>التاريخ:</p>
                    <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{dates.find(d => d.full === selectedDate)?.day}, {dates.find(d => d.full === selectedDate)?.date} {dates.find(d => d.full === selectedDate)?.month}</p>
                  </div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>الوقت:</p>
                    <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{selectedTime}</p>
                  </div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>المدة:</p>
                    <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{totalDuration} دقيقة</p>
                  </div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>طريقة الدفع:</p>
                    <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>
                      {paymentMethod === 'cash' && 'نقداً'}
                      {paymentMethod === 'ccp' && 'CCP'}
                      {paymentMethod === 'baridi-mob' && 'بريدي موب'}
                      {paymentMethod === 'card' && 'بطاقة مصرفية'}
                    </p>
                  </div>
                  {isMobileService && (
                    <div className="flex justify-between mb-2">
                      <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>خدمة متنقلة:</p>
                      <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>نعم</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-3 mt-3"
                    style={{ borderColor: themeConfig.colors.border }}>
                    <p className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>الإجمالي:</p>
                    <p className="text-lg font-bold" style={{ color: themeConfig.colors.primary }}>{totalPrice} دج</p>
                  </div>
                </div>
              </div>

              {(saveError || paymentError || ccpError) && (
                <div className="flex items-center p-3 mt-4 rounded-lg" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
                  <AlertTriangle size={20} className="text-red-500 mr-2" />
                  <p className="text-xs" style={{ color: themeConfig.colors.error }}>{saveError || paymentError || ccpError}</p>
                </div>
              )}

              <button onClick={handleConfirm} disabled={isSaving || isPaymentProcessing || isCCPProcessing}
                className="mt-4 px-6 py-3 rounded-lg font-semibold"
                style={{ backgroundColor: (isSaving || isPaymentProcessing || isCCPProcessing) ? themeConfig.colors.muted : themeConfig.colors.primary, color: themeConfig.colors.onPrimary }}
              >
                {(isSaving || isPaymentProcessing || isCCPProcessing) ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" /> {paymentMethod === 'card' ? 'جاري التوجيه للدفع...' : 'جاري الحفظ...'}</> : <>{paymentMethod === 'card' ? `الدفع بالبطاقة - ${totalPrice} دج` : `تأكيد الحجز - ${totalPrice} دج`}</>}
              </button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
