import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { getProfessionalServices, createService, updateService, deleteService } from '@/supabase/database';
import type { Service as AppService } from '@/types';
import type { Database } from '@/types/supabase';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const SERVICE_CATEGORIES: AppService['category'][] = ['haircut', 'beard', 'shave', 'hair_treatment', 'facial', 'coloring', 'styling', 'package'];

const CATEGORY_LABELS: Record<string, string> = {
  haircut: 'قص الشعر', beard: 'تصفيف اللحية', shave: 'الحلاقة', hair_treatment: 'عناية بالشعر',
  facial: 'عناية بالبشرة', coloring: 'صبغة', styling: 'تسريح', package: 'باقة',
};

export default function ServicesManagement({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [services, setServices] = useState<AppService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!appUser?.id) { setIsLoading(false); return; }
    getProfessionalServices(appUser.id)
      .then(data => {
        setServices(data.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          price: Number(s.price),
          duration: s.duration_minutes,
          category: (s.category as unknown as AppService["category"]) || "haircut",
        })));
      })
      .catch(() => setError('فشل تحميل الخدمات'))
      .finally(() => setIsLoading(false));
  }, [appUser?.id]);

  const addService = () => {
    const newService: AppService = { id: `temp-${Date.now()}`, name: '', description: '', price: 0, duration: 30, category: 'haircut' };
    setServices(prev => [...prev, newService]);
    setSuccess(false);
  };

  const removeService = async (index: number) => {
    const svc = services[index];
    if (!svc.id.startsWith('temp-')) {
      try { await deleteService(svc.id); } catch { setError('فشل حذف الخدمة'); return; }
    }
    setServices(prev => prev.filter((_, i) => i !== index));
    setSuccess(false);
  };

  const updateServiceField = (index: number, field: keyof AppService, value: string | number) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setSuccess(false); setError(null);
  };

  const handleSave = async () => {
    if (!appUser?.id) { setError('لا يوجد معرف للمختص'); return; }
    if (services.some(s => !s.name.trim())) { setError('جميع الخدمات يجب أن تحتوي على اسم'); return; }
    if (services.some(s => s.price <= 0)) { setError('جميع الخدمات يجب أن تحتوي على سعر موجب'); return; }
    if (services.some(s => s.duration <= 0)) { setError('جميع الخدمات يجب أن تحتوي على مدة موجبة'); return; }

    setIsSaving(true); setError(null); setSuccess(false);
    try {
      const proId = appUser.id;
      for (const svc of services) {
        if (svc.id.startsWith('temp-')) {
          await createService({
            professional_id: proId,
            name: svc.name.trim(),
            description: (svc.description || "").trim() || null,
            price: svc.price,
            duration_minutes: svc.duration,
            category: svc.category as unknown as Database["public"]["Enums"]["service_category"],
            is_active: true,
          });
        } else {
          await updateService(svc.id, {
            name: svc.name.trim(),
            description: (svc.description || "").trim() || null,
            price: svc.price,
            duration_minutes: svc.duration,
            category: svc.category as unknown as Database["public"]["Enums"]["service_category"],
            is_active: true,
          });
        }
      }
      // Refresh to get server-generated IDs for new services
      const refreshed = await getProfessionalServices(proId);
      setServices(refreshed.map(s => ({
        id: s.id, name: s.name, description: s.description || '', price: Number(s.price), duration: s.duration_minutes, category: (s.category as unknown as AppService["category"]) || "haircut",
      })));
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
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>إدارة الخدمات</h2>
      </div>

      <div className="px-4 mt-4 space-y-4">
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
          {services.map((svc, index) => (
            <div key={svc.id} className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>الخدمة {index + 1}</h4>
                <button type="button" onClick={() => removeService(index)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
                  <Trash2 size={14} style={{ color: themeConfig.colors.error }} />
                </button>
              </div>

              <div><label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>الاسم</label>
                <input type="text" value={svc.name} onChange={(e) => updateServiceField(index, 'name', e.target.value)} placeholder="مثال: قص شعر كلاسيك" className="w-full px-3 py-2 rounded-lg text-xs border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>

              <div><label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>الوصف</label>
                <input type="text" value={svc.description} onChange={(e) => updateServiceField(index, 'description', e.target.value)} placeholder="وصف قصير" className="w-full px-3 py-2 rounded-lg text-xs border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>

              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>السعر (دج)</label>
                  <input type="number" value={svc.price || ''} onChange={(e) => updateServiceField(index, 'price', Number(e.target.value))} min={0} className="w-full px-3 py-2 rounded-lg text-xs border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
                <div><label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>المدة (دقيقة)</label>
                  <input type="number" value={svc.duration || ''} onChange={(e) => updateServiceField(index, 'duration', Number(e.target.value))} min={5} step={5} className="w-full px-3 py-2 rounded-lg text-xs border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
                <div><label className="text-[10px] font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>الفئة</label>
                  <select value={svc.category} onChange={(e) => updateServiceField(index, 'category', e.target.value as AppService['category'])} className="w-full px-3 py-2 rounded-lg text-xs border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
                    {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
                  </select></div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addService} className="w-full h-10 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2 transition-all" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>
          <Plus size={14} /> إضافة خدمة جديدة
        </button>

        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onBack} className="flex-1 h-12 rounded-xl text-sm font-bold border" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>إلغاء</button>
          <button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>
            {isSaving ? <><Loader2 size={16} className="animate-spin" /> جاري الحفظ...</> : <><Save size={16} /> حفظ</>}
          </button>
        </div>
      </div>
    </div>
  );
}