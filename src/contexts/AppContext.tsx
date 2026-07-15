import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { isSupabaseConfigured, isDeveloperMode } from '@/supabase/client';
import { getBarbers, getUserBookings, getForumPosts, getUserNotifications, updateBookingStatus } from '@/supabase/database';
import { AppContext } from './context';
import { themes } from '@/data/themes';
import { mockCurrentUser, mockBarbers, mockBookings, mockForumPosts, mockNotifications } from '@/data/mockData';
import type { Barber, Booking, Chat, ForumPost, AppNotification, TabName, ThemeName, AnimationStyle, AppSettings, ScreenName, ScreenParams, User, Service } from '@/types';
import type { AppUser } from '@/types/supabase';

const convertAppUserToUser = (appUser: AppUser): User => ({
  id: appUser.id,
  name: appUser.display_name || appUser.email.split('@')[0],
  email: appUser.email,
  phone: appUser.phone || '',
  avatar: appUser.photo_url || '',
  isVerified: appUser.is_verified,
  idCardVerified: appUser.is_id_verified,
  role: appUser.role,
  joinedDate: appUser.created_at,
  bio: appUser.bio || undefined,
  location: appUser.location || undefined,
  wilaya: appUser.wilaya || '',
  followers: appUser.followers,
  following: appUser.following,
  bookings: [],
  savedBarbers: [],
  notificationsEnabled: true,
  theme: appUser.theme as ThemeName,
  language: appUser.language,
  isSubscribed: false,
  badges: [],
  stats: { totalBookings: 0, totalSpent: 0, streakDays: 0, points: 0, rank: 'bronze' },
  linkedAccounts: [],
});

