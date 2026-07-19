import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { getProfessionalServices, createService, updateService, deleteService } from '@/supabase/database';
import type { Service as AppService } from '@/types';
import type { Database } from '@/types/supabase';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { servicesArraySchema } from '@/lib/validation';
import type { ServiceFormData } from '@/lib/validation';

const SERVICE_CATEGORIES: AppService['category'][] = ['haircut', 'beard', 'shave', 'hair_treatment', 'facial', 'coloring', 'styling', 'package'];

const CATEGORY_LABELS: Record<string, string> = {
  haircut: 'قص الشعر', beard: 'تصفيف اللحية', shave: 'الحلاقة', hair_treatment: 'عناية بالشعر',
  facial: 'عناية بالبشرة', coloring: 'صبغة', styling: 'تسريح', package: 'باقة',
};

interface ServicesFormData {
  services: ServiceFormData[];
}

export default function ServicesManagement({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    control,
    handleSubmit: handleFormSubmit,
    formState: { errors: formErrors },
    setValue,
  } = useForm<ServicesFormData>({
    resolver: zodResolver(servicesArraySchema),
    defaultValues: {
      services: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'services',
  });

  useEffect(() => {
    if (!appUser?.id) { setIsLoading(false); return; }
    getProfessionalServices(appUser.id)
      .then(data => {
        const mapped = data.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          price: Number(s.price),
          duration: s.duration_minutes,
          category: (s.category as unknown as AppService['category']) || 'haircut',
        }));
        setValue('services', mapped);
      })
      .catch(() => setError('فشل تحميل الخدمات'))
      .finally(() => setIsLoading(false));
  }, [appUser?.id, setValue]);

  const addService = () => {
    append({ name: '', description: '', price: 500, duration: 30, category: 'haircut' });
    setSuccess(false);
  };

  const handleRemove = (index: number) => {
    remove(index);
    setSuccess(false);
  };

  const onSubmit = async (data: ServicesFormData) => {
    if (!appUser?.id) { setError('لا يوجد معرف للمختص'); return; }

    setIsSaving(true); setError(null); setSuccess(false);
    try {
      const proId = appUser.id;
      const existingServices = await getProfessionalServices(proId);
      const existingById = new Map(existingServices.map(s => [s.id, s]));
      const keptIds = new Set<string>();

      for (const svc of data.services) {
        const payload = {
          name: svc.name.trim(),
          description: (svc.description || '').trim() || null,
          price: svc.price,
          duration_minutes: svc.duration,
          category: svc.category as unknown as Database['public']['Enums']['service_category'],
          is_active: true,
        };

        if (svc.id && existingById.has(svc.id)) {
          await updateService(svc.id, payload);
          keptIds.add(svc.id);
        } else {
          const created = await createService({
            professional_id: proId,
            ...payload,
          });
          if (created?.id) keptIds.add(created.id);
        }
      }

      for (const existing of existingServices) {
        if (keptIds.has(existing.id)) continue;
        try {
          await deleteService(existing.id);
        } catch (err) {
          console.error('Failed to delete service:', err);
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ الخدمات');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="pb-20 min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}><Loader2 size={32} className="animate-spin" style={{ color: themeConfig.colors.primary }} /></div>;
  }

  return (
    <div className="pb-20 min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button type="button" onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>إدارة الخدمات</h2>
      </div>

      <form onSubmit={handleFormSubmit(onSubmit)} className="px-4 mt-4 space-y-4">
        {error && (
          <div className="p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
            <AlertCircle size={16} style={{ color: themeConfig.colors.error }} />
            <p className="text-xs" style={{ color: themeConfig.colors.error }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: themeConfig.colors.success + '15' }}>
            <CheckCircle size={16} style={{ color: themeConfig.colors.success }} />
            <p className="text-xs" style={{ color: themeConfig.colors.success }}>تم حفظ الخدمات بنجاح</p>
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => {
            const nameError = formErrors.services?.[index]?.name?.message;
            const priceError = formErrors.services?.[index]?.price?.message;
            const durationError = formErrors.services?.[index]?.duration?.message;

            return (
              <div key={field.id} className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: nameError ? themeConfig.colors.error : themeConfig.colors.border }}>
                <input type="hidden" {...register(`services.${index}.id` as const)} />
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>الخدمة {index + 1}</h4>
                  <button type="button" onClick={() => handleRemove(index)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
                    <Trash2 size={14} style={{ color: themeConfig.colors.error }} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>الاسم</label>
                  <input
                    type="text"
                    {...register(`services.${index}.name` as const)}
                    placeholder="مثال: قص شعر كلاسيك"
                    className="w-full px-3 py-2 rounded-lg text-xs border"
                    style={{
                      backgroundColor: themeConfig.colors.background,
                      borderColor: nameError ? themeConfig.colors.error : themeConfig.colors.border,
                      color: themeConfig.colors.text,
                    }}
                  />
                  {nameError && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{nameError}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>الوصف</label>
                  <input
                    type="text"
                    {...register(`services.${index}.description` as const)}
                    placeholder="وصف قصير"
                    className="w-full px-3 py-2 rounded-lg text-xs border"
                    style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>السعر (دج)</label>
                    <input
                      type="number"
                      {...register(`services.${index}.price` as const, { valueAsNumber: true })}
                      min={1}
                      max={25000}
                      className="w-full px-3 py-2 rounded-lg text-xs border"
                      style={{
                        backgroundColor: themeConfig.colors.background,
                        borderColor: priceError ? themeConfig.colors.error : themeConfig.colors.border,
                        color: themeConfig.colors.text,
                      }}
                    />
                    {priceError && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{priceError}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>المدة (دقيقة)</label>
                    <input
                      type="number"
                      {...register(`services.${index}.duration` as const, { valueAsNumber: true })}
                      min={5}
                      max={240}
                      step={5}
                      className="w-full px-3 py-2 rounded-lg text-xs border"
                      style={{
                        backgroundColor: themeConfig.colors.background,
                        borderColor: durationError ? themeConfig.colors.error : themeConfig.colors.border,
                        color: themeConfig.colors.text,
                      }}
                    />
                    {durationError && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{durationError}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>الفئة</label>
                    <select
                      {...register(`services.${index}.category` as const)}
                      className="w-full px-3 py-2 rounded-lg text-xs border"
                      style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                    >
                      {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addService} className="w-full h-10 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2 transition-all" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>
          <Plus size={14} /> إضافة خدمة جديدة
        </button>

        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onBack} className="flex-1 h-12 rounded-xl text-sm font-bold border" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>إلغاء</button>
          <button type="submit" disabled={isSaving} className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>
            {isSaving ? <><Loader2 size={16} className="animate-spin" /> جاري الحفظ...</> : <><Save size={16} /> حفظ</>}
          </button>
        </div>
      </form>
    </div>
  );
}
