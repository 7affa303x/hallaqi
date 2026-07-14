import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { updateBarberProfile } from '@/supabase/database';
import {
  ArrowLeft, Plus, Edit2, Trash2, AlertCircle, CheckCircle
} from 'lucide-react';
import type { Service } from '@/types';

interface ServicesManagementProps {
  onBack: () => void;
}

interface FormData {
  name: string;
  price: number;
  duration: number;
  description: string;
  category: 'haircut' | 'beard' | 'facial' | 'coloring' | 'styling' | 'package';
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  price: 0,
  duration: 0,
  description: '',
  category: 'haircut'
};

const SERVICE_CATEGORIES = [
  { value: 'haircut', label: 'قصة شعر' },
  { value: 'beard', label: 'تشذيب اللحية' },
  { value: 'facial', label: 'عناية الوجه' },
  { value: 'coloring', label: 'الصبغة' },
  { value: 'styling', label: 'التسريحة' },
  { value: 'package', label: 'باقة' },
];

export default function ServicesManagement({ onBack }: ServicesManagementProps) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [barberId, setBarberId] = useState<string | null>(null);

  // Fetch barber data on mount
  useEffect(() => {
    const fetchBarberData = async () => {
      if (!appUser?.id) {
        setError('لم يتم العثور على بيانات المستخدم');
        setIsFetching(false);
        return;
      }

      try {
        // Get barber data by user_id - fetch all barbers and find matching one
        const response = await fetch('/api/barbers');
        if (!response.ok) throw new Error('فشل تحميل البيانات');
        
        const allBarbers = await response.json();
        const barber = allBarbers.find((b: Record<string, unknown>) => b.user_id === appUser.id);

        if (!barber) {
          setError('لم يتم العثور على بيانات الحلاق');
          setIsFetching(false);
          return;
        }

        setBarberId(barber.id);
        const barberServices = (barber.services as Service[]) || [];
        setServices(barberServices);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
      } finally {
        setIsFetching(false);
      }
    };

    fetchBarberData();
  }, [appUser?.id]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('اسم الخدمة مطلوب');
      return false;
    }
    if (formData.price < 0) {
      setError('السعر يجب أن يكون موجباً');
      return false;
    }
    if (formData.duration < 5) {
      setError('المدة يجب أن تكون 5 دقائق على الأقل');
      return false;
    }

    // Check for duplicate service names (excluding the one being edited)
    const isDuplicate = services.some(
      s => s.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && s.id !== editingId
    );
    if (isDuplicate) {
      setError('هذه الخدمة موجودة بالفعل');
      return false;
    }

    return true;
  };

  const handleAddService = async () => {
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;
    if (!barberId) {
      setError('لم يتم العثور على معرف الحلاق');
      return;
    }

    setIsLoading(true);

    try {
      const newService: Service = {
        id: editingId || `s${Date.now()}`,
        name: formData.name,
        price: formData.price,
        duration: formData.duration,
        description: formData.description,
        category: formData.category,
      };

      let updatedServices: Service[];
      if (editingId) {
        // Update existing service
        updatedServices = services.map(s => s.id === editingId ? newService : s);
      } else {
        // Add new service
        updatedServices = [...services, newService];
      }

      await updateBarberProfile(barberId, { services: updatedServices });

      setServices(updatedServices);
      setFormData(INITIAL_FORM_DATA);
      setEditingId(null);
      setShowForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ الخدمة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditService = (service: Service) => {
    setFormData({
      name: service.name,
      price: service.price,
      duration: service.duration,
      description: service.description || '',
      category: service.category,
    });
    setEditingId(service.id);
    setShowForm(true);
    setError(null);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    if (!barberId) {
      setError('لم يتم العثور على معرف الحلاق');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedServices = services.filter(s => s.id !== serviceId);
      await updateBarberProfile(barberId, { services: updatedServices });
      setServices(updatedServices);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حذف الخدمة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{
          backgroundColor: `${themeConfig.colors.background}ee`,
          borderColor: themeConfig.colors.border
        }}
      >
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center">
          <ArrowLeft size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>إدارة الخدمات</h2>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
          <AlertCircle size={16} style={{ color: themeConfig.colors.error }} />
          <p className="text-xs" style={{ color: themeConfig.colors.error }}>{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 mt-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: themeConfig.colors.success + '15' }}>
          <CheckCircle size={16} style={{ color: themeConfig.colors.success }} />
          <p className="text-xs" style={{ color: themeConfig.colors.success }}>تم بنجاح!</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mx-4 mt-4 p-4 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: themeConfig.colors.text }}>
            {editingId ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
          </h3>

          <div className="space-y-3">
            {/* Service Name */}
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>
                اسم الخدمة
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: قصة شعر"
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text
                }}
              />
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>
                  السعر (دج)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{
                    backgroundColor: themeConfig.colors.background,
                    borderColor: themeConfig.colors.border,
                    color: themeConfig.colors.text
                  }}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>
                  المدة (دقيقة)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Math.max(5, parseInt(e.target.value) || 5) })}
                  placeholder="30"
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{
                    backgroundColor: themeConfig.colors.background,
                    borderColor: themeConfig.colors.border,
                    color: themeConfig.colors.text
                  }}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>
                الفئة
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as FormData['category'] })}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text
                }}
              >
                {SERVICE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: themeConfig.colors.textMuted }}>
                الوصف (اختياري)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف الخدمة..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddService}
                disabled={isLoading}
                className="flex-1 h-10 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                {isLoading ? 'جاري...' : editingId ? 'تحديث' : 'إضافة'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 h-10 rounded-lg text-sm font-bold border transition-all"
                style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="px-4 mt-4">
        {services.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>لا توجد خدمات</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              <Plus size={16} />
              إضافة خدمة أولى
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white mb-4"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                <Plus size={16} />
                إضافة خدمة جديدة
              </button>
            )}
            {services.map(service => (
              <div
                key={service.id}
                className="p-3 rounded-lg border"
                style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
                      {service.name}
                    </h4>
                    <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>
                      {SERVICE_CATEGORIES.find(c => c.value === service.category)?.label}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditService(service)}
                      disabled={isLoading}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                      style={{ backgroundColor: themeConfig.colors.primary + '20' }}
                    >
                      <Edit2 size={14} style={{ color: themeConfig.colors.primary }} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      disabled={isLoading}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                      style={{ backgroundColor: themeConfig.colors.error + '20' }}
                    >
                      <Trash2 size={14} style={{ color: themeConfig.colors.error }} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: themeConfig.colors.textMuted }}>
                    {service.duration} دقيقة
                  </span>
                  <span className="font-bold" style={{ color: themeConfig.colors.primary }}>
                    {service.price} دج
                  </span>
                </div>

                {service.description && (
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
                    {service.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
