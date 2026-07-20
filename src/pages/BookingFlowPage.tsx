import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Clock, MapPin, Car, CreditCard,
  Wallet, Banknote, Calendar, X, AlertTriangle, Phone,
} from 'lucide-react';
import {
  createBookingWithServices,
  getLoyaltyDashboard,
  sendNotification,
  updateBookingStatus,
  getProfessionalExceptions,
} from '@/supabase/database';
import { updateUserProfile } from '@/supabase/auth';
import { usePayment } from '@/hooks/usePayment';
import { useCCPPayment } from '@/hooks/useCCPPayment';
import { ReceiptUpload } from '@/components/payment/ReceiptUpload';
import type { Service, BookingStatus, PaymentStatus } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingStep3Schema, normalizeAlgerianPhone } from '@/lib/validation';
import type { BookingStep3FormData } from '@/lib/validation';
import { FEATURE_FLAGS, PAUSED_LABEL, isCashOnlyPayments } from '@/lib/featureFlags';
import { CANCEL_POLICY } from '@/lib/cancelPolicy';
import { trackProductEvent } from '@/lib/product-analytics';
import { reportClientError } from '@/lib/error-reporting';
import { useI18n } from '@/hooks/useI18n';

type PreferredPeriod = 'morning' | 'afternoon' | 'evening' | 'any';

