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

export default function CreateForumPostPage() {
  const { themeConfig, goBack, refreshData, screenParams } = useApp();
  const { appUser } = useAuth();
  const competitionId = FEATURE_FLAGS.competitionsEnabled ? screenParams?.competitionId : undefined;
  const [categories, setCategories] = useState<DatabaseForumCategory[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
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
  }, [imagePreview]);

  const chooseImage = async (file?: File) => {
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
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const compressed = await compressImageFile(file, { maxBytes: UPLOAD_LIMITS.forumImageMaxBytes });
    setImage(compressed);
    setImagePreview(URL.createObjectURL(compressed));
    setError('');
  };

  const submit = async (data: ForumPostFormData) => {
    if (!appUser) {
      setError('يجب تسجيل الدخول للنشر');
      return;
    }
    setError('');
    try {
      const imageUrl = image ? await uploadForumImage(appUser.id, image) : null;
      const post = await addForumPost({
        author_id: appUser.id,
        category_id: data.categoryId,
        title: data.title,
        content: data.content,
        image_url: imageUrl,
        type: 'discussion',
        is_pinned: false,
        is_locked: false,
      });
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
            {competitionId ? 'ارفع عملك للمشاركة في المسابقة' : 'شارك سؤالاً أو تجربة مع المجتمع'}
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

        {imagePreview ? (
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
            <input id="forum-image" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void chooseImage(event.target.files?.[0])} />
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
