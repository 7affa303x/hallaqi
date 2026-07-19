import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { addForumComment, getPostComments, reportForumContent, toggleForumLike } from '@/supabase/database';
import { mapForumComments } from '@/lib/mappers';
import { isForumBookmarked, toggleForumBookmark } from '@/lib/deviceStorage';
import type { ForumComment } from '@/types';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, MessageSquare, Eye, Share2,
  Bookmark, BadgeCheck, Send, ThumbsUp, Flag
} from 'lucide-react';

const roleLabels: Record<string, string> = { admin: 'إدارة', expert: 'خبير', barber: 'حلاق', user: 'مستخدم' };
const roleColors: Record<string, string> = { admin: '#EF4444', expert: '#8B5CF6', barber: '#3B82F6', user: '#6B7280' };

export default function PostDetailPage() {
  const { themeConfig, screenParams, forumPosts, toggleLike, navigate, goBack } = useApp();
  const { appUser } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(() => isForumBookmarked(screenParams?.postId || ''));

  const post = forumPosts.find(p => p.id === screenParams?.postId);

  useEffect(() => {
    if (screenParams?.openReport === '1') setShowReport(true);
  }, [screenParams?.openReport]);

  const loadComments = useCallback(async () => {
    if (!screenParams?.postId) return;
    try {
      const rows = await getPostComments(screenParams.postId);
      setComments(mapForumComments(rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل التعليقات');
    }
  }, [screenParams?.postId]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  if (!post) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <img src="/logo-icon.png" alt="Hallaqi" className="w-16 h-16 mb-4 opacity-30" />
        <p style={{ color: themeConfig.colors.textMuted }}>المنشور غير موجود</p>
        <button onClick={goBack} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>رجوع</button>
      </div>
    );
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    if (!appUser || !post) {
      navigate('login', { redirectScreen: 'post-detail', postId: post?.id });
      return;
    }
    setIsSending(true);
    setError('');
    try {
      await addForumComment({
        post_id: post.id,
        author_id: appUser.id,
        content: commentText.trim(),
        parent_id: replyTo,
      });
      setCommentText('');
      setReplyTo(null);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إضافة التعليق');
    } finally {
      setIsSending(false);
    }
  };

  const submitReport = async () => {
    if (!appUser || !post) {
      setShowReport(false);
      navigate('login', { redirectScreen: 'post-detail', postId: post?.id });
      return;
    }
    try {
      await reportForumContent({
        reporterId: appUser.id,
        postId: post.id,
        reason: reportReason,
      });
      setShowReport(false);
      setReportReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال البلاغ');
    }
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/post/${post?.id || ''}`;
    try {
      if (navigator.share) await navigator.share({ title: post?.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // Dismissing the native share sheet is not an application error.
    }
  };

  const toggleBookmark = () => {
    if (!post) return;
    setIsBookmarked(toggleForumBookmark(post.id));
  };

  const updateCommentLike = (
    items: ForumComment[],
    commentId: string,
    liked: boolean
  ): ForumComment[] => items.map(comment => comment.id === commentId
    ? { ...comment, isLiked: liked, likes: Math.max(0, comment.likes + (liked ? 1 : -1)) }
    : { ...comment, replies: updateCommentLike(comment.replies, commentId, liked) });

  const handleCommentLike = async (commentId: string) => {
    if (!appUser) {
      navigate('login', { redirectScreen: 'post-detail', postId: post.id });
      return;
    }
    try {
      const liked = await toggleForumLike(appUser.id, undefined, commentId);
      setComments(items => updateCommentLike(items, commentId, liked));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث الإعجاب');
    }
  };

  // Check if author is a barber and linkable
  const isBarberAuthor = post.authorRole === 'barber';

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>

      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={goBack} className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowLeft size={22} style={{ color: themeConfig.colors.text }} />
        </button>
        <h1 className="text-base font-bold flex-1" style={{ color: themeConfig.colors.text }}>تفاصيل المنشور</h1>
        <button onClick={() => setShowReport(true)} className="w-10 h-10 rounded-xl flex items-center justify-center">
          <Flag size={18} style={{ color: themeConfig.colors.error }} />
        </button>
        <button onClick={() => void sharePost()} aria-label="مشاركة المنشور" className="w-10 h-10 rounded-xl flex items-center justify-center">
          <Share2 size={18} style={{ color: themeConfig.colors.textMuted }} />
        </button>
      </div>

      {/* Post Content */}
      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => isBarberAuthor && navigate('barber-detail', { barberId: post.authorId })}
            className="relative" style={{ cursor: isBarberAuthor ? 'pointer' : 'default' }}>
            <img src={post.authorAvatar} alt={post.authorName} className="w-12 h-12 rounded-xl object-cover" />
            {post.isVerified && <BadgeCheck size={16} className="absolute -bottom-1 -right-1 text-sky-500" />}
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => isBarberAuthor && navigate('barber-detail', { barberId: post.authorId })}
                className="text-sm font-bold" style={{ color: themeConfig.colors.text, cursor: isBarberAuthor ? 'pointer' : 'default' }}>
                {post.authorName}
              </button>
              {post.isVerified && <BadgeCheck size={16} className="text-sky-500" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: roleColors[post.authorRole] + '15', color: roleColors[post.authorRole] }}>
                {roleLabels[post.authorRole]}
              </span>
              <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{post.createdAt.split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Title & Content */}
        <h2 className="text-lg font-bold mb-2" style={{ color: themeConfig.colors.text }}>{post.title}</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: themeConfig.colors.textMuted }}>{post.content}</p>
        {post.image && (
          <img src={post.image} alt="" className="w-full max-h-96 object-cover rounded-2xl mt-4" />
        )}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {post.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: themeConfig.colors.primary + '08', color: themeConfig.colors.primary }}>#{tag}</span>
          ))}
        </div>
        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
          <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5">
            <Heart size={18} className={post.isLiked ? 'text-red-500 fill-red-500' : ''} style={{ color: post.isLiked ? '#EF4444' : themeConfig.colors.textMuted }} />
            <span className="text-xs font-medium" style={{ color: post.isLiked ? '#EF4444' : themeConfig.colors.textMuted }}>{post.likes}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={18} style={{ color: themeConfig.colors.textMuted }} />
            <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{comments.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye size={18} style={{ color: themeConfig.colors.textMuted }} />
            <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{post.views}</span>
          </div>
          <button onClick={toggleBookmark} aria-label={isBookmarked ? 'إزالة الحفظ' : 'حفظ المنشور'}><Bookmark size={18} className={isBookmarked ? 'fill-current' : ''} style={{ color: isBookmarked ? themeConfig.colors.primary : themeConfig.colors.textMuted }} /></button>
          <button onClick={() => void sharePost()} aria-label="مشاركة المنشور"><Share2 size={18} style={{ color: themeConfig.colors.textMuted }} /></button>
        </div>
      </div>

      {/* Comments */}
      <div className="px-4 mt-2">
        <h3 className="text-sm font-bold mb-3" style={{ color: themeConfig.colors.text }}>التعليقات ({comments.length})</h3>
        {error && <p role="alert" className="text-xs mb-3 p-2 rounded-lg" style={{ color: themeConfig.colors.error, backgroundColor: themeConfig.colors.error + '10' }}>{error}</p>}
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="border rounded-xl p-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              {/* Comment Author */}
              <div className="flex items-center gap-2 mb-2">
                <img src={comment.authorAvatar} alt={comment.authorName} className="w-8 h-8 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{comment.authorName}</span>
                    {comment.isVerified && <BadgeCheck size={12} className="text-sky-500" />}
                  </div>
                  <span className="text-[9px]" style={{ color: themeConfig.colors.textMuted }}>{comment.createdAt.split('T')[0]}</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>{comment.content}</p>
              <div className="flex items-center gap-4 mt-2">
                <button onClick={() => void handleCommentLike(comment.id)} className="flex items-center gap-1">
                  <ThumbsUp size={12} className={comment.isLiked ? 'fill-current' : ''} style={{ color: comment.isLiked ? themeConfig.colors.primary : themeConfig.colors.textMuted }} />
                  <span className="text-[10px]" style={{ color: comment.isLiked ? themeConfig.colors.primary : themeConfig.colors.textMuted }}>{comment.likes}</span>
                </button>
                <button onClick={() => setReplyTo(comment.id)} className="text-[10px] font-medium" style={{ color: themeConfig.colors.primary }}>رد</button>
              </div>
              {comment.replies.length > 0 && (
                <div className="mt-2 mr-4 space-y-2 border-r-2 pr-3" style={{ borderColor: themeConfig.colors.border }}>
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="bg-white/50 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <img src={reply.authorAvatar} alt={reply.authorName} className="w-5 h-5 rounded-md object-cover" />
                        <span className="text-[10px] font-bold" style={{ color: themeConfig.colors.text }}>{reply.authorName}</span>
                        {reply.isVerified && <BadgeCheck size={10} className="text-sky-500" />}
                      </div>
                      <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 p-3 border-t backdrop-blur-lg z-40"
        style={{ backgroundColor: `${themeConfig.colors.surface}ee`, borderColor: themeConfig.colors.border }}>
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div className="flex-1 relative">
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTo ? 'اكتب رداً...' : 'اكتب تعليقاً...'}
              className="w-full h-10 px-4 pr-10 text-sm rounded-xl outline-none"
              style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              disabled={isSending}
              onKeyDown={(e) => e.key === 'Enter' && void handleSendComment()} />
            {replyTo && (
              <button onClick={() => setReplyTo(null)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: themeConfig.colors.error }}>إلغاء</button>
            )}
          </div>
          <button onClick={() => void handleSendComment()} disabled={isSending}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: commentText.trim() ? themeConfig.colors.primary : themeConfig.colors.border }}>
            <Send size={16} className={commentText.trim() ? 'text-white' : ''} style={{ color: commentText.trim() ? '#fff' : themeConfig.colors.textMuted }} />
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowReport(false)}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="p-5 rounded-2xl bg-white max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: themeConfig.colors.text }}>
              <Flag size={16} style={{ color: themeConfig.colors.error }} /> الإبلاغ عن المنشور
            </h3>
            <div className="space-y-2 mb-4">
              {['محتوى غير لائق', 'معلومات مضللة', 'تحرش', 'سبب آخر'].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                  style={{ backgroundColor: reportReason === r ? themeConfig.colors.error + '10' : themeConfig.colors.background, borderColor: reportReason === r ? themeConfig.colors.error : themeConfig.colors.border, color: reportReason === r ? themeConfig.colors.error : themeConfig.colors.text }}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReport(false)} className="flex-1 h-10 rounded-xl text-xs font-bold border" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>إلغاء</button>
              <button onClick={() => void submitReport()} disabled={!reportReason}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: themeConfig.colors.error }}>إرسال</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
