import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, updateProfessionalProfile, addPortfolioItem, deletePortfolioItem, updatePortfolioItem, getPortfolioItems } from '@/supabase/database';
import { uploadPortfolioItemWithMeta, deletePortfolioFile } from '@/supabase/storage';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Plus, Trash2, Upload, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import WorkingHoursEditor from './WorkingHoursEditor';
import AvailabilityExceptions from './AvailabilityExceptions';
import type { PortfolioItem } from '@/types/supabase';

interface EditBarberProfileProps {
  onBack: () => void;
  userRole: string;
}

interface PortfolioItemWithPreview extends PortfolioItem {
  previewUrl?: string;
  file?: File;
  isNew?: boolean;
  isDeleted?: boolean;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PORTFOLIO_ITEMS = 10;

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
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  // Portfolio items: existing from DB + new uploads
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});

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
      });
      setAvatarPreviewUrl((appUser as Record<string, unknown>).avatar_url as string || null);
      setIsFetching(false);

      // Load existing portfolio items from DB
      if (appUser.id) {
        loadPortfolioItems(appUser.id);
      }
    } else {
      setIsFetching(false);
    }
  }, [appUser]);

  const loadPortfolioItems = async (proId: string) => {
    try {
      const items = await getPortfolioItems(proId);
      setPortfolioItems(items.map(item => ({ ...item })));
    } catch (err) {
      console.error('Failed to load portfolio items:', err);
    }
  };

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

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'نوع الملف غير مدعوم. يرجى اختيار صورة أو فيديو.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'حجم الملف يجب أن يكون أقل من 10 ميجابايت.';
    }
    return null;
  };

  const handlePortfolioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (portfolioItems.filter(p => !p.isDeleted).length + files.length > MAX_PORTFOLIO_ITEMS) {
      setError(`الحد الأقصى هو ${MAX_PORTFOLIO_ITEMS} عناصر. لديك ${portfolioItems.filter(p => !p.isDeleted).length} حالياً.`);
      return;
    }

    // Validate all files
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    const newItems: PortfolioItemWithPreview[] = files.map(file => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      professional_id: appUser?.id || '',
      url: '',
      type: file.type.startsWith('video') ? 'video' : 'image',
      caption: '',
      sort_order: portfolioItems.filter(p => !p.isDeleted).length,
      created_at: null,
      thumbnail_url: null,
      previewUrl: URL.createObjectURL(file),
      file,
      isNew: true,
    }));

    setPortfolioItems(prev => [...prev, ...newItems]);
    setError(null);
  };

  const removePortfolioItem = (index: number) => {
    const item = portfolioItems[index];
    if (item.isNew && !item.id.startsWith('temp-')) {
      // Existing DB item - mark for deletion
      setPortfolioItems(prev => prev.map((p, i) => i === index ? { ...p, isDeleted: true } : p));
    } else if (item.isNew && item.file) {
      // New file not yet uploaded - remove from local state
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      setPortfolioItems(prev => prev.filter((_, i) => i !== index));
    } else if (!item.isNew) {
      // Existing DB item - mark for deletion
      setPortfolioItems(prev => prev.map((p, i) => i === index ? { ...p, isDeleted: true } : p));
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser?.id) { setError('حدث خطأ في تحميل بيانات الحساب. يرجى تسجيل الخروج وإعادة الدخول.'); return; }
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
        const { uploadAvatar } = await import('@/supabase/storage');
        const avatarUrl = await uploadAvatar(appUser.id, avatarFile);
        if (avatarUrl) await updateProfile(appUser.id, { avatar_url: avatarUrl });
      }

      // Handle portfolio items
      const activeItems = portfolioItems.filter(p => !p.isDeleted);
      const deletedItems = portfolioItems.filter(p => p.isDeleted && !p.isNew);

      // Upload new items
      const uploadPromises = activeItems.filter(p => p.isNew && p.file).map(async (item, idx) => {
        if (!item.file || !appUser?.id) return;
        setUploadProgress(prev => ({ ...prev, [item.id]: true }));
        try {
          const result = await uploadPortfolioItemWithMeta(appUser.id, item.file);
          if (result) {
            const dbItem = await addPortfolioItem({
              professional_id: appUser.id,
              url: result.url,
              type: item.type as 'image' | 'video',
              caption: item.caption || null,
              sort_order: idx,
              thumbnail_url: null,
            });
            // Update the local item with the real DB id
            setPortfolioItems(prev => prev.map(p => p.id === item.id ? { ...p, ...dbItem, file: undefined, previewUrl: undefined, isNew: false } : p));
          }
        } catch (err) {
          console.error('Failed to upload portfolio item:', err);
          // Mark upload as failed
          setUploadProgress(prev => ({ ...prev, [item.id]: false }));
        }
      });

      await Promise.all(uploadPromises);

      // Delete removed items
      for (const item of deletedItems) {
        try {
          // Extract file path from URL
          const urlParts = item.url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const folder = item.professional_id;
          const fullPath = `${folder}/${fileName}`;
          await deletePortfolioFile(fullPath);
        } catch (err) {
          console.error('Failed to delete portfolio file:', err);
        }
        try {
          await deletePortfolioItem(item.id);
        } catch (err) {
          console.error('Failed to delete portfolio item from DB:', err);
        }
      }

      // Update captions for existing items that were modified
      for (const item of activeItems) {
        if (!item.isNew && item.id && (item.caption || item.sort_order !== undefined)) {
          try {
            await updatePortfolioItem(item.id, {
              caption: item.caption || null,
              sort_order: item.sort_order,
            });
          } catch (err) {
            console.error('Failed to update portfolio item:', err);
          }
        }
      }

      // Clean up deleted items from local state
      setPortfolioItems(prev => prev.filter(p => !p.isDeleted));

      setSuccess(true);
      setAvatarFile(null);
      setTimeout(() => { onBack(); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
      setUploadProgress({});
    }
  };

  if (isFetching) {
    return (
      <div className="pb-20 min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  const activeItems = portfolioItems.filter(p => !p.isDeleted);
  const isUploading = Object.values(uploadProgress).some(v => v === true);

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
          <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>معرض الأعمال ({activeItems.length}/{MAX_PORTFOLIO_ITEMS})</h3>
          <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="grid grid-cols-3 gap-3">
              {activeItems.map((item, index) => (
                <div key={item.id} className="relative w-full aspect-square rounded-lg overflow-hidden group">
                  {item.type === 'video' && item.previewUrl ? (
                    <video src={item.previewUrl} className="w-full h-full object-cover" controls={false} muted />
                  ) : item.previewUrl ? (
                    <img src={item.previewUrl} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                  ) : item.url ? (
                    item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" controls={false} muted />
                    ) : (
                      <img src={item.url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.border }}>
                      {item.type === 'video' ? <Video size={24} style={{ color: themeConfig.colors.textMuted }} /> : <ImageIcon size={24} style={{ color: themeConfig.colors.textMuted }} />}
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold"
                    style={{ backgroundColor: item.type === 'video' ? '#8B5CF6' : themeConfig.colors.primary, color: '#fff' }}>
                    {item.type === 'video' ? 'فيديو' : 'صورة'}
                  </div>

                  {/* Delete button */}
                  <button type="button" onClick={() => removePortfolioItem(portfolioItems.findIndex(p => p.id === item.id))}
                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={24} color="white" />
                  </button>

                  {/* Upload loading indicator */}
                  {uploadProgress[item.id] && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Add new button */}
              {!isUploading && activeItems.length < MAX_PORTFOLIO_ITEMS && (
                <label htmlFor="portfolio-upload" className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed cursor-pointer"
                  style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>
                  <Plus size={24} /><span className="text-xs mt-1">أضف صورة/فيديو</span>
                  <input type="file" id="portfolio-upload" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={handlePortfolioChange} className="hidden" />
                </label>
              )}
            </div>

            {/* File type hint */}
            <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
              يدعم الصور (JPG, PNG, WebP) والفيديو (MP4, WebM) - الحد الأقصى 10 ميجابايت لكل ملف
            </p>
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
        {appUser?.id && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>أيام الإغلاق</h3>
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <AvailabilityExceptions />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onBack} className="flex-1 h-12 rounded-xl text-sm font-bold border transition-all" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>إلغاء</button>
          <button type="submit" disabled={isLoading || isUploading} className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>
            {isLoading ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />جاري الحفظ...</> : isUploading ? <><Loader2 size={16} className="animate-spin" />جاري الرفع...</> : <><Save size={16} />حفظ التغييرات</>}
          </button>
        </div>
      </form>
    </div>
  );
}
