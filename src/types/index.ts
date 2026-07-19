

// ====== BARBER TYPES ======
export interface Barber {
  id: string;
  name: string;
  avatar: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  location: string;
  wilaya: string;
  distance: string;
  coordinates?: { lat: number; lng: number };
  isActive: boolean;
  isVerified: boolean;
  tags: BarberTag[];
  services: Service[];
  priceRange: string;
  workingHours: WorkingHours;
  isMobile: boolean;
  usesScissors: boolean;
  yearsOfExperience: number;
  bio: string;
  portfolio: string[];
  phone?: string;
  hasIdCard: boolean;
  idCardVerified: boolean;
  isSubscribed: boolean;
  subscriptionPlan?: 'free' | 'basic' | 'pro' | 'premium' | 'professional' | 'business';
  followers: number;
  following: number;
  likes: number;
  isFollowing?: boolean;
  reviews?: Review[];
}

export type BarberTag =
  | 'active'
  | 'old-school'
  | 'scissors-user'
  | 'mobile'
  | 'verified'
  | 'trending'
  | 'new'
  | 'top-rated'
  | 'quick'
  | 'premium';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  category: ServiceCategory;
  image?: string;
}

// Aligned with database service_category enum
export type ServiceCategory =
  | 'haircut'
  | 'beard'
  | 'shave'
  | 'hair_treatment'
  | 'facial'
  | 'coloring'
  | 'styling'
  | 'package';

export interface WorkingHours {
  [day: string]: { open: string; close: string; isOpen: boolean };
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
  likes: number;
  isLiked?: boolean;
  reply?: string;
}

// ====== BOOKING TYPES ======
export interface Booking {
  id: string;
  barberId: string;
  barberName: string;
  barberAvatar: string;
  services: Service[];
  date: string;
  time: string;
  status: BookingStatus;
  totalPrice: number;
  discountAmount?: number;
  note?: string;
  createdAt: string;
  location: string;
  isMobileService: boolean;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  reviewed: boolean;
  rating?: number;
  address?: string;
}

// Aligned with database booking_status enum
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentMethod = 'ccp' | 'baridi-mob' | 'cash' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

// ====== CHAT TYPES ======
export interface Chat {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'voice' | 'location' | 'booking';
  isRead: boolean;
}

// ====== FORUM TYPES ======
export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'user' | 'barber' | 'admin' | 'expert';
  isVerified: boolean;
  title: string;
  content: string;
  image?: string;
  category: ForumCategory;
  tags: string[];
  likes: number;
  comments: ForumComment[];
  views: number;
  createdAt: string;
  isLiked: boolean;
  isPinned: boolean;
  isAnnouncement: boolean;
}

export type ForumCategory =
  | 'general'
  | 'discussions'
  | 'tips'
  | 'tips-tricks'
  | 'products'
  | 'hairstyles'
  | 'showcase'
  | 'questions'
  | 'competitions'
  | 'verified-only';

export interface ForumComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'user' | 'barber' | 'admin' | 'expert';
  isVerified: boolean;
  content: string;
  likes: number;
  replies: ForumComment[];
  createdAt: string;
  isLiked: boolean;
}

// ====== COMPETITION TYPES ======
export interface Competition {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  participants: CompetitionParticipant[];
  prize: string;
  badgeReward: string;
  status: 'active' | 'upcoming' | 'ended';
  rules: string[];
}

export interface CompetitionParticipant {
  userId: string;
  userName: string;
  userAvatar: string;
  score: number;
  rank: number;
}

// ====== USER TYPES ======
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  isVerified: boolean;
  idCardNumber?: string;
  idCardVerified: boolean;
  role: 'user' | 'barber' | 'admin';
  joinedDate: string;
  bio?: string;
  location?: string;
  wilaya?: string;
  followers: number;
  following: number;
  bookings: Booking[];
  savedBarbers: string[];
  notificationsEnabled: boolean;
  theme: ThemeName;
  language: 'ar' | 'fr' | 'en';
  isSubscribed: boolean;
  subscriptionPlan?: 'free' | 'basic' | 'pro' | 'premium' | 'professional' | 'business';
  subscriptionExpiry?: string;
  badges: Badge[];
  stats: UserStats;
  linkedAccounts: LinkedAccount[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
  color: string;
}

