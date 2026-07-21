import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { isSupabaseConfigured, isDeveloperMode } from '@/supabase/client';
import {
  getProfessionals,
  getClientBookings,
  getFavorites,
  getForumPosts,
  getUserLikedPostIds,
  getUserNotifications,
  getUserSettings,
  markAllNotificationsRead as persistAllNotificationsRead,
  markNotificationRead as persistNotificationRead,
  sendNotification,
  subscribeToNotifications,
  toggleFavorite,
  toggleForumLike,
  updateBookingStatus,
  upsertUserSettings,
} from '@/supabase/database';
import { AppContext } from './context';
import { themes } from '@/data/themes';
import { mockCurrentUser, mockBarbers, mockBookings, mockForumPosts, mockNotifications } from '@/data/mockData';
import { mapBookingRow, mapForumPost, mapNotificationRow } from '@/lib/mappers';
import { requiresMfaChallenge } from '@/lib/mfa';
import { sanitizeAuthRedirectIntent } from '@/lib/authRedirect';
import { scrollToTop } from '@/lib/scroll';
import type { Barber, Booking, Chat, ForumPost, AppNotification, TabName, ThemeName, AnimationStyle, AppSettings, ScreenName, ScreenParams, User } from '@/types';
import type { Database } from '@/types/supabase';
import type { Profile } from '@/types/supabase-aliases';

const convertProfileToUser = (profile: Profile): User => ({
  id: profile.id,
  name: profile.full_name || profile.username || 'مستخدم',
  email: '', // Profile table doesn't store email; comes from auth.user
  phone: profile.phone_number || '',
  avatar: profile.avatar_url || '',
  isVerified: profile.verification_status === 'verified' || profile.verification_status === 'premium',
  idCardVerified: false, // Not in profiles table
  role: (profile.user_role === 'barber' || profile.user_role === 'specialist') ? 'barber' : profile.user_role === 'admin' ? 'admin' : 'user',
  joinedDate: profile.updated_at || new Date().toISOString(),
  bio: undefined,
  location: profile.city || undefined,
  wilaya: profile.city || '',
  followers: 0,
  following: 0,
  bookings: [],
  savedBarbers: [],
  notificationsEnabled: true,
  theme: 'hallaqi',
  language: 'ar',
  isSubscribed: false,
  badges: [],
  stats: { totalBookings: 0, totalSpent: 0, streakDays: 0, points: 0, rank: 'bronze' },
  linkedAccounts: [],
});

interface HistoryEntry { screen: ScreenName; params?: ScreenParams }

const queryScreens = new Set<ScreenName>([
  'booking-flow', 'chat-room', 'messages', 'notifications', 'create-post',
  'login', 'register', 'payment-success', 'admin-dashboard', 'ai-advisor',
  'mfa-challenge', 'coming-soon',
]);

function screenUrl(screen: ScreenName, params?: ScreenParams): string {
  if (screen === 'home') return '/';
  if (screen === 'reset-password' || screen === 'forgot-password') return `/${screen}`;
  if (screen === 'barber-detail' && params?.barberId) return `/barber/${encodeURIComponent(params.barberId)}`;
  if (screen === 'post-detail' && params?.postId) return `/post/${encodeURIComponent(params.postId)}`;
  if (screen === 'store-detail' && params?.sellerId) return `/store/${encodeURIComponent(params.sellerId)}`;
  if (screen === 'company-detail' && params?.sellerId) return `/company/${encodeURIComponent(params.sellerId)}`;
  if (screen === 'doctor-detail' && params?.sellerId) return `/doctor/${encodeURIComponent(params.sellerId)}`;
  if (screen === 'product-detail' && params?.productId) return `/product/${encodeURIComponent(params.productId)}`;
  if (screen === 'referral-landing' && params?.referralCode) return `/ref/${encodeURIComponent(params.referralCode)}`;
  if (screen === 'mini-site' && params?.slug) return `/u/${encodeURIComponent(params.slug)}`;
  const query = new URLSearchParams({ screen });
  for (const [key, value] of Object.entries(params || {})) {
    if (value) query.set(key, value);
  }
  return `/?${query.toString()}`;
}

