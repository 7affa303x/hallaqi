import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, updateProfessionalProfile, addPortfolioItem, deletePortfolioItem, updatePortfolioItem, getPortfolioItems, getProfessionalById } from '@/supabase/database';
import { uploadAvatar, uploadCover, uploadPortfolioItemWithMeta, deletePortfolioFile } from '@/supabase/storage';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Plus, Trash2, Upload, Image as ImageIcon, Video, Loader2, User, Briefcase, Calendar, Images } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editBarberProfileSchema } from '@/lib/validation';
import type { PortfolioItem } from '@/types/supabase-aliases';
import type { EditBarberProfileFormData } from '@/lib/validation';
import WorkingHoursEditor from './WorkingHoursEditor';
import AvailabilityExceptions from './AvailabilityExceptions';
import { UPLOAD_LIMITS } from '@/lib/imageUpload';

interface EditBarberProfileProps {
  onBack: () => void;
  userRole: string;
  /** Jump to a section (e.g. portfolio from onboarding). */
  initialSection?: 'photos' | 'personal' | 'business' | 'portfolio' | 'calendar';
}

interface PortfolioItemWithPreview extends PortfolioItem {
  previewUrl?: string;
  file?: File;
  fileSize?: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

type EditSection = NonNullable<EditBarberProfileProps['initialSection']>;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = UPLOAD_LIMITS.portfolioSingleMaxBytes;
const MAX_PORTFOLIO_ITEMS = 12;
const MAX_PORTFOLIO_TOTAL = UPLOAD_LIMITS.portfolioTotalMaxBytes;

export default function EditBarberProfile({ onBack, userRole, initialSection }: EditBarberProfileProps) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const isBarber = userRole === 'barber' || userRole === 'specialist';
  const isSeller = userRole === 'store' || userRole === 'company' || userRole === 'doctor';

  const sections = ([
    { key: 'photos' as const, label: 'الصور', icon: Images, show: true },
    { key: 'personal' as const, label: 'شخصي', icon: User, show: true },
    { key: 'business' as const, label: 'العمل', icon: Briefcase, show: isBarber || isSeller },
    { key: 'portfolio' as const, label: 'معرض', icon: ImageIcon, show: isBarber },
    { key: 'calendar' as const, label: 'الجدول', icon: Calendar, show: isBarber },
  ] satisfies { key: EditSection; label: string; icon: typeof User; show: boolean }[])
    .filter(s => s.show);

