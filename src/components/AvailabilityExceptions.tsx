import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { CalendarOff, Plus, AlertCircle, Info, Trash2 } from 'lucide-react';
import {
  addAvailabilityException,
  deleteAvailabilityException,
  getProfessionalExceptions,
} from '@/supabase/database';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { availabilityExceptionSchema } from '@/lib/validation';
import type { AvailabilityExceptionFormData } from '@/lib/validation';

interface ExceptionItem {
  id: string;
  date: string;
  type: string;
  reason: string;
}

const EXCEPTION_TYPES = [
  { key: 'holiday', dbValue: 'holiday', label: 'عطلة رسمية' },
  { key: 'vacation', dbValue: 'special', label: 'إجازة شخصية' },
  { key: 'closed', dbValue: 'unavailable', label: 'مغلق' },
];

export default function AvailabilityExceptions({ barberId }: { barberId: string }) {
  const { themeConfig } = useApp();
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register: registerException,
    handleSubmit: handleExceptionSubmit,
    formState: { errors: exceptionErrors, isSubmitting: isAdding },
    reset: resetExceptionForm,
    watch: watchException,
  } = useForm<AvailabilityExceptionFormData>({
    resolver: zodResolver(availabilityExceptionSchema),
    defaultValues: {
      date: '',
      type: 'closed',
      reason: '',
    },
  });

  const watchedType = watchException('type');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getProfessionalExceptions(barberId)
      .then(rows => {
        if (active) {
          setExceptions(rows.map(row => ({
            id: row.id,
            date: row.date,
            type: row.type,
            reason: row.reason || '',
          })));
        }
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'فشل تحميل الاستثناءات');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [barberId]);

  const onAddException = async (data: AvailabilityExceptionFormData) => {
    setError(null);
    try {
      const selectedType = EXCEPTION_TYPES.find(item => item.key === data.type);
      const created = await addAvailabilityException({
        professional_id: barberId,
        date: data.date,
        type: selectedType?.dbValue || 'unavailable',
        reason: data.reason?.trim() || null,
        start_time: null,
        end_time: null,
      });
      setExceptions(prev => [...prev, {
        id: created.id,
        date: created.date,
        type: created.type,
        reason: created.reason || '',
      }].sort((a, b) => a.date.localeCompare(b.date)));
      setShowForm(false);
      resetExceptionForm({ date: '', type: 'closed', reason: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إضافة الاستثناء');
    }
  };

  const removeException = async (id: string) => {
    const previous = exceptions;
    setExceptions(items => items.filter(item => item.id !== id));
    try {
      await deleteAvailabilityException(id);
    } catch (err) {
      setExceptions(previous);
      setError(err instanceof Error ? err.message : 'فشل حذف الاستثناء');
    }
  };

  const getTypeLabel = (type: string) =>
    EXCEPTION_TYPES.find(t => t.key === type || t.dbValue === type)?.label || type;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-DZ', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.info + '10', border: `1px solid ${themeConfig.colors.info}25` }}>
        <Info size={16} style={{ color: themeConfig.colors.info }} />
        <p className="text-xs flex-1" style={{ color: themeConfig.colors.info }}>
          أضف أيام الإغلاق والإجازات ليتم استبعادها تلقائياً من مواعيد الحجز.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarOff size={16} style={{ color: themeConfig.colors.primary }} />
          <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>أيام الإغلاق والعطل</span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
          style={{
            backgroundColor: themeConfig.colors.primary + '15',
            color: themeConfig.colors.primary,
          }}
        >
          <Plus size={12} />
          إضافة
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form
          onSubmit={handleExceptionSubmit(onAddException)}
          className="p-3 rounded-xl border space-y-3"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          {/* Date */}
          <div>
            <label className="text-[10px] font-bold block mb-1" style={{ color: themeConfig.colors.textMuted }}>التاريخ</label>
            <input
              type="date"
              {...registerException('date')}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg text-xs border"
              style={{
                backgroundColor: themeConfig.colors.background,
                borderColor: exceptionErrors.date ? themeConfig.colors.error : themeConfig.colors.border,
                color: themeConfig.colors.text,
              }}
            />
            {exceptionErrors.date && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{exceptionErrors.date.message}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] font-bold block mb-1" style={{ color: themeConfig.colors.textMuted }}>النوع</label>
            <div className="flex gap-2">
              {EXCEPTION_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => registerException('type').onChange({ target: { value: t.key } })}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                  style={{
                    backgroundColor: watchedType === t.key ? themeConfig.colors.primary + '15' : themeConfig.colors.background,
                    borderColor: watchedType === t.key ? themeConfig.colors.primary : themeConfig.colors.border,
                    color: watchedType === t.key ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[10px] font-bold block mb-1" style={{ color: themeConfig.colors.textMuted }}>السبب (اختياري)</label>
            <input
              type="text"
              {...registerException('reason')}
              placeholder="مثال: عيد الأضحى"
              className="w-full px-3 py-2 rounded-lg text-xs border"
              style={{
                backgroundColor: themeConfig.colors.background,
                borderColor: themeConfig.colors.border,
                color: themeConfig.colors.text,
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetExceptionForm(); }}
              className="flex-1 h-9 rounded-lg text-[10px] font-bold border"
              style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="flex-1 h-9 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              {isAdding ? 'جاري الإضافة...' : 'إضافة'}
            </button>
          </div>
        </form>
      )}

      {/* Exceptions List */}
      {isLoading && (
        <p className="text-[10px] text-center py-4" style={{ color: themeConfig.colors.textMuted }}>
          جاري تحميل أيام الإغلاق...
        </p>
      )}

      {!isLoading && exceptions.length === 0 && !showForm && (
        <p className="text-[10px] text-center py-4" style={{ color: themeConfig.colors.textMuted }}>
          لا توجد أيام إغلاق مسجلة
        </p>
      )}

      {exceptions
        .filter(e => new Date(e.date) >= new Date(new Date().toISOString().split('T')[0]))
        .map(exception => (
          <div
            key={exception.id}
            className="flex items-center justify-between p-3 rounded-xl border"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <div>
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>
                {formatDate(exception.date)}
              </p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                {exception.reason || getTypeLabel(exception.type)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: themeConfig.colors.error + '15',
                  color: themeConfig.colors.error,
                }}
              >
                {getTypeLabel(exception.type)}
              </span>
              <button
                type="button"
                onClick={() => void removeException(exception.id)}
                aria-label="حذف يوم الإغلاق"
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: themeConfig.colors.error + '10' }}>
          <AlertCircle size={14} style={{ color: themeConfig.colors.error }} />
          <span className="text-[10px]" style={{ color: themeConfig.colors.error }}>{error}</span>
        </div>
      )}
    </div>
  );
}
