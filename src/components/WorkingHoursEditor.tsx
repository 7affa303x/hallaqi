import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { getProfessionalSchedules, updateProfessionalSchedules } from '@/supabase/database';
import { Clock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workingHoursSchema } from '@/lib/validation';
import type { WorkingHoursFormData } from '@/lib/validation';

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface WorkingHoursEditorProps {
  barberId: string;
}

const DAYS = [
  { key: 0, label: 'السبت' },
  { key: 1, label: 'الأحد' },
  { key: 2, label: 'الاثنين' },
  { key: 3, label: 'الثلاثاء' },
  { key: 4, label: 'الأربعاء' },
  { key: 5, label: 'الخميس' },
  { key: 6, label: 'الجمعة' },
];

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map(d => ({
  day_of_week: d.key,
  start_time: '09:00',
  end_time: '18:00',
  is_active: d.key !== 6,
}));

export default function WorkingHoursEditor({ barberId }: WorkingHoursEditorProps) {
  const { themeConfig } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control: controlWH,
    handleSubmit: handleWHSubmit,
    formState: { errors: whErrors, isSubmitting },
    register,
    setValue: setFormValue,
    watch,
  } = useForm<WorkingHoursFormData>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      days: DEFAULT_SCHEDULE.map(d => ({
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        is_active: d.is_active,
      })),
    },
  });

  const { fields } = useFieldArray({
    control: controlWH,
    name: 'days',
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await getProfessionalSchedules(barberId);
        if (data && data.length > 0) {
          const mapped = DAYS.map(d => {
            const found = data.find(s => s.day_of_week === d.key);
            return {
              day_of_week: d.key,
              start_time: found?.start_time || '09:00',
              end_time: found?.end_time || '18:00',
              is_active: found ? (found.is_active ?? false) : d.key !== 6,
            };
          });
          mapped.forEach((day, index) => {
            setFormValue(`days.${index}.day_of_week`, day.day_of_week);
            setFormValue(`days.${index}.start_time`, day.start_time);
            setFormValue(`days.${index}.end_time`, day.end_time);
            setFormValue(`days.${index}.is_active`, day.is_active);
          });
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (barberId) fetchSchedule();
  }, [barberId, setFormValue]);

  const toggleDay = (dayIndex: number) => {
    const currentActive = watch(`days.${dayIndex}.is_active`);
    setFormValue(`days.${dayIndex}.is_active`, !currentActive);
    setSuccess(false); setError(null);
  };

  const onWHSubmit = async (data: WorkingHoursFormData) => {
    setError(null); setSuccess(false);
    try {
      await updateProfessionalSchedules(
        barberId,
        data.days.map(s => ({
          professional_id: barberId,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_active: s.is_active,
        }))
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ ساعات العمل');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: themeConfig.colors.surface }} />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleWHSubmit(onWHSubmit)} className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={16} style={{ color: themeConfig.colors.primary }} />
        <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>جدول العمل الأسبوعي</span>
      </div>

      {fields.map((field, index) => {
        const isActive = watch(`days.${index}.is_active`);
        const startTimeError = whErrors.days?.[index]?.start_time?.message;
        const endTimeError = whErrors.days?.[index]?.end_time?.message;
        const day = DAYS.find(d => d.key === field.day_of_week);

        return (
          <div
            key={field.id}
            className="flex flex-wrap items-center gap-2 p-3 rounded-xl border transition-all"
            style={{
              backgroundColor: isActive ? themeConfig.colors.surface : themeConfig.colors.background,
              borderColor: isActive ? themeConfig.colors.primary + '30' : themeConfig.colors.border,
              opacity: isActive ? 1 : 0.6,
            }}
          >
            <button
              type="button"
              onClick={() => toggleDay(index)}
              className="w-10 h-5 rounded-full relative transition-all flex-shrink-0"
              style={{ backgroundColor: isActive ? themeConfig.colors.primary : themeConfig.colors.border }}
            >
              <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: isActive ? '22px' : '2px' }} />
            </button>
            <span className="text-xs font-bold w-12 flex-shrink-0" style={{ color: themeConfig.colors.text }}>{day?.label}</span>
            {isActive ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0 basis-full sm:basis-auto">
                <input
                  type="time"
                  {...register(`days.${index}.start_time` as const)}
                  className="min-w-0 flex-1 px-1.5 py-1 rounded-lg text-xs border text-center"
                  style={{
                    backgroundColor: themeConfig.colors.background,
                    borderColor: startTimeError ? themeConfig.colors.error : themeConfig.colors.border,
                    color: themeConfig.colors.text,
                  }}
                />
                <span className="text-[10px] flex-shrink-0" style={{ color: themeConfig.colors.textMuted }}>إلى</span>
                <input
                  type="time"
                  {...register(`days.${index}.end_time` as const)}
                  className="min-w-0 flex-1 px-1.5 py-1 rounded-lg text-xs border text-center"
                  style={{
                    backgroundColor: themeConfig.colors.background,
                    borderColor: endTimeError ? themeConfig.colors.error : themeConfig.colors.border,
                    color: themeConfig.colors.text,
                  }}
                />
              </div>
            ) : (
              <span className="text-[10px] font-bold" style={{ color: themeConfig.colors.error }}>مغلق</span>
            )}
          </div>
        );
      })}

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: themeConfig.colors.error + '10' }}>
          <AlertCircle size={14} style={{ color: themeConfig.colors.error }} />
          <span className="text-[10px]" style={{ color: themeConfig.colors.error }}>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: themeConfig.colors.success + '10' }}>
          <CheckCircle size={14} style={{ color: themeConfig.colors.success }} />
          <span className="text-[10px]" style={{ color: themeConfig.colors.success }}>تم حفظ ساعات العمل بنجاح</span>
        </div>
      )}

      <button type="submit" disabled={isSubmitting}
        className="w-full h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ backgroundColor: themeConfig.colors.primary }}>
        {isSubmitting ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-white" /> : <><Save size={14} /> حفظ ساعات العمل</>}
      </button>
    </form>
  );
}