const PREFERRED_PERIODS: { key: PreferredPeriod; label: string; hint: string }[] = [
  { key: 'any', label: 'أي وقت', hint: 'الحلاق يقترح الأنسب' },
  { key: 'morning', label: 'صباحاً', hint: '08:00 – 12:00' },
  { key: 'afternoon', label: 'بعد الظهر', hint: '12:00 – 17:00' },
  { key: 'evening', label: 'مساءً', hint: '17:00 – 21:00' },
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

function periodLabel(period: PreferredPeriod): string {
  return PREFERRED_PERIODS.find(p => p.key === period)?.label || 'أي وقت';
}

export default function BookingFlowPage() {
  const { themeConfig, screenParams, barbers, addBooking, navigate, setActiveTab, goBack, refreshData } = useApp();
  const { money } = useI18n();
  const { appUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [initializedFromParams, setInitializedFromParams] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [preferredPeriod, setPreferredPeriod] = useState<PreferredPeriod>('any');
  const { initiatePayment, isProcessing: isPaymentProcessing, error: paymentError } = usePayment();
  const { createCCPPayment, uploadReceiptAndSubmit, isProcessing: isCCPProcessing, uploadProgress, error: ccpError } = useCCPPayment();
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [ccpPaymentId, setCcpPaymentId] = useState<string | null>(null);
  const [savedBookingId, setSavedBookingId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [closedDates, setClosedDates] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucher[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneGateError, setPhoneGateError] = useState('');
  const [localPhone, setLocalPhone] = useState<string | null>(null);

  const {
    register: registerStep3,
    handleSubmit: handleStep3Submit,
    formState: { errors: step3Errors },
    watch: watchStep3,
    setValue: setStep3Value,
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
  const effectivePhone = localPhone || appUser?.phone_number || null;
  const needsPhoneGate = Boolean(appUser) && !effectivePhone;

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
        setSaveError('تم إلغاء الطلب لأن الدفع لم يكتمل. يمكنك المحاولة مرة أخرى.');
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

  /** Full-day closures for the next 14 days */
  useEffect(() => {
    if (!barber?.id) {
      setClosedDates(new Set());
      return;
    }
    let cancelled = false;
    const range = generateDates();
    const from = range[0]?.full;
    const to = range[range.length - 1]?.full;
    void getProfessionalExceptions(barber.id, from, to)
      .then((exceptions) => {
        if (cancelled) return;
        const closed = new Set<string>();
        for (const item of exceptions) {
          // Full-day closure: no start/end window
          if (!item.start_time && !item.end_time) {
            closed.add(item.date);
          }
        }
        setClosedDates(closed);
      })
      .catch((err) => {
        console.error('Failed to fetch exceptions:', err);
        if (!cancelled) setClosedDates(new Set());
      });
    return () => { cancelled = true; };
  }, [barber?.id]);

  const getDayHours = useCallback((dateStr: string): { open: string; close: string } | null => {
    if (!barber?.workingHours) return null;
    const jsDay = new Date(dateStr + 'T12:00:00').getDay();
    const dayKey = JS_DAY_TO_KEY[jsDay];
    return (barber.workingHours as Record<string, { open: string; close: string }>)[dayKey] || null;
  }, [barber?.workingHours]);

  const isDateAvailable = useCallback((dateStr: string): boolean => {
    const hours = getDayHours(dateStr);
    if (!hours) return false;
    if (hours.open === 'closed' || hours.close === 'closed') return false;
    if (closedDates.has(dateStr)) return false;
    return true;
  }, [closedDates, getDayHours]);

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

  const handleSavePhone = async () => {
    if (!appUser) {
      setPhoneGateError('يجب تسجيل الدخول أولاً');
      return;
    }
    const normalized = normalizeAlgerianPhone(phoneDraft);
    if (!normalized) {
      setPhoneGateError('أدخل رقماً جزائرياً صالحاً (مثال: 0555123456)');
      return;
    }
    setPhoneSaving(true);
    setPhoneGateError('');
    try {
      await updateUserProfile(appUser.id, { phone_number: normalized });
      setLocalPhone(normalized);
      trackProductEvent('Booking Phone Saved', { barberId: barber.id });
    } catch (err) {
      console.error('Failed to save phone:', err);
      setPhoneGateError(err instanceof Error ? err.message : 'تعذر حفظ رقم الهاتف');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleConfirmStep3 = async (data: BookingStep3FormData) => {
    if (!appUser) {
      setSaveError('يجب تسجيل الدخول لإتمام الحجز');
      return;
    }
    if (!effectivePhone) {
      setSaveError('رقم الهاتف مطلوب لإرسال طلب الحجز');
      return;
    }
    if (!selectedDate) {
      setSaveError('يرجى اختيار التاريخ المفضل');
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

      const saved = await createBookingWithServices({
        professionalId: barber.id,
        serviceIds: selectedServicesData.map(service => service.id),
        preferredDate: selectedDate,
        preferredTimeOfDay: preferredPeriod,
        note: data.note,
        paymentMethod: data.paymentMethod,
        isMobileService: data.isMobileService,
        mobileAddress: data.address,
        voucherCode: selectedVoucher?.code,
      });

      if (saved) {
        trackProductEvent('Booking Request Submitted', {
          barberId: barber.id,
          serviceCount: selectedServicesData.length,
          paymentMethod: data.paymentMethod,
          total: saved.total_price,
          preferredDate: selectedDate,
          preferredPeriod,
          usedVoucher: Boolean(selectedVoucher),
        });

        if (data.paymentMethod === 'card') {
          const baseUrl = window.location.origin;
          const lineItems = [{
            name: selectedServicesData.map(service => service.name).join(' + '),
            description: `طلب حجز مع ${barber.name}${selectedVoucher ? ` بعد ${selectedVoucher.title}` : ''}`,
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
                preferred_date: selectedDate,
                preferred_period: preferredPeriod,
              },
              successUrl: `${baseUrl}/?screen=payment-success&booking_id=${encodeURIComponent(saved.id)}`,
              cancelUrl: `${baseUrl}/?screen=booking-flow&barberId=${encodeURIComponent(barber.id)}&cancelledBooking=${encodeURIComponent(saved.id)}`,
              customerEmail: undefined,
            });
            return;
          } catch (payErr) {
            try {
              await updateBookingStatus(saved.id, 'cancelled');
            } catch (cancelErr) {
              console.error('Failed to cancel unpaid booking after Stripe error:', cancelErr);
              reportClientError(cancelErr instanceof Error ? cancelErr : new Error(String(cancelErr)));
            }
            setSaveError(payErr instanceof Error ? payErr.message : 'تعذر بدء الدفع بالبطاقة. ألغينا الطلب تلقائياً.');
            setIsSaving(false);
            return;
          }
        }

        if (data.paymentMethod === 'ccp' || data.paymentMethod === 'baridi-mob') {
          const paymentId = await createCCPPayment({
            bookingId: saved.id,
            clientId: appUser.id,
            professionalId: barber.id,
            amount: saved.total_price,
            currency: 'dzd',
            metadata: {
              barber_name: barber.name,
              preferred_date: selectedDate,
              preferred_period: preferredPeriod,
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

        try {
          await sendNotification({
            userId: barber.id,
            title: 'طلب حجز جديد',
            message: `طلب جديد من ${appUser.full_name || 'عميل'} — ${selectedDate} (${periodLabel(preferredPeriod)}). اتصل بالعميل لتحديد الوقت.`,
            type: 'booking',
            metadata: { booking_id: saved.id },
          });
        } catch (err) {
          console.error('Failed to notify barber:', err);
        }

        try {
          await sendNotification({
            userId: appUser.id,
            title: 'تم إرسال طلب الحجز',
            message: `تم إرسال طلبك إلى ${barber.name}. سيتصل بك لتحديد الموعد بدقة.`,
            type: 'booking',
            metadata: { booking_id: saved.id },
          });
        } catch (err) {
          console.error('Failed to notify client:', err);
        }

        const newBooking = {
          id: saved.id,
          barberId: barber.id,
          barberName: barber.name,
          barberAvatar: barber.avatar,
          services: selectedServicesData,
          date: selectedDate,
          time: '',
          timeSetByBarber: false,
          preferredTimeOfDay: preferredPeriod,
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

        await refreshData();
        setConfirmed(true);
      }
    } catch (err) {
      console.error('Booking save failed:', err);
      const message = err instanceof Error ? err.message : 'فشل إرسال الطلب. يرجى المحاولة مرة أخرى.';
      if (message === 'PHONE_REQUIRED') {
        setLocalPhone(null);
        setSaveError('رقم الهاتف مطلوب لإرسال طلب الحجز');
      } else {
        setSaveError(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Phone gate — mandatory before booking
  if (needsPhoneGate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-screen flex flex-col p-4"
        style={{ backgroundColor: themeConfig.colors.background }}
      >
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.surface }}
          >
            <X size={18} style={{ color: themeConfig.colors.text }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>رقم الهاتف مطلوب</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: themeConfig.colors.primary + '15' }}
          >
            <Phone size={28} style={{ color: themeConfig.colors.primary }} />
          </div>
          <h2 className="text-base font-bold mb-2" style={{ color: themeConfig.colors.text }}>
            أضف رقم هاتفك للمتابعة
          </h2>
          <p className="text-xs mb-6 leading-5" style={{ color: themeConfig.colors.textMuted }}>
            الحلاق سيتصل بك لتأكيد الموعد وتحديد الوقت المناسب. رقم جزائري صالح مطلوب.
          </p>

          <div
            className="w-full flex items-center gap-2 p-3 rounded-xl border mb-3"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: phoneGateError ? themeConfig.colors.error : themeConfig.colors.border,
            }}
          >
            <Phone size={16} style={{ color: themeConfig.colors.primary }} />
            <input
              type="tel"
              inputMode="tel"
              value={phoneDraft}
              onChange={(e) => { setPhoneDraft(e.target.value); setPhoneGateError(''); }}
              placeholder="0555123456"
              className="flex-1 text-sm outline-none text-right"
              style={{ backgroundColor: 'transparent', color: themeConfig.colors.text }}
              dir="ltr"
            />
          </div>

          {phoneGateError && (
            <p className="text-[11px] mb-3 w-full text-right" style={{ color: themeConfig.colors.error }}>
              {phoneGateError}
            </p>
          )}

          <button
            type="button"
            disabled={phoneSaving || !phoneDraft.trim()}
            onClick={() => void handleSavePhone()}
            className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            {phoneSaving ? (
              <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
            ) : (
              'حفظ والمتابعة'
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  if (showReceiptUpload && ccpPaymentId && savedBookingId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-screen flex flex-col p-4 overflow-y-auto"
        style={{ backgroundColor: themeConfig.colors.background }}
      >
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setShowReceiptUpload(false); setConfirmed(true); }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.surface }}
          >
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
              clientName: appUser?.full_name || 'عميل',
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
        <p className="text-xs mb-2 leading-5" style={{ color: themeConfig.colors.textMuted }}>
          اليوم المفضل: {selectedDate} — {periodLabel(preferredPeriod)}
        </p>
        <div
          className="w-full max-w-xs flex items-start gap-2 p-3 rounded-xl mb-4 text-right"
          style={{ backgroundColor: themeConfig.colors.primary + '12' }}
        >
          <Phone size={16} className="mt-0.5 flex-shrink-0" style={{ color: themeConfig.colors.primary }} />
          <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.text }}>
            سيتصل بك الحلاق قريباً لتأكيد الموعد وتحديد الوقت المناسب لك.
          </p>
        </div>
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
            <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>المدة التقريبية</span>
            <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{totalDuration} دقيقة</span>
          </div>
          <div className="flex justify-between pt-2 border-t" style={{ borderColor: themeConfig.colors.border }}>
            <span className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الإجمالي</span>
            <span className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{money(payableTotal)}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full max-w-xs">
          <button
            type="button"
            onClick={() => navigate('barber-detail', { barberId: barber.id })}
            className="flex-1 h-12 rounded-xl text-sm font-bold border"
            style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          >
            تفاصيل المختص
          </button>
          <button
            type="button"
            onClick={() => { setConfirmed(false); setActiveTab('appointments'); }}
            className="flex-1 h-12 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            متابعة حالة الطلب
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
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}
      >
        <button
          type="button"
          onClick={step > 1 ? () => setStep((prev) => (prev - 1) as 1 | 2 | 3) : goBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
        >
          {step > 1
            ? <ArrowLeft size={22} style={{ color: themeConfig.colors.text }} />
            : <X size={22} style={{ color: themeConfig.colors.text }} />}
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
            {step === 1 ? 'اختيار الخدمات' : step === 2 ? 'اليوم المفضل' : 'تأكيد الطلب'}
          </h1>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full"
                style={{ backgroundColor: s <= step ? themeConfig.colors.primary : themeConfig.colors.border }}
              />
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
            <div>
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{barber.name}</p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>اختر الخدمات المطلوبة</p>
            </div>
          </div>

          <div className="space-y-2">
            {barber.services.map((svc: Service) => {
              const isSelected = selectedServices.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-right"
                  style={{
                    backgroundColor: isSelected ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                    borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border,
                      backgroundColor: isSelected ? themeConfig.colors.primary : 'transparent',
                    }}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{svc.name}</p>
                    <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{svc.duration} دقيقة</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{money(svc.price)}</p>
                </button>
              );
            })}
          </div>

          {saveError && step === 1 && (
            <div className="flex items-center gap-2 p-3 rounded-xl mt-3" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
              <AlertTriangle size={16} style={{ color: themeConfig.colors.error }} />
              <p className="text-xs" style={{ color: themeConfig.colors.error }}>{saveError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (selectedServices.length > 0) {
                setSaveError(null);
                setStep(2);
              } else {
                setSaveError('اختر خدمة واحدة على الأقل');
              }
            }}
            className="w-full h-12 rounded-xl text-sm font-bold text-white mt-4"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            متابعة
          </button>
        </div>
      )}

      {/* === STEP 2: PREFERRED DATE + PERIOD === */}
      {step === 2 && (
        <div className="px-4 mt-4">
          <div
            className="flex items-start gap-2 p-3 rounded-xl mb-4"
            style={{ backgroundColor: themeConfig.colors.primary + '10' }}
          >
            <Phone size={16} className="mt-0.5 flex-shrink-0" style={{ color: themeConfig.colors.primary }} />
            <p className="text-[11px] leading-5 text-right" style={{ color: themeConfig.colors.text }}>
              اختر اليوم والفترة المفضلة فقط. الحلاق سيتصل بك لتحديد الوقت الدقيق بعد استلام الطلب.
            </p>
          </div>

          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} style={{ color: themeConfig.colors.primary }} />
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>اختر اليوم المفضل</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {dates.map(d => {
                const isAvailable = isDateAvailable(d.full);
                const isSelected = selectedDate === d.full;
                return (
                  <button
                    key={d.full}
                    type="button"
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedDate(d.full);
                        trackProductEvent('Booking Date Selected', { barberId: barber.id, date: d.full });
                      }
                    }}
                    disabled={!isAvailable}
                    className="flex-shrink-0 w-16 h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
                    style={{
                      backgroundColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.surface,
                      borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border,
                    }}
                  >
                    <span className="text-[10px] font-medium" style={{ color: isSelected ? '#fff' : themeConfig.colors.textMuted }}>{d.day}</span>
                    <span className="text-lg font-bold" style={{ color: isSelected ? '#fff' : themeConfig.colors.text }}>{d.date}</span>
                    <span className="text-[9px]" style={{ color: isSelected ? '#fff' : themeConfig.colors.textMuted }}>{d.month}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} style={{ color: themeConfig.colors.primary }} />
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>الفترة المفضلة</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PREFERRED_PERIODS.map(period => {
                const isSelected = preferredPeriod === period.key;
                return (
                  <button
                    key={period.key}
                    type="button"
                    onClick={() => {
                      setPreferredPeriod(period.key);
                      trackProductEvent('Booking Period Selected', {
                        barberId: barber.id,
                        period: period.key,
                      });
                    }}
                    className="p-3 rounded-xl border text-right transition-all"
                    style={{
                      backgroundColor: isSelected ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                      borderColor: isSelected ? themeConfig.colors.primary : themeConfig.colors.border,
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: isSelected ? themeConfig.colors.primary : themeConfig.colors.text }}>
                      {period.label}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>
                      {period.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
              <AlertTriangle size={16} style={{ color: themeConfig.colors.error }} />
              <p className="text-xs" style={{ color: themeConfig.colors.error }}>{saveError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (selectedDate) {
                setSaveError(null);
                setStep(3);
              } else {
                setSaveError('اختر اليوم المفضل');
              }
            }}
            className="w-full h-12 rounded-xl text-sm font-bold text-white mt-2"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            متابعة
          </button>
        </div>
      )}

      {/* === STEP 3: CONFIRM === */}
      {step === 3 && (
        <form onSubmit={handleStep3Submit(handleConfirmStep3)} className="px-4 mt-4 space-y-4">
          <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="flex items-center gap-2 mb-3">
              <img src={barber.avatar} alt={barber.name} className="w-8 h-8 rounded-lg object-cover" />
              <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{barber.name}</p>
            </div>
            <div className="space-y-2">
              {selectedServicesData.map(svc => (
                <div key={svc.id} className="flex justify-between">
                  <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name}</span>
                  <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{money(svc.price)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t" style={{ borderColor: themeConfig.colors.border }}>
              <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>اليوم المفضل</span>
              <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{selectedDate}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>الفترة</span>
              <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{periodLabel(preferredPeriod)}</span>
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
                <button
                  type="button"
                  onClick={() => setSelectedVoucherId('')}
                  className="w-full p-3 rounded-xl border text-right text-xs"
                  style={{
                    backgroundColor: !selectedVoucherId ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                    borderColor: !selectedVoucherId ? themeConfig.colors.primary : themeConfig.colors.border,
                    color: themeConfig.colors.text,
                  }}
                >
                  بدون قسيمة
                </button>
                {availableVouchers.map(voucher => (
                  <button
                    key={voucher.id}
                    type="button"
                    onClick={() => {
                      setSelectedVoucherId(voucher.id);
                      trackProductEvent('Loyalty Voucher Selected', { discountPercent: voucher.discountPercent });
                    }}
                    className="w-full p-3 rounded-xl border flex items-center justify-between"
                    style={{
                      backgroundColor: selectedVoucherId === voucher.id ? themeConfig.colors.success + '10' : themeConfig.colors.surface,
                      borderColor: selectedVoucherId === voucher.id ? themeConfig.colors.success : themeConfig.colors.border,
                    }}
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{voucher.title}</p>
                      <p className="text-[9px] font-mono mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{voucher.code}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: themeConfig.colors.success }}>خصم {voucher.discountPercent}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    <button
                      key={pm.key}
                      type="button"
                      disabled={pm.disabled}
                      onClick={() => {
                        setStep3Value('paymentMethod', pm.key);
                        trackProductEvent('Payment Method Selected', { method: pm.key, barberId: barber.id });
                      }}
                      className="relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all disabled:opacity-45"
                      title={pm.disabled ? 'هذه الطريقة متوقفة حالياً' : undefined}
                      style={{
                        backgroundColor: watchedPaymentMethod === pm.key ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                        borderColor: watchedPaymentMethod === pm.key ? themeConfig.colors.primary : themeConfig.colors.border,
                      }}
                    >
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

          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="flex items-center gap-2">
              <Car size={18} style={{ color: themeConfig.colors.primary }} />
              <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>خدمة متنقلة (يأتي لعندك)</span>
            </div>
            <button
              type="button"
              onClick={() => setStep3Value('isMobileService', !watchedIsMobileService)}
              className="w-12 h-6 rounded-full relative transition-all"
              style={{ backgroundColor: watchedIsMobileService ? themeConfig.colors.primary : themeConfig.colors.border }}
            >
              <div
                className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                style={{ right: watchedIsMobileService ? '2px' : 'auto', left: watchedIsMobileService ? 'auto' : '2px' }}
              />
            </button>
          </div>

          {watchedIsMobileService && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>العنوان</p>
              <div
                className="flex items-center gap-2 p-3 rounded-xl border"
                style={{
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: step3Errors.address ? themeConfig.colors.error : themeConfig.colors.border,
                }}
              >
                <MapPin size={16} style={{ color: step3Errors.address ? themeConfig.colors.error : themeConfig.colors.primary }} />
                <input
                  type="text"
                  {...registerStep3('address')}
                  placeholder="أدخل عنوانك"
                  className="flex-1 text-xs outline-none"
                  style={{ backgroundColor: 'transparent', color: themeConfig.colors.text }}
                />
              </div>
              {step3Errors.address && (
                <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{step3Errors.address.message}</p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.text }}>ملاحظات (اختياري)</p>
            <textarea
              {...registerStep3('note')}
              placeholder="أي ملاحظات خاصة..."
              rows={2}
              className="w-full p-3 rounded-xl border text-xs resize-none"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
            />
          </div>

          {(saveError || paymentError || ccpError) && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
              <AlertTriangle size={16} style={{ color: themeConfig.colors.error }} />
              <p className="text-xs" style={{ color: themeConfig.colors.error }}>{saveError || paymentError || ccpError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving || isPaymentProcessing || isCCPProcessing}
            className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            {(isSaving || isPaymentProcessing || isCCPProcessing) ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                {watchedPaymentMethod === 'card' ? 'جاري التوجيه للدفع...' : 'جاري إرسال الطلب...'}
              </>
            ) : (
              <>
                {watchedPaymentMethod === 'card'
                  ? `الدفع بالبطاقة - ${money(payableTotal)}`
                  : `إرسال طلب الحجز - ${money(payableTotal)}`}
              </>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
