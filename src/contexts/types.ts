import type {
  ThemeName, AnimationStyle, TabName, AppSettings, AppNotification,
  Booking, Barber, Chat, ForumPost, ScreenName, ScreenParams, User
} from '@/types';
import type { Profile } from '@/types/supabase';
import { themes } from '@/data/themes';

interface DataLoadingState {
  barbers: boolean;
  bookings: boolean;
  forumPosts: boolean;
  notifications: boolean;
}

export interface AppState {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  prevTab: TabName | null;
  screen: ScreenName;
  screenParams: ScreenParams | undefined;
  navigate: (screen: ScreenName, params?: ScreenParams) => void;
  goBack: () => void;
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themeConfig: typeof themes[ThemeName];
  animationStyle: AnimationStyle;
  setAnimationStyle: (style: AnimationStyle) => void;
  barbers: Barber[];
  bookings: Booking[];
  chats: Chat[];
  forumPosts: ForumPost[];
  notifications: AppNotification[];
  currentUser: User | Profile | null;
  isLoading: DataLoadingState;
  dataError: string | null;
  refreshData: () => Promise<void>;
  toggleFollow: (barberId: string) => void;
  toggleLike: (postId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addBooking: (booking: Booking) => void;
  cancelBooking: (id: string) => void;
  confirmBooking: (id: string) => void;
  sendMessage: (_chatId: string, _content: string) => void;
  getBarberById: (id: string) => Barber | undefined;
  getPostById: (id: string) => ForumPost | undefined;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  unreadCount: number;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}