/** Transform a Supabase booking row into the app's Booking type */
function transformBookingRow(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    barberId: row.barberId as string,
    barberName: (row.barberName as string) || '',
    barberAvatar: (row.barberAvatar as string) || '',
    services: ((row.services as Service[]) || []),
    date: (row.date as string) || '',
    time: (row.time as string) || '',
    status: (row.status as Booking['status']) || 'pending',
    totalPrice: (row.totalPrice as number) || 0,
    note: (row.note as string) || undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    location: (row.location as string) || '',
    isMobileService: (row.isMobileService as boolean) || false,
    paymentMethod: (row.paymentMethod as Booking['paymentMethod']) || 'cash',
    paymentStatus: (row.paymentStatus as Booking['paymentStatus']) || 'pending',
    reviewed: (row.reviewed as boolean) || false,
    rating: (row.rating as number) || undefined,
    address: (row.address as string) || undefined,
  };
}

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
    if (pathname === '/reset-password') {
      setScreen('reset-password');
      setHistory([{ screen: 'reset-password' }]);
    } else if (pathname === '/forgot-password') {
      setScreen('forgot-password');
      setHistory([{ screen: 'forgot-password' }]);
    }
  }, []);

  const navigate = useCallback((nextScreen: ScreenName, params?: ScreenParams) => {
    setScreen(nextScreen);
    setScreenParams(params);
    setHistory(prev => [...prev, { screen: nextScreen, params }]);
    // Update URL for password reset flows
    if (nextScreen === 'reset-password' || nextScreen === 'forgot-password') {
      window.history.pushState({}, '', `/${nextScreen}`);
    }
  }, []);

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const last = next[next.length - 1];
      setScreen(last.screen);
      setScreenParams(last.params);
      // Update URL when going back
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

  /* ---- Data (empty by default, loaded from Supabase) ---- */
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chats] = useState<Chat[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [currentUser] = useState<User | null>(isDeveloperMode ? mockCurrentUser : (appUser ? convertAppUserToUser(appUser) : null));

  const [isLoading, setIsLoading] = useState<DataLoadingState>({
    barbers: false, bookings: false, forumPosts: false, notifications: false,
  });
  const [dataError, setDataError] = useState<string | null>(null);

  /* ---- Load from Supabase ---- */
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // In developer mode, use mock data
      if (isDeveloperMode) {
        setBarbers(mockBarbers as unknown as Barber[]);
        setBookings(mockBookings as unknown as Booking[]);
        setForumPosts(mockForumPosts as unknown as ForumPost[]);
        setNotifications(mockNotifications as unknown as AppNotification[]);
        setIsLoading({ barbers: false, bookings: false, forumPosts: false, notifications: false });
        return;
      }
      return;
    }

    setIsLoading({ barbers: true, bookings: true, forumPosts: true, notifications: true });
    setDataError(null);

    try {
      const barbersData = await getBarbers();
      if (barbersData && barbersData.length > 0) setBarbers(barbersData as unknown as Barber[]);
    } catch (err) { console.warn('[AppContext] barbers fetch failed:', err); }
    finally { setIsLoading(p => ({ ...p, barbers: false })); }

    if (appUser) {
      try {
        const bookingsData = await getUserBookings(appUser.id);
        if (bookingsData && bookingsData.length > 0) {
          setBookings(bookingsData.map(transformBookingRow));
        } else {
          setBookings([]);
        }
      } catch (err) { console.warn('[AppContext] bookings fetch failed:', err); }
      finally { setIsLoading(p => ({ ...p, bookings: false })); }

      try {
        const notifData = await getUserNotifications(appUser.id);
        if (notifData && notifData.length > 0) setNotifications(notifData as unknown as AppNotification[]);
      } catch (err) { console.warn('[AppContext] notifications fetch failed:', err); }
      finally { setIsLoading(p => ({ ...p, notifications: false })); }
    } else {
      setBookings([]);
      setIsLoading(p => ({ ...p, bookings: false, notifications: false }));
    }

    try {
      const postsData = await getForumPosts();
      if (postsData && postsData.length > 0) setForumPosts(postsData as unknown as ForumPost[]);
    } catch (err) { console.warn('[AppContext] forum fetch failed:', err); }
    finally { setIsLoading(p => ({ ...p, forumPosts: false })); }
  }, [appUser]);

  useEffect(() => { refreshData(); }, [refreshData]);

  /* ---- Handle browser back/forward buttons ---- */
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      if (pathname === '/reset-password') {
        setScreen('reset-password');
      } else if (pathname === '/forgot-password') {
        setScreen('forgot-password');
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

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) useStore.getState().setTheme(newSettings.theme);
      if (newSettings.animationStyle) useStore.getState().setAnimationStyle(newSettings.animationStyle);
      if (newSettings.language) useStore.getState().setLanguage(newSettings.language);
      return updated;
    });
  }, []);

  /* ---- Actions ---- */
  const toggleFollow = useCallback((barberId: string) => {
    setBarbers(prev => prev.map(b =>
      b.id === barberId
        ? { ...b, isFollowing: !b.isFollowing, followers: b.isFollowing ? b.followers - 1 : b.followers + 1 }
        : b
    ));
    if (isSupabaseConfigured() && appUser && !isDeveloperMode) {
      import('@/supabase/database').then(m => m.toggleFavorite(appUser.id, barberId, true).catch(() => {}));
    }
  }, [appUser]);

  const toggleLike = useCallback((postId: string) => {
    if (isDeveloperMode) {
      setForumPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
      ));
      return;
    }
    setForumPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  /** Add booking: prepend to local state (Supabase save handled by caller) */
  const addBooking = useCallback((booking: Booking) => {
    setBookings(prev => [booking, ...prev]);
  }, []);

  /** Cancel booking: update Supabase first, then local state */
  const cancelBooking = useCallback(async (id: string) => {
    // Optimistic UI update
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
    // Sync to Supabase
    if (!isDeveloperMode && isSupabaseConfigured()) {
      try {
        await updateBookingStatus(id, 'cancelled');
      } catch (err) {
        console.error('[AppContext] Failed to cancel booking in Supabase:', err);
      }
    }
  }, []);

  const sendMessage = useCallback((_chatId: string, _content: string) => {
    if (isDeveloperMode) {
      console.log('[AppContext] Developer Mode: Message (local):', _content);
      return;
    }
    console.log('[AppContext] Message (local):', _content);
  }, []);

  const getBarberById = useCallback((id: string) => barbers.find(b => b.id === id), [barbers]);
  const getPostById = useCallback((id: string) => forumPosts.find(p => p.id === id), [forumPosts]);

  /* ---- Ensure forgot-password routes to ForgotPassword component ---- */
  useEffect(() => {
    if (screen === 'forgot-password' && window.location.pathname !== '/forgot-password') {
      window.history.replaceState({}, '', '/forgot-password');
    }
  }, [screen]);

  const themeConfig = themes[currentTheme];

  /* ---- Sync screen changes to URL (for password reset flows) ---- */
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
      addBooking, cancelBooking, sendMessage, getBarberById, getPostById,
      isSearchOpen, setIsSearchOpen, showNotifications, setShowNotifications, unreadCount,
      settings, updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}
