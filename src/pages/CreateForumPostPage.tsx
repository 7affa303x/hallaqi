import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ImagePlus, Send, X } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { addForumPost, getForumCategories, linkCompetitionEntryPost } from '@/supabase/database';
import { uploadForumImage } from '@/supabase/storage';
import { forumPostSchema } from '@/lib/validation';
import type { ForumPostFormData } from '@/lib/validation';
import type { ForumCategory as DatabaseForumCategory } from '@/types/supabase-aliases';
import { trackProductEvent } from '@/lib/product-analytics';
import { assertFileWithinLimit, compressImageFile, UPLOAD_LIMITS } from '@/lib/imageUpload';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { findBlockedContent } from '@/lib/contentFilter';
import { canCreateForumPost, recordForumPost } from '@/lib/forumRateLimit';

export default function CreateForumPostPage() {
  const { themeConfig, goBack, refreshData, screenParams } = useApp();
  const { appUser } = useAuth();
  const competitionId = FEATURE_FLAGS.competitionsEnabled ? screenParams?.competitionId : undefined;
  const [categories, setCategories] = useState<DatabaseForumCategory[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isBeforeAfter, setIsBeforeAfter] = useState(false);
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterPreview, setAfterPreview] = useState('');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForumPostFormData>({
    resolver: zodResolver(forumPostSchema),
    defaultValues: { title: '', content: '', categoryId: '' },
  });

  useEffect(() => {
    getForumCategories()
      .then(setCategories)
      .catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل التصنيفات'));
  }, []);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (beforePreview) URL.revokeObjectURL(beforePreview);
    if (afterPreview) URL.revokeObjectURL(afterPreview);
  }, [imagePreview, beforePreview, afterPreview]);

  const chooseImage = async (file?: File, slot?: 'single' | 'before' | 'after') => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('اختر صورة JPG أو PNG أو WebP');
      return;
    }
    const limitError = assertFileWithinLimit(file, UPLOAD_LIMITS.forumImageMaxBytes);
    if (limitError) {
      setError(limitError);
      return;
    }
    const compressed = await compressImageFile(file, { maxBytes: UPLOAD_LIMITS.forumImageMaxBytes });
    const target = slot || 'single';
    if (target === 'single') {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImage(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } else if (target === 'before') {
      if (beforePreview) URL.revokeObjectURL(beforePreview);
      setBeforeImage(compressed);
      setBeforePreview(URL.createObjectURL(compressed));
    } else {
      if (afterPreview) URL.revokeObjectURL(afterPreview);
      setAfterImage(compressed);
      setAfterPreview(URL.createObjectURL(compressed));
    }
    setError('');
  };

  const submit = async (data: ForumPostFormData) => {
    if (!appUser) {
      setError('يجب تسجيل الدخول للنشر');
      return;
    }
    const rate = canCreateForumPost(appUser.id);
    if (!rate.ok) {
      setError(rate.message || 'حد النشر اليومي');
      return;
    }
    const blocked = findBlockedContent(`${data.title}\n${data.content}`);
    if (blocked) {
      setError(blocked);
      return;
    }
    setError('');
    try {
      let imageUrl: string | null = null;
      let beforeImageUrl: string | null = null;
      let afterImageUrl: string | null = null;

      if (isBeforeAfter) {
        if (!beforeImage || !afterImage) {
          setError('أضف صورتي قبل وبعد');
          return;
        }
        [beforeImageUrl, afterImageUrl] = await Promise.all([
          uploadForumImage(appUser.id, beforeImage),
          uploadForumImage(appUser.id, afterImage),
        ]);
      } else {
        imageUrl = image ? await uploadForumImage(appUser.id, image) : null;
      }

      const post = await addForumPost({
        author_id: appUser.id,
        category_id: data.categoryId,
        title: data.title,
        content: data.content,
        image_url: imageUrl,
        before_image_url: beforeImageUrl,
        after_image_url: afterImageUrl,
        type: isBeforeAfter ? 'transformation' : 'discussion',
        is_pinned: false,
        is_locked: false,
      } as never);
      recordForumPost(appUser.id);
      if (competitionId && post?.id) {
        try {
          await linkCompetitionEntryPost(competitionId, appUser.id, post.id);
        } catch {
          // Entry may already exist without post — non-blocking for publish
        }
      }
      trackProductEvent('Forum Post Created', {
        categoryId: data.categoryId,
        hasImage: Boolean(imageUrl),
        competitionId: competitionId || undefined,
      });
      await refreshData();
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر نشر الموضوع');
    }
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: themeConfig.colors.background }}>
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 border-b"
        style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      >
        <button type="button" onClick={goBack} aria-label="رجوع" className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowRight size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <div>
          <h1 className="font-bold" style={{ color: themeConfig.colors.text }}>
            {competitionId ? 'منشور المسابقة' : 'منشور جديد'}
          </h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
            {competitionId ? 'ارفع عملك للمشاركة في المسابقة' : 'منشور واحد يومياً · بدون ألفاظ مسيئة'}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(submit)} className="p-4 space-y-4">
        <div>
          <label htmlFor="forum-category" className="text-xs font-bold block mb-2" style={{ color: themeConfig.colors.text }}>
            التصنيف
          </label>
          <select
            id="forum-category"
            {...register('categoryId')}
            className="w-full h-12 rounded-xl border px-3 text-sm"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: errors.categoryId ? themeConfig.colors.error : themeConfig.colors.border, color: themeConfig.colors.text }}
          >
            <option value="">اختر تصنيفاً</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {errors.categoryId && <p className="text-[11px] mt-1" style={{ color: themeConfig.colors.error }}>{errors.categoryId.message}</p>}
        </div>

        <div>
          <label htmlFor="forum-title" className="text-xs font-bold block mb-2" style={{ color: themeConfig.colors.text }}>العنوان</label>
          <input
            id="forum-title"
            {...register('title')}
            maxLength={120}
            className="w-full h-12 rounded-xl border px-3 text-sm"
            placeholder="عنوان واضح ومختصر"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: errors.title ? themeConfig.colors.error : themeConfig.colors.border, color: themeConfig.colors.text }}
          />
          {errors.title && <p className="text-[11px] mt-1" style={{ color: themeConfig.colors.error }}>{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="forum-content" className="text-xs font-bold block mb-2" style={{ color: themeConfig.colors.text }}>المحتوى</label>
          <textarea
            id="forum-content"
            {...register('content')}
            rows={8}
            maxLength={5000}
            className="w-full rounded-xl border p-3 text-sm resize-none"
            placeholder="اكتب تفاصيل الموضوع..."
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: errors.content ? themeConfig.colors.error : themeConfig.colors.border, color: themeConfig.colors.text }}
          />
          {errors.content && <p className="text-[11px] mt-1" style={{ color: themeConfig.colors.error }}>{errors.content.message}</p>}
        </div>

        <div className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: themeConfig.colors.border }}>
          <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>منشور قبل/بعد</span>
          <button
            type="button"
            role="switch"
            aria-checked={isBeforeAfter}
            onClick={() => setIsBeforeAfter(v => !v)}
            className="w-11 h-6 rounded-full relative transition-colors"
            style={{ backgroundColor: isBeforeAfter ? themeConfig.colors.primary : themeConfig.colors.border }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ right: isBeforeAfter ? '2px' : '22px' }}
            />
          </button>
        </div>

        {isBeforeAfter ? (
          <div className="grid grid-cols-2 gap-2">
            {(['before', 'after'] as const).map(slot => {
              const preview = slot === 'before' ? beforePreview : afterPreview;
              const label = slot === 'before' ? 'قبل' : 'بعد';
              return preview ? (
                <div key={slot} className="relative rounded-2xl overflow-hidden">
                  <img src={preview} alt={label} className="w-full aspect-square object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      if (slot === 'before') { setBeforeImage(null); setBeforePreview(''); }
                      else { setAfterImage(null); setAfterPreview(''); }
                    }}
                    aria-label={`إزالة ${label}`}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  key={slot}
                  htmlFor={`forum-${slot}`}
                  className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                  style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
                >
                  <ImagePlus size={20} />
                  <span className="text-[10px] mt-1">{label}</span>
                  <input id={`forum-${slot}`} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => void chooseImage(e.target.files?.[0], slot)} />
                </label>
              );
            })}
          </div>
        ) : imagePreview ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={imagePreview} alt="معاينة صورة المنشور" className="w-full max-h-64 object-cover" />
            <button
              type="button"
              onClick={() => { setImage(null); setImagePreview(''); }}
              aria-label="إزالة الصورة"
              className="absolute top-2 left-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label
            htmlFor="forum-image"
            className="h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
            style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
          >
            <ImagePlus size={22} />
            <span className="text-xs mt-1">إضافة صورة اختيارية</span>
            <input id="forum-image" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => void chooseImage(e.target.files?.[0], 'single')} />
          </label>
        )}

        {error && <p role="alert" className="text-xs rounded-xl p-3" style={{ color: themeConfig.colors.error, backgroundColor: themeConfig.colors.error + '10' }}>{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          <Send size={16} />
          {isSubmitting ? 'جاري النشر...' : competitionId ? 'نشر للمسابقة' : 'نشر الموضوع'}
        </button>
      </form>
    </div>
  );
}