interface DataLoadingState {
  barbers: boolean;
  bookings: boolean;
  forumPosts: boolean;
  notifications: boolean;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const globalTheme = useStore(s => s.theme);
  const globalAnimation = useStore(s => s.animationStyle);
  const globalLanguage = useStore(s => s.language);

  /* ---- Stack nav ---- */
  const [screen, setScreen] = useState<ScreenName>('home');
  const [screenParams, setScreenParams] = useState<ScreenParams | undefined>(undefined);
  const [, setHistory] = useState<HistoryEntry[]>([{ screen: 'home' }]);

  /* ---- Tab ---- */
  const [activeTab, setActiveTabState] = useState<TabName>('booking');
  const [prevTab, setPrevTab] = useState<TabName | null>(null);

  /** Reset to main tabs shell so bottom nav stays visible and stable. */
  const resetToTabs = useCallback((tab: TabName = 'booking') => {
    setActiveTabState(prev => {
      setPrevTab(prev);
      return tab;
    });
    setScreen('home');
    setScreenParams(undefined);
    setHistory([{ screen: 'home' }]);
    window.history.replaceState({ hallaqi: true, tab }, '', '/');
    scrollToTop();
  }, []);

  /* ---- Initialize screen from URL on mount ---- */
  useEffect(() => {
    const pathname = window.location.pathname;
    const query = new URLSearchParams(window.location.search);
    const queryScreen = query.get('screen');
    let initialScreen: ScreenName = 'home';
    let initialParams: ScreenParams | undefined;

    if (pathname === '/reset-password') initialScreen = 'reset-password';
    else if (pathname === '/forgot-password') initialScreen = 'forgot-password';
    else if (pathname.startsWith('/barber/')) {
      initialScreen = 'barber-detail';
      initialParams = { barberId: decodeURIComponent(pathname.slice('/barber/'.length)) };
    } else if (pathname.startsWith('/post/')) {
      initialScreen = 'post-detail';
      initialParams = { postId: decodeURIComponent(pathname.slice('/post/'.length)) };
    } else if (pathname.startsWith('/store/')) {
      initialScreen = 'store-detail';
      initialParams = { sellerId: decodeURIComponent(pathname.slice('/store/'.length)) };
    } else if (pathname.startsWith('/company/')) {
      initialScreen = 'company-detail';
      initialParams = { sellerId: decodeURIComponent(pathname.slice('/company/'.length)) };
    } else if (pathname.startsWith('/doctor/')) {
      initialScreen = 'doctor-detail';
      initialParams = { sellerId: decodeURIComponent(pathname.slice('/doctor/'.length)) };
    } else if (pathname.startsWith('/product/')) {
      initialScreen = 'product-detail';
      initialParams = { productId: decodeURIComponent(pathname.slice('/product/'.length)) };
    } else if (pathname.startsWith('/ref/')) {
      initialScreen = 'referral-landing';
      initialParams = { referralCode: decodeURIComponent(pathname.slice('/ref/'.length)) };
    } else if (pathname.startsWith('/u/')) {
      initialScreen = 'mini-site';
      initialParams = { slug: decodeURIComponent(pathname.slice('/u/'.length)) };
    } else if (queryScreen === 'payment-success') {
      initialScreen = 'payment-success';
      initialParams = { bookingId: query.get('booking_id') || undefined };
    } else if (queryScreen === 'booking-flow' && query.get('barberId')) {
      initialScreen = 'booking-flow';
      initialParams = {
        barberId: query.get('barberId') || undefined,
        cancelledBooking: query.get('cancelledBooking') || undefined,
      };
    } else if (queryScreen === 'notifications') {
      initialScreen = 'notifications';
    } else if (queryScreen === 'ai-advisor') {
      // Open AI as a tab so bottom nav does not disappear
      setActiveTabState('ai-hub');
      initialScreen = 'home';
    } else if (queryScreen && queryScreens.has(queryScreen as ScreenName)) {
      initialScreen = queryScreen as ScreenName;
      initialParams = Object.fromEntries(
        [...query.entries()].filter(([key]) => key !== 'screen')
      ) as ScreenParams;
    }

    setScreen(initialScreen);
    setScreenParams(initialParams);
    setHistory([{ screen: initialScreen, params: initialParams }]);
  }, []);

