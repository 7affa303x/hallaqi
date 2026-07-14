import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { updateBarberProfile } from '@/supabase/database';
import { uploadAvatar, uploadPortfolioImage, validateFile } from '@/supabase/storage';
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, Plus, Trash2, Upload
} from 'lucide-react';

interface EditBarberProfileProps {
  onBack: () => void;
  userRole: string;
}

export default function EditBarberProfile({ onBack, userRole }: EditBarberProfileProps) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [barberData, setBarberData] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    email: '',
    phone: '',
    location: '',
    wilaya: '',
    yearsOfExperience: 0,
    isMobile: false,
    usesScissors: false,
    priceRange: '',
    portfolio: [] as string[],
    workingHours: {} as Record<string, { open: string; close: string; isOpen: boolean }>,
  });

  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Fetch barber data on mount
  useEffect(() => {
    const fetchBarberData = async () => {
      if (!appUser?.id) {
        setError('لم يتم العثور على بيانات المستخدم');
        setIsFetching(false);
        return;
      }

      try {
        // Get barber data by user_id
        const allBarbers = await fetch('/api/barbers').then(r => r.json()).catch(() => []);
        const barber = allBarbers.find((b: Record<string, unknown>) => b.user_id === appUser.id);

        if (!barber) {
          setError('لم يتم العثور على بيانات الحلاق');
          setIsFetching(false);
          return;
        }

        setBarberData(barber);
        setFormData({
          name: (barber.name as string) || '',
          bio: (barber.bio as string) || '',
          email: (barber.email as string) || '',
          phone: (barber.phone as string) || '',
          location: (barber.location as string) || '',
          wilaya: (barber.wilaya as string) || '',
          yearsOfExperience: (barber.years_of_experience as number) || 0,
          isMobile: (barber.is_mobile as boolean) || false,
          usesScissors: (barber.uses_scissors as boolean) || false,
          priceRange: (barber.price_range as string) || '',
          portfolio: (barber.portfolio as string[]) || [],
          workingHours: (barber.working_hours as Record<string, { open: string; close: string; isOpen: boolean }>) || {},
        });
        setPreviewUrls((barber.portfolio as string[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
      } finally {
        setIsFetching(false);
      }
    };

    if (userRole === 'barber') {
      fetchBarberData();
    } else {
      setError('ليس لديك صلاحية لتعديل بيانات الحلاق');
      setIsFetching(false);
    }
  }, [appUser?.id, userRole]);

  // Handle input changes
  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, { maxSizeMB: 2 });
    if (!validation.valid) {
      setError(validation.error || 'الملف غير صحيح');
      return;
    }

    setAvatarFile(file);
    setError(null);
  };

  // Handle portfolio file selection
  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateFile(file, { maxSizeMB: 5 });
      if (!validation.valid) {
        setError(validation.error || 'أحد الملفات غير صحيح');
        return;
      }
      validFiles.push(file);
    }

    setPortfolioFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  // Remove portfolio image
  const removePortfolioImage = (index: number) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberData?.id || !appUser?.id) {
      setError('بيانات غير كاملة');
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      setError('الاسم مطلوب');
      return;
    }
    if (!formData.location.trim()) {
      setError('الموقع مطلوب');
      return;
    }
    if (!formData.wilaya.trim()) {
      setError('الولاية مطلوبة');
      return;
    }
    if (formData.yearsOfExperience < 0) {
      setError('سنوات الخبرة غير صحيحة');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updates: Record<string, unknown> = {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        wilaya: formData.wilaya.trim(),
        years_of_experience: formData.yearsOfExperience,
        is_mobile: formData.isMobile,
        uses_scissors: formData.usesScissors,
        price_range: formData.priceRange.trim(),
      };

      // Upload avatar if changed
      if (avatarFile) {
        const avatarUrl = await uploadAvatar(appUser.id, avatarFile);
        updates.avatar = avatarUrl;
      }

      // Upload portfolio images if added
      const updatedPortfolio = [...formData.portfolio];
      if (portfolioFiles.length > 0) {
        for (let i = 0; i < portfolioFiles.length; i++) {
          const url = await uploadPortfolioImage(barberData.id as string, portfolioFiles[i], updatedPortfolio.length + i);
          updatedPortfolio.push(url);
        }
      }
      updates.portfolio = updatedPortfolio;

      // Update working hours if provided
      if (Object.keys(formData.workingHours).length > 0) {
        updates.working_hours = formData.workingHours;
      }

      // Update barber profile in database
      await updateBarberProfile(barberData.id as string, updates);

      setSuccess(true);
      setPortfolioFiles([]);
      setAvatarFile(null);
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isFetching) {
    return (
      <div className="pb-20 min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  // Not barber role
  if (userRole !== 'barber') {
    return (
      <div className="pb-20 min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
          style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center">
            <ArrowLeft size={20} style={{ color: themeConfig.colors.text }} />
          </button>
          <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>تعديل البروفايل</h2>
        </div>
        <div className="px-4 mt-8 text-center">
          <AlertCircle size={48} style={{ color: themeConfig.colors.error }} className="mx-auto mb-4" />
          <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>ليس لديك صلاحية</p>
          <p className="text-xs mt-2" style={{ color: themeConfig.colors.textMuted }}>هذه الميزة متاحة فقط للحلاقين</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center">
          <ArrowLeft size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>تعديل البروفايل</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
            <AlertCircle size={18} style={{ color: themeConfig.colors.error }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: themeConfig.colors.error }}>{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: themeConfig.colors.success + '15' }}>
            <CheckCircle size={18} style={{ color: themeConfig.colors.success }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: themeConfig.colors.success }}>تم تحديث البيانات بنجاح</p>
          </div>
        )}

        {/* Basic Info Section */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>المعلومات الأساسية</h3>
          <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            {/* Name */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>الاسم *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="أدخل اسمك"
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>النبذة الشخصية</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="أخبرنا عن نفسك"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>رقم الهاتف</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+213 XXX XXX XXX"
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>الموقع</h3>
          <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            {/* Location */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>الموقع *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="المنطقة أو الحي"
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>

            {/* Wilaya */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>الولاية *</label>
              <input
                type="text"
                value={formData.wilaya}
                onChange={(e) => handleInputChange('wilaya', e.target.value)}
                placeholder="الولاية"
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>
          </div>
        </div>

        {/* Experience Section */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>الخبرة والخدمات</h3>
          <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            {/* Years of Experience */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>سنوات الخبرة</label>
              <input
                type="number"
                min="0"
                value={formData.yearsOfExperience}
                onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>

            {/* Price Range */}
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>نطاق الأسعار</label>
              <input
                type="text"
                value={formData.priceRange}
                onChange={(e) => handleInputChange('priceRange', e.target.value)}
                placeholder="مثال: 500 - 1000 دج"
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                }}
              />
            </div>

            {/* Mobile Service */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>خدمة متنقلة</label>
              <input
                type="checkbox"
                checked={formData.isMobile}
                onChange={(e) => handleInputChange('isMobile', e.target.checked)}
                className="w-4 h-4 rounded"
              />
            </div>

            {/* Uses Scissors */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>يستخدم المقص</label>
              <input
                type="checkbox"
                checked={formData.usesScissors}
                onChange={(e) => handleInputChange('usesScissors', e.target.checked)}
                className="w-4 h-4 rounded"
              />
            </div>
          </div>
        </div>

        {/* Avatar Section */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>الصورة الشخصية</h3>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:bg-black/5"
              style={{ borderColor: themeConfig.colors.border }}>
              <Upload size={18} style={{ color: themeConfig.colors.primary }} />
              <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>
                {avatarFile ? avatarFile.name : 'اختر صورة'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            {avatarFile && (
              <p className="text-[10px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
                ✓ تم اختيار الصورة
              </p>
            )}
          </div>
        </div>

        {/* Portfolio Section */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>معرض الأعمال</h3>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:bg-black/5 mb-4"
              style={{ borderColor: themeConfig.colors.border }}>
              <Plus size={18} style={{ color: themeConfig.colors.primary }} />
              <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>أضف صور</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePortfolioChange}
                className="hidden"
              />
            </label>

            {/* Portfolio Images */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden aspect-square">
                    <img src={url} alt={`Portfolio ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePortfolioImage(idx)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {portfolioFiles.length > 0 && (
              <p className="text-[10px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
                ✓ {portfolioFiles.length} صورة جديدة
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 h-12 rounded-xl text-sm font-bold border transition-all"
            style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={16} />
                حفظ التغييرات
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
