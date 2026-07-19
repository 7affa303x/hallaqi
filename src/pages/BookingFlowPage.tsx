import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Clock, MapPin, Car, CreditCard,
  Wallet, Banknote, Calendar, X, AlertTriangle, Sparkles
} from 'lucide-react';
import {
  createBookingWithServices,
  getProfessionalBookings,
  getProfessionalExceptions,
  getLoyaltyDashboard,
  isSlotAvailable,
  sendNotification,
  updateBookingStatus,
} from '@/supabase/database';
import { usePayment } from '@/hooks/usePayment';
import { useCCPPayment } from '@/hooks/useCCPPayment';
import { ReceiptUpload } from '@/components/payment/ReceiptUpload';
import type { Service, BookingStatus, PaymentStatus } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingStep3Schema } from '@/lib/validation';
import type { BookingStep3FormData } from '@/lib/validation';
import { preferredBookingHour, rankAvailableSlots } from '@/lib/scheduling';
import { FEATURE_FLAGS, PAUSED_LABEL, isCashOnlyPayments } from '@/lib/featureFlags';
import { CANCEL_POLICY } from '@/lib/cancelPolicy';
import { trackProductEvent } from '@/lib/product-analytics';
import { reportClientError } from '@/lib/error-reporting';
import { useI18n } from '@/hooks/useI18n';

const ALL_TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

const ccpEnvConfigured = Boolean(
  import.meta.env.VITE_CCP_ACCOUNT_NUMBER && import.meta.env.VITE_CCP_CARD_NUMBER
);
const cardEnabled = FEATURE_FLAGS.cardPaymentsEnabled;
const ccpEnabled = FEATURE_FLAGS.ccpPaymentsEnabled && ccpEnvConfigured;