  const navigate = useCallback((nextScreen: ScreenName, params?: ScreenParams) => {
    // Always reset stack when returning home — fixes auth/register nav glitches
    if (nextScreen === 'home') {
      const tab = (params?.redirectTab as TabName) || 'booking';
      setActiveTabState(prev => {
        setPrevTab(prev);
        return tab;
      });
      setScreen('home');
      // Keep lightweight home params (e.g. openLegal) so Profile can deep-link
      const homeParams = params?.openLegal
        ? { openLegal: params.openLegal }
        : undefined;
      setScreenParams(homeParams);
      setHistory([{ screen: 'home', params: homeParams }]);
      window.history.replaceState({ hallaqi: true, tab }, '', '/');
      scrollToTop();
      return;
    }
    setScreen(nextScreen);
    setScreenParams(params);
    setHistory(prev => [...prev, { screen: nextScreen, params }]);
    window.history.pushState({ hallaqi: true, screen: nextScreen }, '', screenUrl(nextScreen, params));
    scrollToTop();
  }, []);

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) {
        // Never no-op: fall back to home tabs (deep links / empty stack)
        setScreen('home');
        setScreenParams(undefined);
        window.history.replaceState({ hallaqi: true }, '', '/');
        scrollToTop();
        return [{ screen: 'home' }];
      }
      const next = prev.slice(0, -1);
      const last = next[next.length - 1];
      setScreen(last.screen);
      setScreenParams(last.params);
      // replaceState avoids back-button loops created by pushState-on-back
      window.history.replaceState({ hallaqi: true, screen: last.screen }, '', screenUrl(last.screen, last.params));
      scrollToTop();
      return next;
    });
  }, []);

  const setActiveTab = useCallback((tab: TabName) => {
    resetToTabs(tab);
  }, [resetToTabs]);

  // Browser / device system back
  useEffect(() => {
    const onPopState = () => {
      setHistory(prev => {
        if (prev.length <= 1) {
          setScreen('home');
          setScreenParams(undefined);
          scrollToTop();
          return [{ screen: 'home' }];
        }
        const next = prev.slice(0, -1);
        const last = next[next.length - 1];
        setScreen(last.screen);
        setScreenParams(last.params);
        scrollToTop();
        return next;
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!appUser) return;
    const serialized = sessionStorage.getItem('hallaqi-auth-redirect');
    if (!serialized) return;
    sessionStorage.removeItem('hallaqi-auth-redirect');
    try {
      const intent = sanitizeAuthRedirectIntent(JSON.parse(serialized));
      if (!intent) return;
      if (intent.params?.redirectTab && typeof intent.params.redirectTab === 'string') {
        setActiveTab(intent.params.redirectTab as TabName);
      }
      if (intent.screen && intent.screen !== 'login' && intent.screen !== 'home') {
        navigate(intent.screen, intent.params as ScreenParams);
      } else if (!intent.screen || intent.screen === 'home') {
        setActiveTab('booking');
      }
    } catch {
      // Ignore malformed, user-controlled session storage.
    }
  }, [appUser, navigate, setActiveTab]);

  useEffect(() => {
    if (!appUser || screen === 'mfa-challenge') return;
    void requiresMfaChallenge().then(required => {
      if (required) {
        setScreen('mfa-challenge');
        setScreenParams(undefined);
        setHistory(previous => [...previous, { screen: 'mfa-challenge' }]);
        window.history.replaceState({}, '', '/?screen=mfa-challenge');
      }
    });
  }, [appUser, screen]);

  /* ---- Theme ---- */
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(globalTheme || 'hallaqi');
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>(globalAnimation || 'modern');

  const setTheme = useCallback((theme: ThemeName) => {
    setCurrentTheme(theme);
    useStore.getState().setTheme(theme);
  }, []);

  const setAnimationStyleCb = useCallback((style: AnimationStyle) => {
    setAnimationStyle(style);
    useStore.getState().setAnimationStyle(style);
  }, []);

  /* ---- Data ---- */
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chats] = useState<Chat[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const currentUser: User | null = isDeveloperMode
    ? mockCurrentUser
    : (appUser ? convertProfileToUser(appUser) : null);

  const [isLoading, setIsLoading] = useState<DataLoadingState>({
    barbers: false, bookings: false, forumPosts: false, notifications: false,
  });
  const [dataError, setDataError] = useState<string | null>(null);

  /* ---- Load from Supabase ---- */
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      if (isDeveloperMode) {
        setBarbers(mockBarbers as unknown as Barber[]);
        setBookings(mockBookings as unknown as Booking[]);
        setForumPosts(mockForumPosts as unknown as ForumPost[]);
        setNotifications(mockNotifications as unknown as AppNotification[]);
        setIsLoading({ barbers: false, bookings: false, forumPosts: false, notifications: false });
        return;
      }
      setDataError('تعذر الاتصال بخدمة البيانات. تحقق من إعدادات التطبيق.');
      return;
    }

    setIsLoading({ barbers: true, bookings: true, forumPosts: true, notifications: true });
    setDataError(null);

    try {
      const barbersData = await getProfessionals();
      if (appUser) {
        const favorites = await getFavorites(appUser.id);
        const favoriteIds = new Set(favorites.map(item => item.professional_id));
        setBarbers(barbersData.map(barber => ({ ...barber, isFollowing: favoriteIds.has(barber.id) })));
      } else {
        setBarbers(barbersData);
      }
      setDataError(null);
    } catch (err) {
      console.warn('[AppContext] professionals fetch failed:', err);
      // Keep any previously loaded list so the UI doesn't go empty on a transient failure.
      setDataError('تعذر تحميل قائمة الحلاقين.');
    }
    finally { setIsLoading(p => ({ ...p, barbers: false })); }

    if (appUser) {
      try {
        const bookingsData = await getClientBookings(appUser.id);
        if (bookingsData && bookingsData.length > 0) {
          setBookings(bookingsData.map(mapBookingRow));
        } else {
          setBookings([]);
        }
      } catch (err) {
        console.warn('[AppContext] bookings fetch failed:', err);
        setDataError(prev => prev ?? 'تعذر تحميل المواعيد. اسحب للتحديث أو أعد المحاولة.');
      }
      finally { setIsLoading(p => ({ ...p, bookings: false })); }

      try {
        const notifData = await getUserNotifications(appUser.id);
        setNotifications(notifData.map(mapNotificationRow));
      } catch (err) {
        console.warn('[AppContext] notifications fetch failed:', err);
        setDataError(prev => prev ?? 'تعذر تحميل الإشعارات.');
      }
      finally { setIsLoading(p => ({ ...p, notifications: false })); }
    } else {
      // Guest / logged-out: never keep prior-session notifications (badge "1" + login CTA).
      setBookings([]);
      setNotifications([]);
      setIsLoading(p => ({ ...p, bookings: false, notifications: false }));
    }

    try {
      const postsData = await getForumPosts();
      const likedIds = appUser ? await getUserLikedPostIds(appUser.id) : new Set<string>();
      setForumPosts(postsData.map(post => mapForumPost(post, likedIds.has(post.id))));
    } catch (err) {
      console.warn('[AppContext] forum fetch failed:', err);
      setDataError(prev => prev ?? 'تعذر تحميل منشورات المنتدى.');
    }
    finally { setIsLoading(p => ({ ...p, forumPosts: false })); }
  }, [appUser]);

  useEffect(() => { refreshData(); }, [refreshData]);

  /* ---- Handle browser back/forward buttons ---- */
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const query = new URLSearchParams(window.location.search);
      if (pathname === '/reset-password') {
        setScreen('reset-password');
      } else if (pathname === '/forgot-password') {
        setScreen('forgot-password');
      } else if (pathname.startsWith('/barber/')) {
        setScreen('barber-detail');
        setScreenParams({ barberId: decodeURIComponent(pathname.slice('/barber/'.length)) });
        return;
      } else if (pathname.startsWith('/post/')) {
        setScreen('post-detail');
        setScreenParams({ postId: decodeURIComponent(pathname.slice('/post/'.length)) });
        return;
      } else if (pathname.startsWith('/store/')) {
        setScreen('store-detail');
        setScreenParams({ sellerId: decodeURIComponent(pathname.slice('/store/'.length)) });
        return;
      } else if (pathname.startsWith('/company/')) {
        setScreen('company-detail');
        setScreenParams({ sellerId: decodeURIComponent(pathname.slice('/company/'.length)) });
        return;
      } else if (pathname.startsWith('/doctor/')) {
        setScreen('doctor-detail');
        setScreenParams({ sellerId: decodeURIComponent(pathname.slice('/doctor/'.length)) });
        return;
      } else if (pathname.startsWith('/product/')) {
        setScreen('product-detail');
        setScreenParams({ productId: decodeURIComponent(pathname.slice('/product/'.length)) });
        return;
      } else if (pathname.startsWith('/ref/')) {
        setScreen('referral-landing');
        setScreenParams({ referralCode: decodeURIComponent(pathname.slice('/ref/'.length)) });
        return;
      } else if (pathname.startsWith('/u/')) {
        setScreen('mini-site');
        setScreenParams({ slug: decodeURIComponent(pathname.slice('/u/'.length)) });
        return;
      } else if (query.get('screen') === 'payment-success') {
        setScreen('payment-success');
        setScreenParams({ bookingId: query.get('booking_id') || undefined });
        return;
      } else if (query.get('screen') === 'notifications') {
        setScreen('notifications');
        setScreenParams(undefined);
        return;
      } else if (query.get('screen') && queryScreens.has(query.get('screen') as ScreenName)) {
        setScreen(query.get('screen') as ScreenName);
        setScreenParams(Object.fromEntries(
          [...query.entries()].filter(([key]) => key !== 'screen')
        ) as ScreenParams);
        return;
      } else {
        setScreen('home');
      }
      setScreenParams(undefined);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /* ---- UI ---- */
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  /* ---- Settings ---- */
  const [settings, setSettings] = useState<AppSettings>(() => {
    const prefs = (() => {
      try {
        const raw = localStorage.getItem('hallaqi-locale-prefs-v1');
        return raw ? JSON.parse(raw) as { countryCode?: string; currencyCode?: string; language?: 'ar' | 'fr' | 'en' } : {};
      } catch {
        return {};
      }
    })();
    return {
      theme: currentTheme,
      animationStyle: animationStyle,
      language: prefs.language || globalLanguage,
      countryCode: prefs.countryCode || 'DZ',
      currencyCode: prefs.currencyCode || 'DZD',
      discoveryWilaya: (() => {
        try { return localStorage.getItem('hallaqi-discovery-wilaya') || ''; } catch { return ''; }
      })(),
      notifications: { pushEnabled: true, emailEnabled: true, smsEnabled: false, bookingReminders: true, promotions: true, forumReplies: true, competitionUpdates: true, newFollowers: true },
      privacy: { profileVisible: true, showLocation: true, showBookings: false, allowMessages: 'all' },
      accessibility: { fontSize: 'medium', highContrast: false, reduceMotion: false, screenReader: false },
    };
  });

  useEffect(() => { setSettings(p => ({ ...p, language: globalLanguage })); }, [globalLanguage]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontSize = settings.accessibility.fontSize;
    root.classList.toggle('hallaqi-high-contrast', settings.accessibility.highContrast);
    root.classList.toggle('hallaqi-reduce-motion', settings.accessibility.reduceMotion);
    root.lang = settings.language;
    root.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
  }, [settings.accessibility, settings.language]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    if (newSettings.theme) useStore.getState().setTheme(newSettings.theme);
    if (newSettings.animationStyle) useStore.getState().setAnimationStyle(newSettings.animationStyle);
    if (newSettings.language) useStore.getState().setLanguage(newSettings.language);
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('hallaqi-locale-prefs-v1', JSON.stringify({
          language: updated.language,
          countryCode: updated.countryCode,
          currencyCode: updated.currencyCode,
        }));
        if (typeof updated.discoveryWilaya === 'string') {
          if (updated.discoveryWilaya) localStorage.setItem('hallaqi-discovery-wilaya', updated.discoveryWilaya);
          else localStorage.removeItem('hallaqi-discovery-wilaya');
        }
      } catch { /* ignore */ }
      if (appUser && isSupabaseConfigured() && !isDeveloperMode) {
        queueMicrotask(() => {
          void upsertUserSettings(appUser.id, updated).catch(err => {
            console.error('[AppContext] Failed to persist settings:', err);
            setDataError('تعذر حفظ الإعدادات. حاول مرة أخرى.');
          });
        });
      }
      return updated;
    });
  }, [appUser]);

  useEffect(() => {
    if (!appUser || !isSupabaseConfigured() || isDeveloperMode) return;
    void getUserSettings(appUser.id)
      .then(saved => {
        if (saved) {
          setSettings(prev => ({
            ...prev,
            ...saved,
            countryCode: (saved as AppSettings).countryCode || prev.countryCode || 'DZ',
            currencyCode: (saved as AppSettings).currencyCode || prev.currencyCode || 'DZD',
            language: saved.language || prev.language,
            discoveryWilaya: saved.discoveryWilaya !== undefined ? saved.discoveryWilaya : prev.discoveryWilaya,
          }));
          if (saved.discoveryWilaya) {
            try { localStorage.setItem('hallaqi-discovery-wilaya', saved.discoveryWilaya); } catch { /* ignore */ }
          }
        }
      })
      .catch(err => console.warn('[AppContext] settings fetch failed:', err));
  }, [appUser]);

  useEffect(() => {
    if (!appUser || !isSupabaseConfigured() || isDeveloperMode) return;
    const channel = subscribeToNotifications(appUser.id, row => {
      const incoming = mapNotificationRow(row);
      setNotifications(current => current.some(item => item.id === incoming.id)
        ? current
        : [incoming, ...current]);
    });
    return () => { void channel.unsubscribe(); };
  }, [appUser]);

  /* ---- Actions ---- */
  const toggleFollow = useCallback(async (barberId: string) => {
    const current = barbers.find(barber => barber.id === barberId);
    const nextFavorite = !current?.isFollowing;
    setBarbers(prev => prev.map(b =>
      b.id === barberId
        ? { ...b, isFollowing: nextFavorite, followers: Math.max(0, b.followers + (nextFavorite ? 1 : -1)) }
        : b
    ));
    if (isSupabaseConfigured() && appUser && !isDeveloperMode) {
      try {
        await toggleFavorite(appUser.id, barberId, nextFavorite);
      } catch (err) {
        setBarbers(prev => prev.map(b => b.id === barberId ? { ...b, isFollowing: current?.isFollowing } : b));
        setDataError('تعذر تحديث المفضلة.');
        console.error('[AppContext] favorite update failed:', err);
      }
    }
  }, [appUser, barbers]);

  const toggleLike = useCallback(async (postId: string) => {
    const current = forumPosts.find(post => post.id === postId);
    if (!appUser) {
      navigate('login', { redirectScreen: 'post-detail', postId });
      return;
    }
    setForumPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
    try {
      await toggleForumLike(appUser.id, postId);
    } catch (err) {
      setForumPosts(prev => prev.map(p => p.id === postId && current ? current : p));
      setDataError('تعذر تحديث الإعجاب.');
      console.error('[AppContext] forum like failed:', err);
    }
  }, [appUser, forumPosts, navigate]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!isDeveloperMode && isSupabaseConfigured()) {
      try {
        await persistNotificationRead(id);
      } catch (err) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
        console.error('[AppContext] notification read update failed:', err);
      }
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unreadIds = new Set(notifications.filter(n => !n.read).map(n => n.id));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (appUser && !isDeveloperMode && isSupabaseConfigured()) {
      try {
        await persistAllNotificationsRead(appUser.id);
      } catch (err) {
        setNotifications(prev => prev.map(n => unreadIds.has(n.id) ? { ...n, read: false } : n));
        console.error('[AppContext] mark all notifications failed:', err);
      }
    }
  }, [appUser, notifications]);

  const addBooking = useCallback((booking: Booking) => {
    setBookings(prev => [booking, ...prev]);
  }, []);

  const cancelBooking = useCallback(async (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    const previousStatus = booking.status;
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
    if (!isDeveloperMode && isSupabaseConfigured()) {
      try {
        await updateBookingStatus(id, 'cancelled' as unknown as Database["public"]["Enums"]["booking_status"]);
        if (appUser) {
          try {
            await sendNotification({
              userId: booking.barberId,
              title: 'ألغى العميل الحجز',
              message: `ألغى ${appUser.full_name || 'العميل'} الحجز بتاريخ ${booking.date}`,
              type: 'booking',
              metadata: { booking_id: id },
            });
          } catch (err) {
            console.error('[AppContext] Failed to send cancel notification:', err);
          }
        }
      } catch (err) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: previousStatus } : b));
        setDataError('تعذر إلغاء الحجز.');
        console.error('[AppContext] Failed to cancel booking:', err);
      }
    }
  }, [bookings, appUser]);

  const confirmBooking = useCallback(async (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    const previousStatus = booking.status;
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' as const } : b));
    if (!isDeveloperMode && isSupabaseConfigured()) {
      try {
        await updateBookingStatus(id, 'confirmed' as unknown as Database["public"]["Enums"]["booking_status"]);
        if (appUser) {
          try {
            await sendNotification({
              userId: booking.barberId,
              title: 'تم تأكيد الحجز',
              message: `تم تأكيد الحجز بواسطة ${appUser.full_name || 'العميل'} - ${booking.date} ${booking.time}`,
              type: 'booking',
              metadata: { booking_id: id },
            });
          } catch (err) {
            console.error('[AppContext] Failed to send confirm notification:', err);
          }
        }
      } catch (err) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: previousStatus } : b));
        setDataError('تعذر تأكيد الحجز.');
        console.error('[AppContext] Failed to confirm booking:', err);
      }
    }
  }, [bookings, appUser]);

  const sendMessage = useCallback((_chatId: string, _content: string) => {
    // Chat delivery is handled by the realtime messaging layer once a
    // conversation is provisioned; no-op until a chat thread is active.
  }, []);

  const getBarberById = useCallback((id: string) => barbers.find(b => b.id === id), [barbers]);
  const getPostById = useCallback((id: string) => forumPosts.find(p => p.id === id), [forumPosts]);

  /* ---- Ensure forgot-password routes correctly ---- */
  useEffect(() => {
    if (screen === 'forgot-password' && window.location.pathname !== '/forgot-password') {
      window.history.replaceState({}, '', '/forgot-password');
    }
  }, [screen]);

  const themeConfig = themes[currentTheme];

  useEffect(() => {
    if (screen === 'reset-password' || screen === 'forgot-password') {
      const currentPath = window.location.pathname;
      const targetPath = `/${screen}`;
      if (currentPath !== targetPath) {
        window.history.replaceState({}, '', targetPath);
      }
    }
  }, [screen]);

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab, prevTab, screen, screenParams, navigate, goBack,
      currentTheme, setTheme, themeConfig, animationStyle, setAnimationStyle: setAnimationStyleCb,
      barbers, bookings, chats, forumPosts, notifications, currentUser,
      isLoading, dataError, refreshData,
      toggleFollow, toggleLike, markNotificationRead, markAllNotificationsRead,
      addBooking, cancelBooking, confirmBooking, sendMessage, getBarberById, getPostById,
      isSearchOpen, setIsSearchOpen, showNotifications, setShowNotifications, unreadCount,
      settings, updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}
