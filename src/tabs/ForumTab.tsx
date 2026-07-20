import { useEffect, useMemo, useState } from 'react';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useApp } from '@/contexts/useApp';
import { SkeletonForumPost } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import BrandLogo from '@/components/BrandLogo';
import { translate } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { forumCategories } from '@/data/mockData';
import type { ForumCategory, ForumPost, ScreenName, ScreenParams } from '@/types';
import { themes } from '@/data/themes';
import { enterCompetition, getActiveCompetitions, getForumCategories, getUserCompetitionIds } from '@/supabase/database';
import { isForumBookmarked, toggleForumBookmark } from '@/lib/deviceStorage';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import {
  MessageCircle, Trophy, Eye, Shield, BadgeCheck, Pin,
  Megaphone, Heart, MessageSquare, Share2, Bookmark,
  Filter, TrendingUp, Users, Award, LogIn, Plus
} from 'lucide-react';

const roleIcons: Record<string, typeof Shield> = { admin: Shield, expert: Award, barber: BadgeCheck, user: Users };
const roleColors: Record<string, string> = { admin: '#EF4444', expert: '#8B5CF6', barber: '#3B82F6', user: '#6B7280' };
const roleLabels: Record<string, string> = { admin: 'إدارة', expert: 'خبير', barber: 'حلاق', user: 'مستخدم' };
type ActiveCompetition = Awaited<ReturnType<typeof getActiveCompetitions>>[number];