export interface UserStats {
  totalBookings: number;
  totalSpent: number;
  favoriteBarber?: string;
  streakDays: number;
  points: number;
  rank: string;
}

export interface LinkedAccount {
  provider: 'google' | 'facebook' | 'apple' | 'instagram';
  connected: boolean;
  username?: string;
}

// ====== THEME TYPES ======
export type ThemeName =
  | 'classic'
  | 'modern'
  | 'digital'
  | 'red'
  | 'blue'
  | 'gradient'
  | 'dark'
  | 'gold'
  | 'neon'
  | 'hallaqi';

export type AnimationStyle = 'smooth' | 'modern' | 'digital' | 'bouncy' | 'minimal';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    gradient?: string;
  };
  animation: AnimationStyle;
  borderRadius: string;
  fontFamily: string;
}

// ====== NOTIFICATION TYPES ======
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'message' | 'forum' | 'promo' | 'system' | 'competition';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  image?: string;
}

// ====== SETTINGS TYPES ======
export interface AppSettings {
  theme: ThemeName;
  animationStyle: AnimationStyle;
  language: 'ar' | 'fr' | 'en';
  /** ISO 3166-1 alpha-2 country code (display / localization). */
  countryCode: string;
  /** Display currency code (prices stored in DZD; conversion is indicative). */
  currencyCode: string;
  /** Preferred wilaya for booking discovery (synced when logged in). */
  discoveryWilaya?: string;
  notifications: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    bookingReminders: boolean;
    promotions: boolean;
    forumReplies: boolean;
    competitionUpdates: boolean;
    newFollowers: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showLocation: boolean;
    showBookings: boolean;
    allowMessages: 'all' | 'followed' | 'none';
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
  };
}

// ====== PAYMENT TYPES ======
export interface CCPAccount {
  accountNumber: string;
  cardNumber: string;
  balance: number;
  isLinked: boolean;
}

export interface BaridiMobAccount {
  phoneNumber: string;
  isLinked: boolean;
  balance: number;
}

// ====== AI FEATURES TYPES ======
export interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'available' | 'coming-soon' | 'beta';
  category: AICategory;
}

export type AICategory = 'haircut' | 'style' | 'color' | 'advice' | 'virtual-try' | 'analysis';

// ====== NAVIGATION ======
/** RTL order (right→left): booking · forum · ai-hub · marketplace · profile */
export type TabName = 'booking' | 'forum' | 'ai-hub' | 'marketplace' | 'profile' | 'appointments' | 'camera';

// ====== SCREEN NAVIGATION ======
export type ScreenName =
  | 'home'
  | 'barber-detail'
  | 'booking-flow'
  | 'chat-room'
  | 'messages'
  | 'notifications'
  | 'post-detail'
  | 'create-post'
  | 'search'
  | 'onboarding'
  | 'splash'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'mfa-challenge'
  | 'payment-success'
  | 'admin-dashboard'
  | 'ai-advisor'
  | 'ai-hub-tool'
  | 'store-detail'
  | 'company-detail'
  | 'doctor-detail'
  | 'product-detail'
  | 'seller-dashboard'
  | 'seller-products'
  | 'seller-placements'
  | 'seller-profile-edit'
  | 'marketplace-analytics'
  | 'ai-listing-tools'
  | 'compare-barbers'
  | 'coming-soon';

export interface ScreenParams {
  barberId?: string;
  barberIds?: string;
  chatId?: string;
  postId?: string;
  bookingId?: string;
  serviceIds?: string;
  preferredTime?: string;
  preferredDate?: string;
  rescheduleBookingId?: string;
  redirectScreen?: string;
  redirectTab?: string;
  title?: string;
  description?: string;
  eta?: string;
  sellerId?: string;
  productId?: string;
  tool?: string;
  role?: string;
  plan?: string;
  [key: string]: string | undefined;
}

// ====== WILAYAS (ALGERIAN STATES) ======
export interface Wilaya {
  code: number;
  name: string;
  nameAr: string;
}