interface AvailableVoucher {
  id: string;
  code: string;
  title: string;
  discountPercent: number;
  expiresAt: string;
}

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
  const { themeConfig, screenParams, barbers, bookings: userBookings, addBooking, navigate, setActiveTab, goBack, refreshData } = useApp();
  const { money } = useI18n();
  const { appUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [initializedFromParams, setInitializedFromParams] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const { initiatePayment, isProcessing: isPaymentProcessing, error: paymentError } = usePayment();
  const { createCCPPayment, uploadReceiptAndSubmit, isProcessing: isCCPProcessing, uploadProgress, error: ccpError } = useCCPPayment();
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [ccpPaymentId, setCcpPaymentId] = useState<string | null>(null);
  const [savedBookingId, setSavedBookingId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [existingBookings, setExistingBookings] = useState<Array<{
    booking_start_time: string | null;
    booking_end_time: string | null;
    status: BookingStatus | null;
  }>>([]);
  const [dayExceptions, setDayExceptions] = useState<Array<{
    type: string;
    start_time: string | null;
    end_time: string | null;
  }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucher[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState('');

  const {
    register: registerStep3,
    handleSubmit: handleStep3Submit,
    formState: { errors: step3Errors },
    watch: watchStep3,
  } = useForm<BookingStep3FormData>({
    resolver: zodResolver(bookingStep3Schema),
    defaultValues: {
      paymentMethod: 'cash',
      note: '',
      isMobileService: false,
      address: '',
    },
  });

  const watchedPaymentMethod = watchStep3('paymentMethod');
  const watchedIsMobileService = watchStep3('isMobileService');

  const barber = barbers.find(b => b.id === screenParams?.barberId);
  const dates = generateDates();

  useEffect(() => {
    if (!barber || initializedFromParams) return;
    const requestedServices = (screenParams?.serviceIds || '').split(',').filter(Boolean);
    if (requestedServices.length > 0) {
      const validIds = requestedServices.filter(id => barber.services.some(service => service.id === id));
      setSelectedServices(validIds);
    }
    setInitializedFromParams(true);
  }, [barber, initializedFromParams, screenParams?.serviceIds]);

  // Cancel orphan booking if user returned from Stripe cancel URL
  useEffect(() => {
    const cancelledId = screenParams?.cancelledBooking
      || new URLSearchParams(window.location.search).get('cancelledBooking');
    if (!cancelledId) return;
    void updateBookingStatus(cancelledId, 'cancelled')
      .then(() => {
        setSaveError('تم إلغاء الحجز لأن الدفع لم يكتمل. يمكنك المحاولة مرة أخرى.');
        const url = new URL(window.location.href);
        url.searchParams.delete('cancelledBooking');
        window.history.replaceState({}, '', url.toString());
      })
      .catch((err) => {
        console.error('Failed to cancel unpaid booking:', err);
        reportClientError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [screenParams?.cancelledBooking]);

  useEffect(() => {
    if (!FEATURE_FLAGS.loyaltyEnabled || !appUser) return;
    void getLoyaltyDashboard(appUser.id).then(data => {
      const vouchers = data.redemptions.flatMap(redemption => {
        const reward = redemption.loyalty_rewards;
        if (
          redemption.status !== 'available'
          || new Date(redemption.expires_at) <= new Date()
          || !reward
        ) return [];
        return [{
          id: redemption.id,
          code: redemption.voucher_code,
          title: reward.title_ar,
          discountPercent: reward.discount_percent,
          expiresAt: redemption.expires_at,
        }];
      });
      setAvailableVouchers(vouchers);
    }).catch(() => setAvailableVouchers([]));
  }, [appUser]);

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
        const [bookings, exceptions] = await Promise.all([
          getProfessionalBookings(barber.id),
          getProfessionalExceptions(barber.id, selectedDate, selectedDate),
        ]);
        if (!cancelled) {
          setExistingBookings(bookings.map(b => ({ ...b, status: b.status as unknown as BookingStatus })) || []);
          setDayExceptions(exceptions.map(item => ({
            type: item.type,
            start_time: item.start_time,
            end_time: item.end_time,
          })));
        }
      } catch (err) {
        console.error('Failed to fetch existing bookings:', err);
        if (!cancelled) {
          setExistingBookings([]);
          setDayExceptions([]);
        }
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
    if (dateStr === selectedDate && dayExceptions.some(exception => !exception.start_time && !exception.end_time)) {
      return false;
    }
    return true;
  }, [dayExceptions, getDayHours, selectedDate]);

  /** Get available time slots for a specific date */
  const getAvailableTimeSlots = useCallback((dateStr: string): string[] => {
    const hours = getDayHours(dateStr);
    if (!hours || hours.open === 'closed' || hours.close === 'closed') return [];
    if (dateStr === selectedDate && dayExceptions.some(exception => !exception.start_time && !exception.end_time)) {
      return [];
    }

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
    if (dateStr === selectedDate) {
      slots = slots.filter(slot => !dayExceptions.some(exception => {
        if (!exception.start_time || !exception.end_time) return false;
        return slot >= exception.start_time.slice(0, 5) && slot < exception.end_time.slice(0, 5);
      }));
    }

    return slots;
  }, [getDayHours, selectedDate, existingBookings, dayExceptions, barber?.services, selectedServices]);

  /** Memoize available time slots for selected date */
  const timeSlots = useMemo(() => {
    if (!selectedDate) return ALL_TIME_SLOTS;
    return getAvailableTimeSlots(selectedDate);
  }, [selectedDate, getAvailableTimeSlots]);
  const preferredHour = useMemo(
    () => preferredBookingHour([
      ...userBookings.map(booking => booking.time),
      ...(screenParams?.preferredTime ? [screenParams.preferredTime] : []),
    ]),
    [screenParams?.preferredTime, userBookings]
  );
  const optimizedSlots = useMemo(
    () => selectedDate
      ? rankAvailableSlots(timeSlots, selectedDate, existingBookings, preferredHour).slice(0, 3)
      : [],
    [existingBookings, preferredHour, selectedDate, timeSlots]
  );

  if (!barber) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p>المختص غير موجود</p>
        <button onClick={goBack}>رجوع</button>
      </div>
    );
  }

  const toggleService = (svcId: string) => {
    const selecting = !selectedServices.includes(svcId);
    setSelectedServices(prev =>
      prev.includes(svcId) ? prev.filter(id => id !== svcId) : [...prev, svcId]
    );
    trackProductEvent('Booking Services Selected', {
      barberId: barber.id,
      serviceId: svcId,
      selected: selecting,
    });
    setSelectedTime(''); // Reset time when services change (duration changes)
  };

  const chooseTime = (time: string, source: 'optimized' | 'grid') => {
    setSelectedTime(time);
    trackProductEvent('Booking Time Selected', {
      barberId: barber.id,
      date: selectedDate,
      time,
      source,
    });
  };

  const selectedServicesData = barber.services.filter((s: Service) => selectedServices.includes(s.id));
  const totalPrice = selectedServicesData.reduce((sum: number, s: Service) => sum + s.price, 0);
  const totalDuration = selectedServicesData.reduce((sum: number, s: Service) => sum + s.duration, 0);
  const selectedVoucher = availableVouchers.find(voucher => voucher.id === selectedVoucherId);
  const discountAmount = selectedVoucher
    ? Math.round(totalPrice * selectedVoucher.discountPercent) / 100
    : 0;
  const payableTotal = Math.max(0, totalPrice - discountAmount);
  const estimatedLoyaltyPoints = Math.max(1, Math.floor(payableTotal / 100));

  /** Compute end time from start time + duration */
  const computeEndTime = (dateStr: string, timeStr: string, durationMin: number): string => {
    const start = new Date(`${dateStr}T${timeStr}`);
    const end = new Date(start.getTime() + durationMin * 60000);
    return end.toISOString();
  };

  const handleConfirmStep3 = async (data: BookingStep3FormData) => {
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
      if (data.paymentMethod === 'card' && !cardEnabled) {
        setSaveError('الدفع بالبطاقة متوقف حالياً. اختر الدفع نقداً.');
        return;
      }
      if ((data.paymentMethod === 'ccp' || data.paymentMethod === 'baridi-mob') && !ccpEnabled) {
        setSaveError('دفع CCP / بريدي موب متوقف حالياً. اختر الدفع نقداً.');
        return;
      }

      // Validate: check slot is still available
      const overlaps = isSlotOverlapping(selectedTime, totalDuration, existingBookings, selectedDate);
      if (overlaps) {
        setSaveError('هذا الوقت لم يعد متاحاً. يرجى اختيار وقت آخر.');
        setIsSaving(false);
        return;
      }

      const bookingStartTime = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const bookingEndTime = computeEndTime(selectedDate, selectedTime, totalDuration);
      if (!await isSlotAvailable(barber.id, bookingStartTime, bookingEndTime)) {
        setSaveError('هذا الوقت لم يعد متاحاً. يرجى اختيار وقت آخر.');
        return;
      }

      const saved = await createBookingWithServices({
        professionalId: barber.id,
        serviceIds: selectedServicesData.map(service => service.id),
        startsAt: bookingStartTime,
        note: data.note,
        paymentMethod: data.paymentMethod,
        isMobileService: data.isMobileService,
        mobileAddress: data.address,
        voucherCode: selectedVoucher?.code,
      });

      if (saved) {
        trackProductEvent('Booking Submitted', {
          barberId: barber.id,
          serviceCount: selectedServicesData.length,
          paymentMethod: data.paymentMethod,
          total: saved.total_price,
          usedVoucher: Boolean(selectedVoucher),
        });
        // If card payment selected, redirect to Stripe Checkout
        if (data.paymentMethod === 'card') {
          const baseUrl = window.location.origin;
          const lineItems = [{
            name: selectedServicesData.map(service => service.name).join(' + '),
            description: `حجز مع ${barber.name}${selectedVoucher ? ` بعد ${selectedVoucher.title}` : ''}`,
            amount: Math.round(saved.total_price * 100),
            quantity: 1,
            currency: 'dzd',
          }];

          try {
            await initiatePayment('stripe', {
              bookingId: saved.id,
              clientId: appUser.id,
              professionalId: barber.id,
              lineItems,
              totalAmount: saved.total_price,
              currency: 'dzd',
              metadata: {
                barber_name: barber.name,
                booking_date: selectedDate,
                booking_time: selectedTime,
              },
              successUrl: `${baseUrl}/?screen=payment-success&booking_id=${encodeURIComponent(saved.id)}`,
              cancelUrl: `${baseUrl}/?screen=booking-flow&barberId=${encodeURIComponent(barber.id)}&cancelledBooking=${encodeURIComponent(saved.id)}`,
              customerEmail: undefined,
            });
            // User will be redirected to Stripe
            return;
          } catch (payErr) {
            // Avoid orphan pending bookings when Stripe session fails
            try {
              await updateBookingStatus(saved.id, 'cancelled');
            } catch (cancelErr) {
              console.error('Failed to cancel unpaid booking after Stripe error:', cancelErr);
              reportClientError(cancelErr instanceof Error ? cancelErr : new Error(String(cancelErr)));
            }
            setSaveError(payErr instanceof Error ? payErr.message : 'تعذر بدء الدفع بالبطاقة. ألغينا الحجز تلقائياً.');
            setIsSaving(false);
            return;
          }
        }

        // For CCP/BaridiMob, create a payment record and show receipt upload
        if (data.paymentMethod === 'ccp' || data.paymentMethod === 'baridi-mob') {
          const paymentId = await createCCPPayment({
            bookingId: saved.id,
            clientId: appUser.id,
            professionalId: barber.id,
            amount: saved.total_price,
            currency: 'dzd',
            metadata: {
              barber_name: barber.name,
              booking_date: selectedDate,
              booking_time: selectedTime,
              payment_method: data.paymentMethod,
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
            message: `لديك حجز جديد من ${appUser.full_name || 'زبون'} - ${selectedDate} ${selectedTime}`,
            type: 'booking',
            metadata: { booking_id: saved.id },
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
            metadata: { booking_id: saved.id },
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
          totalPrice: saved.total_price,
          discountAmount: saved.discount_amount || undefined,
          note: data.note || undefined,
          createdAt: new Date().toISOString(),
          location: barber.location,
          isMobileService: data.isMobileService,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'pending' as PaymentStatus,
          reviewed: false,
          address: data.isMobileService ? data.address : undefined,
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
          <h1 className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>رفع إيصال الدفع</h1>
        </div>
        <ReceiptUpload
          paymentMethod={watchedPaymentMethod as 'ccp' | 'baridi-mob'}
          isUploading={isCCPProcessing}
          uploadProgress={uploadProgress}
          error={ccpError}
          onUpload={async (file, ref) => {
            const success = await uploadReceiptAndSubmit({
              file,
              clientId: appUser?.id || '',
              paymentId: ccpPaymentId,
              transactionReference: ref,
              bookingId: savedBookingId,
              professionalId: barber?.id || '',
              clientName: appUser?.full_name || 'زبون',
            });
            if (success) {
              setTimeout(() => { setShowReceiptUpload(false); setConfirmed(true); }, 1500);
            }
            return success;
          }}
        />
      </motion.div>
    );
  }
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
          تم إرسال الطلب إلى {barber.name}
        </p>
        <p className="text-xs mb-6 leading-5" style={{ color: themeConfig.colors.textMuted }}>
          {selectedDate} - {selectedTime}<br />ستصلك رسالة فور قبول الحلاق أو تحديث حالة الموعد
        </p>
        <div className="w-full max-w-xs p-3 rounded-xl mb-4 text-right" style={{ backgroundColor: themeConfig.colors.success + '12' }}>
          <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>الدفع نقداً عند الزيارة</p>
          <p className="text-[10px] mt-1 leading-5" style={{ color: themeConfig.colors.textMuted }}>
            حضّر المبلغ ({money(payableTotal)}) وادفعه للحلاق في الصالون. لا يُخصم شيء من بطاقتك حالياً.
          </p>
        </div>
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
            <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{money(payableTotal)}</span>
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
            onClick={() => { setConfirmed(false); setActiveTab('appointments'); }}
            className="flex-1 h-12 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            متابعة حالة الحجز
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
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>{money(totalPrice)}</p>
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
                <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-right"
                  style={{ backgroundColor: isSelected ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border }}>
                  <div className="w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border, backgroundColor: isSelected ? themeConfig.colors.primary : 'transparent' }}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{svc.name}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{svc.duration} دقيقة</p></div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{money(svc.price)}</p>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => selectedServices.length > 0 ? setStep(2) : setSaveError('اختر خدمة واحدة على الأقل')} className="w-full h-12 rounded-xl text-sm font-bold text-white mt-4" style={{ backgroundColor: themeConfig.colors.primary }}>متابعة</button>
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
                  <button key={d.full} type="button" onClick={() => { if (isAvailable) { setSelectedDate(d.full); setSelectedTime(''); } }}
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
                <>
                {optimizedSlots.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={14} style={{ color: themeConfig.colors.accent }} />
                      <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>أفضل الأوقات لك</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {optimizedSlots.map(slot => (
                        <button
                          key={`optimized-${slot.time}`}
                          type="button"
                          onClick={() => chooseTime(slot.time, 'optimized')}
                          className="rounded-xl border p-2 text-center"
                          style={{
                            backgroundColor: selectedTime === slot.time ? themeConfig.colors.accent : themeConfig.colors.accent + '10',
                            borderColor: themeConfig.colors.accent,
                            color: selectedTime === slot.time ? '#fff' : themeConfig.colors.text,
                          }}
                        >
                          <span className="text-xs font-bold block">{slot.time}</span>
                          <span className="text-[8px] block mt-1 truncate">{slot.reasons[0] || 'موعد مناسب'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button key={slot} type="button" onClick={() => chooseTime(slot, 'grid')}
                        className="h-10 rounded-xl text-xs font-bold border transition-all"
                        style={{ backgroundColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.surface, borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border, color: isSelected ? '#fff' : themeConfig.colors.text }}>
                        {slot}
                      </button>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          )}

          <button type="button" onClick={() => selectedTime ? setStep(3) : setSaveError('اختر الوقت')} className="w-full h-12 rounded-xl text-sm font-bold text-white mt-4" style={{ backgroundColor: themeConfig.colors.primary }}>متابعة</button>
        </div>
      )}

      {/* === STEP 3: CONFIRM === */}
      {step === 3 && (
        <form onSubmit={handleStep3Submit(handleConfirmStep3)} className="px-4 mt-4 space-y-4">
          {/* Booking summary */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="flex items-center gap-2 mb-3"><img src={barber.avatar} alt={barber.name} className="w-8 h-8 rounded-lg object-cover" /><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{barber.name}</p></div>
            <div className="space-y-2">
              {selectedServicesData.map(svc => (
                <div key={svc.id} className="flex justify-between"><span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name}</span><span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{money(svc.price)}</span></div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
              <span className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإجمالي</span>
              <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{money(payableTotal)}</span>
            </div>
            {selectedVoucher && (
              <div className="flex justify-between mt-2">
                <span className="text-[11px]" style={{ color: themeConfig.colors.success }}>{selectedVoucher.title}</span>
                <span className="text-[11px] font-bold" style={{ color: themeConfig.colors.success }}>-{money(discountAmount)}</span>
              </div>
            )}
            {FEATURE_FLAGS.loyaltyEnabled && (
              <div className="flex items-center justify-between mt-2 p-2 rounded-lg" style={{ backgroundColor: themeConfig.colors.accent + '10' }}>
                <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>مكافأة إكمال الموعد</span>
                <span className="text-[11px] font-bold" style={{ color: themeConfig.colors.accent }}>+{estimatedLoyaltyPoints} نقطة ولاء</span>
              </div>
            )}
          </div>

          {FEATURE_FLAGS.loyaltyEnabled && availableVouchers.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>قسائم الولاء</p>
              <div className="space-y-2">
                <button type="button" onClick={() => setSelectedVoucherId('')} className="w-full p-3 rounded-xl border text-right text-xs" style={{ backgroundColor: !selectedVoucherId ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, borderColor: !selectedVoucherId ? themeConfig.colors.primary : themeConfig.colors.border, color: themeConfig.colors.text }}>بدون قسيمة</button>
                {availableVouchers.map(voucher => (
                  <button key={voucher.id} type="button" onClick={() => {
                    setSelectedVoucherId(voucher.id);
                    trackProductEvent('Loyalty Voucher Selected', { discountPercent: voucher.discountPercent });
                  }} className="w-full p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: selectedVoucherId === voucher.id ? themeConfig.colors.success + '10' : themeConfig.colors.surface, borderColor: selectedVoucherId === voucher.id ? themeConfig.colors.success : themeConfig.colors.border }}>
                    <div className="text-right"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{voucher.title}</p><p className="text-[9px] font-mono mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{voucher.code}</p></div>
                    <span className="text-xs font-bold" style={{ color: themeConfig.colors.success }}>خصم {voucher.discountPercent}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment method */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>طريقة الدفع</p>
            {isCashOnlyPayments() ? (
              <>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border"
                  style={{ backgroundColor: themeConfig.colors.primary + '08', borderColor: themeConfig.colors.primary }}
                >
                  <Banknote size={20} style={{ color: themeConfig.colors.primary }} />
                  <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>نقداً عند الزيارة</span>
                </button>
                <p className="text-[10px] mt-2 leading-5" style={{ color: themeConfig.colors.textMuted }}>
                  لا تدفع الآن عبر التطبيق. عند الموعد ادفع للحلاق نقداً في الصالون أو عند الخدمة المنزلية. أحضر المبلغ أو اتفق معه مسبقاً.
                </p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { key: 'cash' as const, label: 'نقداً', icon: Banknote, disabled: false, badge: null as string | null },
                    { key: 'card' as const, label: 'بطاقة', icon: CreditCard, disabled: !cardEnabled, badge: cardEnabled ? null : PAUSED_LABEL },
                    { key: 'ccp' as const, label: 'CCP', icon: CreditCard, disabled: !ccpEnabled, badge: ccpEnabled ? null : PAUSED_LABEL },
                    { key: 'baridi-mob' as const, label: 'بريدي موب', icon: Wallet, disabled: !ccpEnabled, badge: ccpEnabled ? null : PAUSED_LABEL },
                  ]).map(pm => (
                    <button key={pm.key} type="button" disabled={pm.disabled} onClick={() => {
                      registerStep3('paymentMethod').onChange({ target: { value: pm.key } });
                      trackProductEvent('Payment Method Selected', { method: pm.key, barberId: barber.id });
                    }}
                      className="relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all disabled:opacity-45"
                      title={pm.disabled ? 'هذه الطريقة متوقفة حالياً' : undefined}
                      style={{ backgroundColor: watchedPaymentMethod === pm.key ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, borderColor: watchedPaymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.border }}>
                      {pm.badge && (
                        <span className="absolute -top-1.5 left-1 text-[8px] font-black px-1 rounded bg-amber-100 text-amber-700">{pm.badge}</span>
                      )}
                      <pm.icon size={20} style={{ color: watchedPaymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.textMuted }} />
                      <span className="text-[10px] font-bold" style={{ color: watchedPaymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.textMuted }}>{pm.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] mt-2 leading-5" style={{ color: themeConfig.colors.textMuted }}>
                  عند الإطلاق: الدفع النقدي عند الزيارة متاح. البطاقة وCCP وبريدي موب <span className="font-bold" style={{ color: themeConfig.colors.warning }}>{PAUSED_LABEL}</span> حتى تفعيل التحصيل.
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border p-3" style={{ backgroundColor: `${themeConfig.colors.info}08`, borderColor: themeConfig.colors.border }}>
            <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>سياسة الإلغاء</p>
            <p className="text-[10px] mt-1 leading-5" style={{ color: themeConfig.colors.textMuted }}>
              {CANCEL_POLICY.detailsAr}
            </p>
          </div>

          {/* Mobile service */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="flex items-center gap-2"><Car size={18} style={{ color: themeConfig.colors.primary }} /><span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>خدمة متنقلة (يأتي لعندك)</span></div>
            <button type="button" onClick={() => registerStep3('isMobileService').onChange({ target: { value: !watchedIsMobileService } })} className="w-12 h-6 rounded-full relative transition-all" style={{ backgroundColor: watchedIsMobileService ? themeConfig.colors.primary : themeConfig.colors.border }}>
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ right: watchedIsMobileService ? '2px' : 'auto', left: watchedIsMobileService ? 'auto' : '2px' }} />
            </button>
          </div>

          {/* Address for mobile */}
          {watchedIsMobileService && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>العنوان</p>
              <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: step3Errors.address ? themeConfig.colors.error : themeConfig.colors.border }}>
                <MapPin size={16} style={{ color: step3Errors.address ? themeConfig.colors.error : themeConfig.colors.primary }} />
                <input type="text" {...registerStep3('address')} placeholder="أدخل عنوانك" className="flex-1 text-xs outline-none" style={{ backgroundColor: 'transparent', color: themeConfig.colors.text }} />
              </div>
              {step3Errors.address && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{step3Errors.address.message}</p>}
            </div>
          )}

          {/* Note */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>ملاحظات (اختياري)</p>
            <textarea {...registerStep3('note')} placeholder="أي ملاحظات خاصة..." rows={2} className="w-full p-3 rounded-xl border text-xs resize-none" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} />
          </div>

          {(saveError || paymentError || ccpError) && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
              <AlertTriangle size={16} style={{ color: themeConfig.colors.error }} />
              <p className="text-xs" style={{ color: themeConfig.colors.error }}>{saveError || paymentError || ccpError}</p>
            </div>
          )}

          <button type="submit" disabled={isSaving || isPaymentProcessing || isCCPProcessing}
            className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}>
            {(isSaving || isPaymentProcessing || isCCPProcessing) ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" /> {watchedPaymentMethod === 'card' ? 'جاري التوجيه للدفع...' : 'جاري الحفظ...'}</> : <>{watchedPaymentMethod === 'card' ? `الدفع بالبطاقة - ${money(payableTotal)}` : `تأكيد الحجز - ${money(payableTotal)}`}</>}
          </button>
        </form>
      )}
    </motion.div>
  );
}