export default function ForumTab() {
  const { forumPosts, themeConfig, settings, navigate, isLoading } = useApp();
  const { isAuthenticated, needsLogin, appUser } = useAuthGate();
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all');
  const [showSort, setShowSort] = useState(false);
  const [sortMode, setSortMode] = useState<'newest' | 'trending' | 'liked' | 'commented'>('newest');
  const [competitions, setCompetitions] = useState<ActiveCompetition[]>([]);
  const [competitionMessage, setCompetitionMessage] = useState('');
  const [busyCompetition, setBusyCompetition] = useState('');
  const [joinedCompetitionIds, setJoinedCompetitionIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Array<{ key: string; label: string; color: string }>>(
    forumCategories.map(category => ({ ...category }))
  );

  useEffect(() => {
    getForumCategories()
      .then(rows => {
        if (rows.length > 0) {
          setCategories(rows.map(row => ({
            key: row.slug,
            label: row.name,
            color: row.color || themeConfig.colors.primary,
          })));
        }
      })
      .catch(() => { /* static categories remain available */ });
  }, [themeConfig.colors.primary]);

  useEffect(() => {
    if (!FEATURE_FLAGS.competitionsEnabled) {
      setCompetitions([]);
      return;
    }
    getActiveCompetitions().then(setCompetitions).catch(() => setCompetitions([]));
  }, []);

  useEffect(() => {
    if (!FEATURE_FLAGS.competitionsEnabled || !appUser) {
      setJoinedCompetitionIds(new Set());
      return;
    }
    getUserCompetitionIds(appUser.id)
      .then(ids => setJoinedCompetitionIds(new Set(ids)))
      .catch(() => setJoinedCompetitionIds(new Set()));
  }, [appUser]);

  const joinCompetition = async (competitionId: string) => {
    if (!appUser) {
      navigate('login', { redirectScreen: 'home', redirectTab: 'forum' });
      return;
    }
    setBusyCompetition(competitionId);
    setCompetitionMessage('');
    try {
      if (!joinedCompetitionIds.has(competitionId)) {
        await enterCompetition(competitionId, appUser.id);
        setJoinedCompetitionIds(prev => new Set([...prev, competitionId]));
      }
      setCompetitionMessage('تم التسجيل — أنشئ منشوراً لعرض عملك');
      navigate('create-post', { competitionId });
    } catch (err) {
      setCompetitionMessage(err instanceof Error ? err.message : 'تعذر الانضمام للمسابقة');
    } finally {
      setBusyCompetition('');
    }
  };

  const filteredPosts = useMemo(() => {
    const posts = selectedCategory === 'all'
      ? [...forumPosts]
      : forumPosts.filter(p => p.category === selectedCategory);
    return posts.sort((a, b) => {
      if (sortMode === 'liked') return b.likes - a.likes;
      if (sortMode === 'commented') return b.comments.length - a.comments.length;
      if (sortMode === 'trending') {
        const score = (post: ForumPost) => post.likes * 3 + post.comments.length * 5 + post.views * 0.05;
        return score(b) - score(a);
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [forumPosts, selectedCategory, sortMode]);
  const pinnedPosts = filteredPosts.filter(p => p.isPinned);
  const regularPosts = filteredPosts.filter(p => !p.isPinned);

  const showSkeletons = isLoading.forumPosts && forumPosts.length === 0;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-3 backdrop-blur-lg" style={{ backgroundColor: `${themeConfig.colors.background}ee` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-9 h-9 shadow-sm" priority />
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: themeConfig.colors.text }}>{translate(settings.language, 'community')}</h1>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{translate(settings.language, 'communityDescription')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAuthenticated && (
              <button
                onClick={() => navigate('create-post')}
                aria-label="إنشاء منشور جديد"
                className="w-9 h-9 rounded-xl flex items-center justify-center border"
                style={{ backgroundColor: themeConfig.colors.primary, borderColor: themeConfig.colors.primary, color: '#fff' }}
              >
                <Plus size={16} />
              </button>
            )}
            <button onClick={() => { setSortMode('trending'); setShowSort(false); }} aria-label="المنشورات الرائجة" className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ backgroundColor: sortMode === 'trending' ? themeConfig.colors.primary + '15' : themeConfig.colors.surface, borderColor: sortMode === 'trending' ? themeConfig.colors.primary : themeConfig.colors.border, color: sortMode === 'trending' ? themeConfig.colors.primary : themeConfig.colors.textMuted }}>
              <TrendingUp size={16} />
            </button>
            <button onClick={() => setShowSort(value => !value)} aria-label="ترتيب المنشورات" className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ backgroundColor: showSort ? themeConfig.colors.primary + '15' : themeConfig.colors.surface, borderColor: showSort ? themeConfig.colors.primary : themeConfig.colors.border, color: showSort ? themeConfig.colors.primary : themeConfig.colors.textMuted }}>
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setSelectedCategory('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={{ backgroundColor: selectedCategory === 'all' ? themeConfig.colors.primary : themeConfig.colors.surface, color: selectedCategory === 'all' ? '#fff' : themeConfig.colors.textMuted, border: `1.5px solid ${selectedCategory === 'all' ? themeConfig.colors.primary : themeConfig.colors.border}` }}
          >الكل</button>
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setSelectedCategory(cat.key as ForumCategory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{ backgroundColor: selectedCategory === cat.key ? cat.color + '15' : themeConfig.colors.surface, color: selectedCategory === cat.key ? cat.color : themeConfig.colors.textMuted, border: `1.5px solid ${selectedCategory === cat.key ? cat.color : themeConfig.colors.border}` }}
            >{cat.label}</button>
          ))}
        </div>
        {showSort && (
          <div className="grid grid-cols-4 gap-1.5 mt-2 p-2 rounded-xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            {([
              ['newest', 'الأحدث'],
              ['trending', 'الرائج'],
              ['liked', 'الأكثر إعجاباً'],
              ['commented', 'الأكثر نقاشاً'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => { setSortMode(key); setShowSort(false); }} className="px-2 py-2 rounded-lg text-[10px] font-bold" style={{ backgroundColor: sortMode === key ? themeConfig.colors.primary : themeConfig.colors.background, color: sortMode === key ? '#fff' : themeConfig.colors.textMuted }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Auth notice for posting — only after session restore finishes */}
      {needsLogin && (
        <div className="px-4 mt-2">
          <button
            onClick={() => navigate('login')}
            className="w-full p-3 rounded-2xl border flex items-center justify-center gap-2 transition-all"
            style={{ backgroundColor: themeConfig.colors.primary + '05', borderColor: themeConfig.colors.primary + '20', borderStyle: 'dashed' }}
          >
            <LogIn size={16} style={{ color: themeConfig.colors.primary }} />
            <span className="text-xs font-medium" style={{ color: themeConfig.colors.primary }}>
              سجل الدخول للمشاركة في النقاشات
            </span>
          </button>
        </div>
      )}

      {/* Competitions Banner — gated until entry→post flow is ready */}
      {FEATURE_FLAGS.competitionsEnabled && competitions.length > 0 && <div className="px-4 mt-2 mb-3">
        <div className="p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.primary + '05', borderColor: themeConfig.colors.primary + '15', borderStyle: 'dashed' }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} style={{ color: themeConfig.colors.primary }} />
            <span className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>مسابقات نشطة</span>
          </div>
          <div className="space-y-2">
            {competitions.map(comp => {
              const alreadyJoined = joinedCompetitionIds.has(comp.id);
              return (
              <div key={comp.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface }}>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>{comp.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{comp.competition_entries?.[0]?.count || 0} مشارك &bull; {comp.prize}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>تنتهي {new Date(comp.ends_at).toLocaleDateString('ar-DZ')}</p>
                </div>
                <button
                  disabled={busyCompetition === comp.id}
                  onClick={() => void joinCompetition(comp.id)}
                  className="px-3 h-8 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: alreadyJoined ? themeConfig.colors.success : themeConfig.colors.primary }}
                >
                  {alreadyJoined ? 'منشور' : 'شارك'}
                </button>
              </div>
              );
            })}
          </div>
          {competitionMessage && <p role="status" className="text-[10px] mt-2" style={{ color: themeConfig.colors.primary }}>{competitionMessage}</p>}
        </div>
      </div>}

      {/* Skeleton Loading */}
      {showSkeletons && (
        <div className="px-4 space-y-3">
          <SkeletonForumPost />
          <SkeletonForumPost />
          <SkeletonForumPost />
        </div>
      )}

      {/* Pinned Posts */}
      {!showSkeletons && pinnedPosts.length > 0 && (
        <div className="px-4 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Pin size={12} style={{ color: themeConfig.colors.primary }} />
            <span className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>منشورات مثبتة</span>
          </div>
          {pinnedPosts.map(post => (
            <ForumPostCard key={post.id} post={post} isPinned navigate={navigate} themeConfig={themeConfig} />
          ))}
        </div>
      )}

      {/* Regular Posts */}
      {!showSkeletons && (
        <div className="px-4 space-y-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageCircle size={12} style={{ color: themeConfig.colors.textMuted }} />
            <span className="text-xs font-bold" style={{ color: themeConfig.colors.textMuted }}>أحدث المنشورات</span>
          </div>
          {regularPosts.map(post => (
            <ForumPostCard key={post.id} post={post} navigate={navigate} themeConfig={themeConfig} />
          ))}
        </div>
      )}

      {!showSkeletons && filteredPosts.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="لا توجد منشورات في هذا القسم"
          description="كن أول من ينشر منشوراً هنا"
          actionLabel="أنشئ منشوراً"
          onAction={() => navigate('create-post')}
          themeConfig={themeConfig}
        />
      )}
    </div>
  );
}

