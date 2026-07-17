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
    } else if (queryScreen === 'payment-success') {
      initialScreen = 'payment-success';
      initialParams = { bookingId: query.get('booking_id') || undefined };
    } else if (queryScreen === 'booking-flow' && query.get('barberId')) {
      initialScreen = 'booking-flow';
      initialParams = { barberId: query.get('barberId') || undefined };
    }

    setScreen(initialScreen);
    setScreenParams(initialParams);
    setHistory([{ screen: initialScreen, params: initialParams }]);
  }, []);

  const navigate = useCallback((nextScreen: ScreenName, params?: ScreenParams) => {
    setScreen(nextScreen);
    setScreenParams(params);
    setHistory(prev => [...prev, { screen: nextScreen, params }]);
    let url = '/';
    if (nextScreen === 'reset-password' || nextScreen === 'forgot-password') url = `/${nextScreen}`;
    else if (nextScreen === 'barber-detail' && params?.barberId) url = `/barber/${encodeURIComponent(params.barberId)}`;
    else if (nextScreen === 'post-detail' && params?.postId) url = `/post/${encodeURIComponent(params.postId)}`;
    else if (nextScreen !== 'home') {
      const query = new URLSearchParams({ screen: nextScreen });
      for (const [key, value] of Object.entries(params || {})) {
        if (value) query.set(key, value);
      }
      url = `/?${query.toString()}`;
    }
    window.history.pushState({}, '', url);
  }, []);

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const last = next[next.length - 1];
      setScreen(last.screen);
      setScreenParams(last.params);
      if (last.screen === 'reset-password' || last.screen === 'forgot-password') {
        window.history.pushState({}, '', `/${last.screen}`);
      } else if (last.screen === 'home') {
        window.history.pushState({}, '', '/');
      }
      return next;
    });
  }, []);

  /* ---- Tab ---- */
  const [activeTab, setActiveTabState] = useState<TabName>('booking');
  const [prevTab, setPrevTab] = useState<TabName | null>(null);

  const setActiveTab = useCallback((tab: TabName) => {
    setPrevTab(activeTab);
    setActiveTabState(tab);
    setScreen('home');
    setScreenParams(undefined);
  }, [activeTab]);

  useEffect(() => {
    if (!appUser) return;
    const serialized = sessionStorage.getItem('hallaqi-auth-redirect');
    if (!serialized) return;
    sessionStorage.removeItem('hallaqi-auth-redirect');
    try {
      const intent = JSON.parse(serialized) as { screen?: ScreenName; params?: ScreenParams };
      if (intent.params?.redirectTab) setActiveTab(intent.params.redirectTab as TabName);
      if (intent.screen && intent.screen !== 'login') navigate(intent.screen, intent.params);
    } catch {
      // Ignore malformed, user-controlled session storage.
    }
  }, [appUser, navigate, setActiveTab]);

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
    } catch (err) {
      console.warn('[AppContext] professionals fetch failed:', err);
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
      } catch (err) { console.warn('[AppContext] bookings fetch failed:', err); }
      finally { setIsLoading(p => ({ ...p, bookings: false })); }

      try {
        const notifData = await getUserNotifications(appUser.id);
        setNotifications(notifData.map(mapNotificationRow));
      } catch (err) { console.warn('[AppContext] notifications fetch failed:', err); }
      finally { setIsLoading(p => ({ ...p, notifications: false })); }
    } else {
      setBookings([]);
      setIsLoading(p => ({ ...p, bookings: false, notifications: false }));
    }

    try {
      const postsData = await getForumPosts();
      const likedIds = appUser ? await getUserLikedPostIds(appUser.id) : new Set<string>();
      setForumPosts(postsData.map(post => mapForumPost(post, likedIds.has(post.id))));
    } catch (err) { console.warn('[AppContext] forum fetch failed:', err); }
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
      } else if (query.get('screen') === 'payment-success') {
        setScreen('payment-success');
        setScreenParams({ bookingId: query.get('booking_id') || undefined });
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
  const [settings, setSettings] = useState<AppSettings>({
    theme: currentTheme,
    animationStyle: animationStyle,
    language: globalLanguage,
    notifications: { pushEnabled: true, emailEnabled: true, smsEnabled: false, bookingReminders: true, promotions: true, forumReplies: true, competitionUpdates: true, newFollowers: true },
    privacy: { profileVisible: true, showLocation: true, showBookings: false, allowMessages: 'all' },
    accessibility: { fontSize: 'medium', highContrast: false, reduceMotion: false, screenReader: false },
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
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) useStore.getState().setTheme(newSettings.theme);
      if (newSettings.animationStyle) useStore.getState().setAnimationStyle(newSettings.animationStyle);
      if (newSettings.language) useStore.getState().setLanguage(newSettings.language);
      if (appUser && isSupabaseConfigured() && !isDeveloperMode) {
        void upsertUserSettings(appUser.id, updated).catch(err => {
          console.error('[AppContext] Failed to persist settings:', err);
          setDataError('تعذر حفظ الإعدادات. حاول مرة أخرى.');
        });
      }
      return updated;
    });
  }, [appUser]);

  useEffect(() => {
    if (!appUser || !isSupabaseConfigured() || isDeveloperMode) return;
    void getUserSettings(appUser.id)
      .then(saved => {
        if (saved) setSettings(prev => ({ ...prev, ...saved }));
      })
      .catch(err => console.warn('[AppContext] settings fetch failed:', err));
  }, [appUser]);

  useEffect(() => {
    if (!appUser || !isSupabaseConfigured() || isDeveloperMode) return;
    const channel = subscribeToNotifications(appUser.id, rows => {
      setNotifications(rows.map(mapNotificationRow));
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
