import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, updateProfessionalProfile } from '@/supabase/database';
import { uploadAvatar } from '@/supabase/storage';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Plus, Trash2, Upload } from 'lucide-react';
import WorkingHoursEditor from './WorkingHoursEditor';
import AvailabilityExceptions from './AvailabilityExceptions';

interface EditBarberProfileProps {
  onBack: () => void;
  userRole: string;
}

export default function EditBarberProfile({ onBack, userRole: _userRole }: EditBarberProfileProps) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    phone_number: '',
    business_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    website_url: '',
    portfolio: [] as string[],
  });

  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [portfolioPreviewUrls, setPortfolioPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (appUser) {
      setFormData({
        full_name: (appUser as Record<string, unknown>).full_name as string || '',
        bio: (appUser as Record<string, unknown>).bio as string || '',
        phone_number: (appUser as Record<string, unknown>).phone_number as string || '',
        business_name: (appUser as Record<string, unknown>).business_name as string || '',
        business_address: (appUser as Record<string, unknown>).business_address as string || '',
        business_phone: (appUser as Record<string, unknown>).business_phone as string || '',
        business_email: (appUser as Record<string, unknown>).business_email as string || '',
        website_url: (appUser as Record<string, unknown>).website_url as string || '',
        portfolio: (appUser as Record<string, unknown>).portfolio as string[] || [],
      });
      setAvatarPreviewUrl((appUser as Record<string, unknown>).avatar_url as string || null);
      setIsFetching(false);
    } else {
      setIsFetching(false);
    }
  }, [appUser]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('الصورة يجب أن تكون أقل من 5 ميجا'); return; }
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    setPortfolioFiles(prev => [...prev, ...validFiles]);
    setPortfolioPreviewUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    setError(null);
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index));
    setPortfolioPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser?.id) { setError('بيانات غير كاملة'); return; }
    if (!formData.full_name.trim()) { setError('الاسم مطلوب'); return; }

    setIsLoading(true); setError(null); setSuccess(false);

    try {
      // Update profile (profiles table)
      await updateProfile(appUser.id, {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim() || null,
        updated_at: new Date().toISOString(),
      });

      // Update professional profile (professionals table)
      await updateProfessionalProfile(appUser.id, {
        bio: formData.bio.trim() || null,
        business_name: formData.business_name.trim() || null,
        business_address: formData.business_address.trim() || null,
        business_phone: formData.business_phone.trim() || null,
        business_email: formData.business_email.trim() || null,
        website_url: formData.website_url.trim() || null,
      });

      // Upload avatar if changed
      if (avatarFile && appUser.id) {
        const avatarUrl = await uploadAvatar(appUser.id, avatarFile);
        if (avatarUrl) await updateProfile(appUser.id, { avatar_url: avatarUrl });
      }

      setSuccess(true);
      setPortfolioFiles([]); setAvatarFile(null);
      setTimeout(() => { onBack(); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="pb-20 min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  return (
    <div className="pb-20 min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>تعديل البروفايل</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4">
        {error && (
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
            <AlertCircle size={18} style={{ color: themeConfig.colors.error }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: themeConfig.colors.error }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: themeConfig.colors.success + '15' }}>
            <CheckCircle size={18} style={{ color: themeConfig.colors.success }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: themeConfig.colors.success }}>تم تحديث البيانات بنجاح</p>
          </div>
        )}

        {/* Avatar */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>صورة الملف الشخصي</h3>
          <div className="rounded-2xl border p-4 flex flex-col items-center justify-center space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            {avatarPreviewUrl ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden">
                <img src={avatarPreviewUrl} alt="Avatar" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreviewUrl(null); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"><Trash2 size={16} /></button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}><Upload size={32} /></div>
            )}
            <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />
            <label htmlFor="avatar-upload" className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: themeConfig.colors.primary, color: '#fff' }}>{avatarFile ? 'تغيير الصورة' : 'رفع صورة'}</label>
          </div>
        </div>

        {/* Basic Info */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>المعلومات الأساسية</h3>
          <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>الاسم الكامل *</label>
              <input type="text" value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} placeholder="أدخل اسمك" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>النبذة الشخصية</label>
              <textarea value={formData.bio} onChange={(e) => handleInputChange('bio', e.target.value)} placeholder="أخبرنا عن نفسك" rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>رقم الهاتف</label>
              <input type="tel" value={formData.phone_number} onChange={(e) => handleInputChange('phone_number', e.target.value)} placeholder="+213 XXX XXX XXX" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
          </div>
        </div>

        {/* Business Info */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>معلومات العمل</h3>
          <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>اسم الصالون</label>
              <input type="text" value={formData.business_name} onChange={(e) => handleInputChange('business_name', e.target.value)} placeholder="اسم الصالون" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>عنوان العمل</label>
              <input type="text" value={formData.business_address} onChange={(e) => handleInputChange('business_address', e.target.value)} placeholder="عنوان الصالون" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>هاتف العمل</label>
              <input type="tel" value={formData.business_phone} onChange={(e) => handleInputChange('business_phone', e.target.value)} placeholder="هاتف الصالون" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>بريد العمل</label>
              <input type="email" value={formData.business_email} onChange={(e) => handleInputChange('business_email', e.target.value)} placeholder="email@salon.com" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
            <div><label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>الموقع الإلكتروني</label>
              <input type="text" value={formData.website_url} onChange={(e) => handleInputChange('website_url', e.target.value)} placeholder="https://" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} /></div>
          </div>
        </div>

        {/* Portfolio */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>معرض الأعمال</h3>
          <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="grid grid-cols-3 gap-3">
              {portfolioPreviewUrls.map((url, index) => (
                <div key={index} className="relative w-full h-24 rounded-lg overflow-hidden group">
                  <img src={url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePortfolioImage(index)} className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={24} color="white" /></button>
                </div>
              ))}
              {portfolioFiles.length < 10 && (
                <label htmlFor="portfolio-upload" className="flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed cursor-pointer" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>
                  <Plus size={24} /><span className="text-xs mt-1">أضف صورة</span>
                  <input type="file" id="portfolio-upload" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePortfolioChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Working Hours */}
        {appUser?.id && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>ساعات العمل</h3>
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <WorkingHoursEditor barberId={appUser.id} />
            </div>
          </div>
        )}

        {/* Availability Exceptions */}
        <div>
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>أيام الإغلاق</h3>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <AvailabilityExceptions />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onBack} className="flex-1 h-12 rounded-xl text-sm font-bold border transition-all" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>إلغاء</button>
          <button type="submit" disabled={isLoading} className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>
            {isLoading ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />جاري الحفظ...</> : <><Save size={16} />حفظ التغييرات</>}
          </button>
        </div>
      </form>
    </div>
  );
}