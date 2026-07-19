import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarOff, Check, Clock, Loader2, Plus, User as UserIcon, Wallet, X,
} from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import {
  addAvailabilityException,
  createWalkInBooking,
  getProfessionalServices,
} from '@/supabase/database';
import type { Service } from '@/types/supabase-aliases';
import { isCashOnlyPayments } from '@/lib/featureFlags';

type SheetMode = 'menu' | 'walkin' | 'block' | null;

interface Props {
  proId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export default function BarberQuickEntry({ proId, open, onClose, onDone }: Props) {
  const { themeConfig } = useApp();
  const [mode, setMode] = useState<SheetMode>('menu');
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [guestName, setGuestName] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState('cash');
  const [completeNow, setCompleteNow] = useState(true);
  const [blockReason, setBlockReason] = useState('إغلاق مؤقت لليوم');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('menu');
    setError('');
    setSelected([]);
    setGuestName('');
    setNote('');
    setCompleteNow(true);
    void getProfessionalServices(proId).then(setServices).catch(() => setServices([]));
  }, [open, proId]);

  const toggleService = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submitWalkIn = async () => {
    if (selected.length === 0) {
      setError('اختر خدمة واحدة على الأقل');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createWalkInBooking({
        serviceIds: selected,
        guestName: guestName.trim() || undefined,
        note: note.trim() || undefined,
        paymentMethod: payment,
        markCompleted: completeNow,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل العميل');
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    setBusy(true);
    setError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      await addAvailabilityException({
        professional_id: proId,
        date: today,
        type: 'unavailable',
        reason: blockReason.trim() || 'إغلاق مؤقت',
        start_time: null,
        end_time: null,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إغلاق اليوم');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/45" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-lg rounded-t-3xl border-t p-4 pb-8 max-h-[88vh] overflow-y-auto"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>إدخال سريع</p>
                <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>عميل مباشر · إغلاق فترة · بدون تعقيد</p>
              </div>
              <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
                <X size={16} style={{ color: themeConfig.colors.textMuted }} />
              </button>
            </div>

            {mode === 'menu' && (
              <div className="grid gap-2">
                <button type="button" onClick={() => setMode('walkin')} className="flex items-center gap-3 p-3 rounded-2xl text-right" style={{ backgroundColor: themeConfig.colors.background }}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '18' }}>
                    <UserIcon size={18} style={{ color: themeConfig.colors.primary }} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold" style={{ color: themeConfig.colors.text }}>عميل بدون حجز</span>
                    <span className="block text-[11px]" style={{ color: themeConfig.colors.textMuted }}>سجّل زيارة مباشرة مع الخدمة والسعر</span>
                  </span>
                </button>
                <button type="button" onClick={() => setMode('block')} className="flex items-center gap-3 p-3 rounded-2xl text-right" style={{ backgroundColor: themeConfig.colors.background }}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F59E0B18' }}>
                    <CalendarOff size={18} style={{ color: '#F59E0B' }} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold" style={{ color: themeConfig.colors.text }}>إغلاق اليوم</span>
                    <span className="block text-[11px]" style={{ color: themeConfig.colors.textMuted }}>أضف استثناء توفر لليوم الحالي</span>
                  </span>
                </button>
              </div>
            )}

            {mode === 'walkin' && (
              <div className="space-y-3">
                <button type="button" onClick={() => setMode('menu')} className="text-[11px] font-bold" style={{ color: themeConfig.colors.primary }}>رجوع</button>
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="اسم العميل (اختياري)"
                  className="w-full h-11 rounded-xl border px-3 text-sm"
                  style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                />
                <div className="space-y-2">
                  <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>الخدمات</p>
                  {services.length === 0 ? (
                    <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>أضف خدمات من الملف الشخصي أولاً</p>
                  ) : services.map(service => {
                    const active = selected.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border text-right"
                        style={{
                          backgroundColor: active ? themeConfig.colors.primary + '12' : themeConfig.colors.background,
                          borderColor: active ? themeConfig.colors.primary : themeConfig.colors.border,
                        }}
                      >
                        <span>
                          <span className="block text-sm font-bold" style={{ color: themeConfig.colors.text }}>{service.name}</span>
                          <span className="block text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{service.duration_minutes} د · {service.price} دج</span>
                        </span>
                        {active ? <Check size={16} style={{ color: themeConfig.colors.primary }} /> : <Plus size={16} style={{ color: themeConfig.colors.textMuted }} />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  {(isCashOnlyPayments()
                    ? [{ id: 'cash', label: 'نقدي', icon: Wallet }]
                    : [
                        { id: 'cash', label: 'نقدي', icon: Wallet },
                        { id: 'ccp', label: 'CCP', icon: Wallet },
                        { id: 'baridi-mob', label: 'بريدي موب', icon: Wallet },
                      ]
                  ).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPayment(item.id)}
                      className="flex-1 h-10 rounded-xl text-[11px] font-bold"
                      style={{
                        backgroundColor: payment === item.id ? themeConfig.colors.primary : themeConfig.colors.background,
                        color: payment === item.id ? '#fff' : themeConfig.colors.textMuted,
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs" style={{ color: themeConfig.colors.text }}>
                  <input type="checkbox" checked={completeNow} onChange={e => setCompleteNow(e.target.checked)} />
                  إكمال فوري (العميل يُخدم الآن)
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="ملاحظة سريعة (قصة، تفضيل، حساسية...)"
                  className="w-full rounded-xl border p-3 text-sm resize-none"
                  style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                />
                {error && <p className="text-xs" style={{ color: themeConfig.colors.error }}>{error}</p>}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submitWalkIn()}
                  className="w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: themeConfig.colors.primary }}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                  تسجيل الزيارة
                </button>
              </div>
            )}

            {mode === 'block' && (
              <div className="space-y-3">
                <button type="button" onClick={() => setMode('menu')} className="text-[11px] font-bold" style={{ color: themeConfig.colors.primary }}>رجوع</button>
                <textarea
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border p-3 text-sm resize-none"
                  style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                />
                {error && <p className="text-xs" style={{ color: themeConfig.colors.error }}>{error}</p>}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submitBlock()}
                  className="w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  {busy ? 'جاري الحفظ...' : 'إغلاق اليوم'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