  const [activeSection, setActiveSection] = useState<EditSection>(
    initialSection && sections.some(s => s.key === initialSection) ? initialSection : 'photos'
  );

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors: formErrors, isSubmitting },
    setValue,
  } = useForm<EditBarberProfileFormData>({
    resolver: zodResolver(editBarberProfileSchema),
    defaultValues: {
      full_name: '',
      bio: '',
      phone_number: '',
      business_name: '',
      business_address: '',
      business_phone: '',
      business_email: '',
      website_url: '',
    },
  });

  const [isFetching, setIsFetching] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (appUser) {
      const profileData = appUser as Record<string, unknown>;
      setValue('full_name', (profileData.full_name as string) || '');
      setValue('bio', (profileData.bio as string) || '');
      setValue('phone_number', (profileData.phone_number as string) || '');
      setValue('business_name', (profileData.business_name as string) || '');
      setValue('business_address', (profileData.business_address as string) || '');
      setValue('business_phone', (profileData.business_phone as string) || '');
      setValue('business_email', (profileData.business_email as string) || '');
      setValue('website_url', (profileData.website_url as string) || '');
      setAvatarPreviewUrl((profileData.avatar_url as string) || null);
      setIsFetching(false);

      if (appUser.id && isBarber) {
        loadPortfolioItems(appUser.id);
        void getProfessionalById(appUser.id)
          .then(pro => {
            if (pro?.coverImage && !pro.coverImage.endsWith('/logo-wordmark.svg')) {
              setCoverPreviewUrl(pro.coverImage);
            }
          })
          .catch(() => { /* optional */ });
      }
    } else {
      setIsFetching(false);
    }
  }, [appUser, isBarber, setValue]);

  const loadPortfolioItems = async (proId: string) => {
    try {
      const items = await getPortfolioItems(proId);
      setPortfolioItems(items.map(item => ({ ...item })));
    } catch (err) {
      console.error('Failed to load portfolio items:', err);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setServerError('الصورة يجب أن تكون أقل من 5 ميجا'); return; }
    const { compressImageFile } = await import('@/lib/imageUpload');
    const compressed = await compressImageFile(file);
    setAvatarFile(compressed);
    setAvatarPreviewUrl(URL.createObjectURL(compressed));
    setServerError(null);
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setServerError('صورة الغلاف يجب أن تكون أقل من 8 ميجا'); return; }
    const { compressImageFile } = await import('@/lib/imageUpload');
    const compressed = await compressImageFile(file, { maxWidth: 1600 });
    setCoverFile(compressed);
    setCoverPreviewUrl(URL.createObjectURL(compressed));
    setServerError(null);
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'نوع الملف غير مدعوم. يرجى اختيار صورة أو فيديو.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `حجم الملف يجب أن يكون أقل من ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} ميجابايت.`;
    }
    return null;
  };

  const estimatePortfolioBytes = (items: PortfolioItemWithPreview[]) =>
    items
      .filter(p => !p.isDeleted)
      .reduce((sum, p) => sum + (p.fileSize ?? p.file?.size ?? UPLOAD_LIMITS.portfolioRemoteEstimateBytes), 0);

  const handlePortfolioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (portfolioItems.filter(p => !p.isDeleted).length + files.length > MAX_PORTFOLIO_ITEMS) {
      setServerError(`الحد الأقصى هو ${MAX_PORTFOLIO_ITEMS} عناصر. لديك ${portfolioItems.filter(p => !p.isDeleted).length} حالياً.`);
      return;
    }

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setServerError(validationError);
        return;
      }
    }

    const incomingBytes = files.reduce((s, f) => s + f.size, 0);
    const currentBytes = estimatePortfolioBytes(portfolioItems);
    if (currentBytes + incomingBytes > MAX_PORTFOLIO_TOTAL) {
      setServerError(`حد معرض الأعمال ${(MAX_PORTFOLIO_TOTAL / (1024 * 1024)).toFixed(0)} ميجا إجمالاً. احذف عناصر أو اختر صوراً أصغر.`);
      return;
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
      fileSize: file.size,
      isNew: true,
    }));

    setPortfolioItems(prev => [...prev, ...newItems]);
    setServerError(null);
  };

  const removePortfolioItem = (index: number) => {
    const item = portfolioItems[index];
    if (item.isNew && item.file) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      setPortfolioItems(prev => prev.filter((_, i) => i !== index));
    } else {
      setPortfolioItems(prev => prev.map((p, i) => i === index ? { ...p, isDeleted: true } : p));
    }
  };

  const onSubmit = async (data: EditBarberProfileFormData) => {
    if (!appUser?.id) {
      setServerError('حدث خطأ في تحميل بيانات الحساب. يرجى تسجيل الخروج وإعادة الدخول.');
      return;
    }

    setServerError(null);
    setSuccess(false);

    try {
      await updateProfile(appUser.id, {
        full_name: data.full_name.trim(),
        phone_number: data.phone_number?.trim() || null,
      });

      if (isBarber) {
        await updateProfessionalProfile(appUser.id, {
          bio: data.bio?.trim() || null,
          business_name: data.business_name?.trim() || null,
          business_address: data.business_address?.trim() || null,
          business_phone: data.business_phone?.trim() || null,
          business_email: data.business_email?.trim() || null,
          website_url: data.website_url?.trim() || null,
        });
      }

      if (avatarFile && appUser.id) {
        const avatarUrl = await uploadAvatar(appUser.id, avatarFile);
        if (avatarUrl) await updateProfile(appUser.id, { avatar_url: avatarUrl });
      }

      if (isBarber && coverFile && appUser.id) {
        const coverUrl = await uploadCover(appUser.id, coverFile);
        if (coverUrl) {
          await updateProfessionalProfile(appUser.id, { cover_image_url: coverUrl });
          setCoverPreviewUrl(coverUrl);
          setCoverFile(null);
        }
      }

      const activeItems = isBarber ? portfolioItems.filter(p => !p.isDeleted) : [];
      const deletedItems = isBarber ? portfolioItems.filter(p => p.isDeleted && !p.isNew) : [];

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
            setPortfolioItems(prev => prev.map(p => p.id === item.id ? { ...p, ...dbItem, file: undefined, previewUrl: undefined, isNew: false } : p));
          }
        } catch (err) {
          console.error('Failed to upload portfolio item:', err);
          setUploadProgress(prev => ({ ...prev, [item.id]: false }));
        }
      });

      await Promise.all(uploadPromises);

      for (const item of deletedItems) {
        try {
          const urlParts = item.url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const fullPath = `${item.professional_id}/${fileName}`;
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

      for (const item of activeItems) {
        if (!item.isNew && item.id) {
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

      setPortfolioItems(prev => prev.filter(p => !p.isDeleted));
      setSuccess(true);
      setAvatarFile(null);
      setTimeout(() => { onBack(); }, 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'فشل تحديث البيانات');
    } finally {
      setUploadProgress({});
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' as ScrollBehavior : 'auto' });
  }, [activeSection]);

  if (isFetching) {
    return (
      <div className="pb-20 min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  const activeItems = portfolioItems.filter(p => !p.isDeleted);
  const portfolioBytes = estimatePortfolioBytes(portfolioItems);
  const isUploading = Object.values(uploadProgress).some(v => v === true);

  const getFieldStyle = (fieldName: keyof EditBarberProfileFormData) => {
    const hasError = !!formErrors[fieldName];
    return {
      backgroundColor: themeConfig.colors.background,
      borderColor: hasError ? themeConfig.colors.error : themeConfig.colors.border,
      color: themeConfig.colors.text,
    };
  };

  return (
    <div className="pb-20 min-h-screen overflow-x-hidden max-w-full" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="sticky top-0 z-30 border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border, backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
          <h2 className="text-base font-bold truncate" style={{ color: themeConfig.colors.text }}>تعديل البروفايل</h2>
        </div>
        <div className="flex gap-1 px-3 pb-3 overflow-x-auto no-scrollbar">
          {sections.map(sec => {
            const Icon = sec.icon;
            const on = activeSection === sec.key;
            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveSection(sec.key)}
                className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold"
                style={{
                  backgroundColor: on ? themeConfig.colors.primary : themeConfig.colors.surface,
                  color: on ? '#fff' : themeConfig.colors.textMuted,
                  border: `1px solid ${on ? themeConfig.colors.primary : themeConfig.colors.border}`,
                }}
              >
                <Icon size={13} />
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleFormSubmit(onSubmit)} className="px-4 mt-4 space-y-4 max-w-full overflow-x-hidden">
        {(serverError || Object.keys(formErrors).length > 0) && (
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: themeConfig.colors.error + '15' }}>
            <AlertCircle size={18} style={{ color: themeConfig.colors.error }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: themeConfig.colors.error }}>
              {serverError || Object.values(formErrors)[0]?.message as string || ''}
            </p>
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: themeConfig.colors.success + '15' }}>
            <CheckCircle size={18} style={{ color: themeConfig.colors.success }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: themeConfig.colors.success }}>تم تحديث البيانات بنجاح</p>
          </div>
        )}

        {activeSection === 'photos' && (
          <>
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
                <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/webp" onChange={e => void handleAvatarChange(e)} className="hidden" />
                <label htmlFor="avatar-upload" className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: themeConfig.colors.primary, color: '#fff' }}>{avatarFile ? 'تغيير الصورة' : 'رفع صورة'}</label>
              </div>
            </div>

            {isBarber && (
              <div>
                <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>صورة الغلاف</h3>
                <div className="rounded-2xl border p-3 space-y-3 overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                  <div className="relative w-full h-32 rounded-xl overflow-hidden" style={{ backgroundColor: themeConfig.colors.background }}>
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="غلاف" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: themeConfig.colors.textMuted }}>
                        <ImageIcon size={28} />
                      </div>
                    )}
                  </div>
                  <input type="file" id="cover-upload" accept="image/jpeg,image/png,image/webp" onChange={e => void handleCoverChange(e)} className="hidden" />
                  <label htmlFor="cover-upload" className="cursor-pointer inline-flex px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: themeConfig.colors.primary, color: '#fff' }}>
                    {coverFile ? 'تغيير الغلاف' : 'رفع غلاف'}
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {activeSection === 'personal' && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>المعلومات الأساسية</h3>
            <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>الاسم الكامل *</label>
                <input type="text" {...register('full_name')} placeholder="أدخل اسمك" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={getFieldStyle('full_name')} />
                {formErrors.full_name && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{formErrors.full_name.message}</p>}
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>النبذة الشخصية</label>
                <textarea {...register('bio')} placeholder="أخبرنا عن نفسك" rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none" style={getFieldStyle('bio')} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>رقم الهاتف</label>
                <input type="tel" {...register('phone_number')} placeholder="+213 XXX XXX XXX" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={getFieldStyle('phone_number')} />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'business' && (isBarber || isSeller) && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>معلومات العمل</h3>
            <div className="space-y-3 rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>{isBarber ? 'اسم الصالون' : 'اسم النشاط'}</label>
                <input type="text" {...register('business_name')} placeholder={isBarber ? 'اسم الصالون' : 'اسم المتجر / العيادة'} className="w-full px-3 py-2.5 rounded-lg text-sm border" style={getFieldStyle('business_name')} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>عنوان العمل</label>
                <input type="text" {...register('business_address')} placeholder="العنوان" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={getFieldStyle('business_address')} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>هاتف العمل</label>
                <input type="tel" {...register('business_phone')} placeholder="هاتف العمل" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={getFieldStyle('business_phone')} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>بريد العمل</label>
                <input type="email" {...register('business_email')} placeholder="email@example.com" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={getFieldStyle('business_email')} />
                {formErrors.business_email && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{formErrors.business_email.message}</p>}
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: themeConfig.colors.text }}>الموقع الإلكتروني</label>
                <input type="text" {...register('website_url')} placeholder="https://" className="w-full px-3 py-2.5 rounded-lg text-sm border" style={getFieldStyle('website_url')} />
                {formErrors.website_url && <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{formErrors.website_url.message}</p>}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'portfolio' && isBarber && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>
              معرض الأعمال ({activeItems.length}/{MAX_PORTFOLIO_ITEMS}) · {(portfolioBytes / (1024 * 1024)).toFixed(1)}/{(MAX_PORTFOLIO_TOTAL / (1024 * 1024)).toFixed(0)} ميجا
            </h3>
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
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold"
                      style={{ backgroundColor: item.type === 'video' ? '#8B5CF6' : themeConfig.colors.primary, color: '#fff' }}>
                      {item.type === 'video' ? 'فيديو' : 'صورة'}
                    </div>
                    <button type="button" onClick={() => removePortfolioItem(portfolioItems.findIndex(p => p.id === item.id))}
                      className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={24} color="white" />
                    </button>
                    {uploadProgress[item.id] && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {!isUploading && activeItems.length < MAX_PORTFOLIO_ITEMS && portfolioBytes < MAX_PORTFOLIO_TOTAL && (
                  <label htmlFor="portfolio-upload" className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed cursor-pointer"
                    style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>
                    <Plus size={24} /><span className="text-xs mt-1">أضف</span>
                    <input type="file" id="portfolio-upload" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={e => void handlePortfolioChange(e)} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                الميزانية الإجمالية للمعرض {(MAX_PORTFOLIO_TOTAL / (1024 * 1024)).toFixed(0)} ميجا — حد الملف {(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} ميجا
              </p>
            </div>
          </div>
        )}

        {activeSection === 'calendar' && isBarber && appUser?.id && (
          <>
            <div>
              <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>ساعات العمل</h3>
              <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <WorkingHoursEditor barberId={appUser.id} />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold mb-3 px-1" style={{ color: themeConfig.colors.textMuted }}>أيام الإغلاق</h3>
              <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <AvailabilityExceptions barberId={appUser.id} />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onBack} className="flex-1 h-12 rounded-xl text-sm font-bold border transition-all" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>إلغاء</button>
          <button type="submit" disabled={isSubmitting || isUploading} className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>
            {isSubmitting ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />جاري الحفظ...</> : isUploading ? <><Loader2 size={16} className="animate-spin" />جاري الرفع...</> : <><Save size={16} />حفظ</>}
          </button>
        </div>
      </form>
    </div>
  );
}