// ====== Forum Post Card ======
interface PostCardProps {
  post: ForumPost;
  isPinned?: boolean;
  navigate: (screen: ScreenName, params?: ScreenParams) => void;
  themeConfig: typeof themes[keyof typeof themes];
}

function ForumPostCard({ post, isPinned = false, navigate, themeConfig }: PostCardProps) {
  const { toggleLike } = useApp();
  const { isLoggedIn } = useAuthGate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(() => isForumBookmarked(post.id));
  const RoleIcon = roleIcons[post.authorRole] || Users;
  const rColor = roleColors[post.authorRole] || '#6B7280';
  const catInfo = forumCategories.find(c => c.key === post.category);

  const isBarberAuthor = post.authorRole === 'barber';
  const nav = navigate;

  const handleLike = () => {
    if (!isLoggedIn) {
      nav('login', { redirectScreen: 'post-detail', postId: post.id });
      return;
    }
    toggleLike(post.id);
  };

  const toggleBookmark = () => {
    setIsBookmarked(toggleForumBookmark(post.id));
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title, text: post.content.slice(0, 120), url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // Native share can be dismissed without an application error.
    }
  };

  const handleComment = () => {
    if (!isLoggedIn) {
      nav('login', { redirectScreen: 'post-detail', postId: post.id });
      return;
    }
    nav('post-detail', { postId: post.id });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.985 }}
      className="rounded-2xl border overflow-hidden transition-shadow"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: isPinned ? themeConfig.colors.primary + '30' : themeConfig.colors.border }}
    >
      {/* Author */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => isBarberAuthor && nav('barber-detail', { barberId: post.authorId })}
              className="relative"
              style={{ cursor: isBarberAuthor ? 'pointer' : 'default' }}
            >
              <img src={post.authorAvatar} alt={post.authorName} loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover" />
              {post.isVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }}>
                  <BadgeCheck size={14} className="text-sky-500" />
                </div>
              )}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => isBarberAuthor && nav('barber-detail', { barberId: post.authorId })}
                  className="text-xs font-bold"
                  style={{ color: themeConfig.colors.text, cursor: isBarberAuthor ? 'pointer' : 'default' }}
                >
                  {post.authorName}
                </button>
                <RoleIcon size={12} style={{ color: rColor }} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: rColor + '10', color: rColor }}>
                  {roleLabels[post.authorRole]}
                </span>
                {catInfo && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: catInfo.color + '10', color: catInfo.color }}>
                    {catInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isPinned && <Pin size={12} style={{ color: themeConfig.colors.primary }} />}
            {post.isAnnouncement && <Megaphone size={12} style={{ color: themeConfig.colors.warning }} />}
            <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{post.createdAt.split('T')[0]}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <h3 className="text-sm font-bold mb-1 cursor-pointer" style={{ color: themeConfig.colors.text }}
          onClick={() => nav('post-detail', { postId: post.id })}>
          {post.title}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
          {isExpanded ? post.content : post.content.slice(0, 150) + (post.content.length > 150 ? '...' : '')}
        </p>
        {post.image && <img src={post.image} alt="" loading="lazy" decoding="async" className="w-full max-h-64 object-cover rounded-xl mt-2" />}
        {post.content.length > 150 && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-[11px] font-medium mt-1" style={{ color: themeConfig.colors.primary }}>
            {isExpanded ? 'عرض أقل' : 'قراءة المزيد'}
          </button>
        )}
        <div className="flex gap-1 mt-2 flex-wrap">
          {post.tags.map((tag: string) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: themeConfig.colors.textMuted + '15', color: themeConfig.colors.textMuted }}>
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t" style={{ borderColor: themeConfig.colors.border + '60' }}>
        <button onClick={handleLike} className="flex items-center gap-1 transition-all">
          <Heart size={16} className={post.isLiked ? 'fill-red-500 text-red-500' : ''} style={{ color: post.isLiked ? '#EF4444' : themeConfig.colors.textMuted }} />
          <span className="text-[11px] font-medium" style={{ color: post.isLiked ? '#EF4444' : themeConfig.colors.textMuted }}>{post.likes}</span>
        </button>
        <button onClick={handleComment} className="flex items-center gap-1">
          <MessageSquare size={16} style={{ color: themeConfig.colors.textMuted }} />
          <span className="text-[11px] font-medium" style={{ color: themeConfig.colors.textMuted }}>{post.comments.length}</span>
        </button>
        <div className="flex items-center gap-1">
          <Eye size={16} style={{ color: themeConfig.colors.textMuted }} />
          <span className="text-[11px] font-medium" style={{ color: themeConfig.colors.textMuted }}>{post.views}</span>
        </div>
        <button onClick={toggleBookmark} aria-label={isBookmarked ? 'إزالة الحفظ' : 'حفظ المنشور'}><Bookmark size={16} className={isBookmarked ? 'fill-current' : ''} style={{ color: isBookmarked ? themeConfig.colors.primary : themeConfig.colors.textMuted }} /></button>
        <button onClick={() => void sharePost()} aria-label="مشاركة المنشور"><Share2 size={16} style={{ color: themeConfig.colors.textMuted }} /></button>
      </div>
    </motion.div>
  );
}
