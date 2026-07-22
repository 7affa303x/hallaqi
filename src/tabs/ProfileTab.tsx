import { useCallback, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useApp } from '@/contexts/useApp';
import { settingsSections } from '@/data/mockData';
import type { ThemeName, AnimationStyle } from '@/types';
import { themes, animationStyles } from '@/data/themes';
import {
  User as UserIcon, Shield, BadgeCheck, Crown, Settings, ChevronLeft,
  Star, Calendar, MapPin, Link as LinkIcon, LogOut,
  Bell, Eye, Palette, Globe, Type, Mail,
  MessageSquare, Trophy, UserPlus, Lock,
  Smartphone, CreditCard, Wallet, HelpCircle,
  Phone, Bug, Lightbulb, Info, FileText, FileCode,
  Trash2, Download, AlertTriangle, Check, X, Sparkles,
  Scissors, Clock, TrendingUp, Award, Zap, Crown as CrownIcon,
  ArrowLeft, LogIn, UserPlus as UserPlusIcon, Gift,
  Store, Building2, Stethoscope, CalendarDays, ShoppingBag, Bookmark,
  Pencil,
} from 'lucide-react';
import EditBarberProfile from '@/components/EditBarberProfile';
import ServicesManagement from '@/components/ServicesManagement';
import PausedFeatureBanner from '@/components/PausedFeatureBanner';
import SavedItemsPage from '@/components/SavedItemsPage';
import BarberOnboardingCard from '@/components/BarberOnboardingCard';
import ProgressCard from '@/components/growth/ProgressCard';
import GrowthQuickActions from '@/components/growth/GrowthQuickActions';
import BadgeShowcase from '@/components/growth/BadgeShowcase';
import ProfileMissionsStrip from '@/components/growth/ProfileMissionsStrip';
import ProfileAchievementsStrip from '@/components/growth/ProfileAchievementsStrip';
import AmbassadorCard from '@/components/growth/AmbassadorCard';
import PendingTagsBanner from '@/components/community/PendingTagsBanner';
import { TransformationPendingBanner } from '@/components/community/ShareExperienceWatcher';
import TransformationGallery from '@/components/community/TransformationGallery';
import LocalRankCard from '@/components/community/LocalRankCard';
import CommunityStatsCard from '@/components/community/CommunityStatsCard';
import { FEATURE_FLAGS, isWebPushConfigured, isWhatsAppSupportConfigured, getSupportWhatsAppUrl, PAUSED_LABEL, COMING_SOON_LABEL, isSettingsItemVisible, canAccessMfaSettings } from '@/lib/featureFlags';
import type { OnboardingStepId } from '@/lib/barberOnboarding';
import { CANCEL_POLICY } from '@/lib/cancelPolicy';
import {
  createIdVerificationRequest,
  getLatestIdVerificationRequest,
  getLatestSubscriptionRequest,
  getSubscriptionPlans,
  createSubscriptionRequest,
  deleteCurrentAccount,
  exportUserData,
  getLoyaltyDashboard,
  redeemLoyaltyReward,
  getUserConversations,
  getBlockedUsers,
  blockUser,
  unblockUser,
} from '@/supabase/database';
import { uploadIdCard } from '@/supabase/storage';
import { supabase } from '@/supabase/client';
import type { SubscriptionPlan } from '@/types/supabase-aliases';
import {
  disableWebPush,
  enableWebPush,
  getPushSubscription,
  isWebPushSupported,
} from '@/lib/push-notifications';
import { translate } from '@/lib/i18n';
import { WORLD_COUNTRIES, countryLabel } from '@/lib/locale/countries';
import { DISPLAY_CURRENCIES, currencyLabel, currencySymbol, findCurrency } from '@/lib/locale/currencies';
import { saveProfileScrollPosition, restoreProfileScrollPosition } from '@/lib/scroll';
import { useScrollToTopOnMount } from '@/hooks/useScrollToTopOnMount';

interface UserStats {
  totalBookings?: number;
  totalSpent?: number;
  streakDays?: number;
  points?: number;
  rank?: string;
}

interface UserBadge {
  id: string;
  name: string;
  description: string;
  color: string;
}

const iconMap: Record<string, LucideIcon> = {
  Shield, BadgeCheck, Settings, Star, Calendar, MapPin, LinkIcon,
  LogOut, Bell, Eye, Palette, Globe, Type, Mail, MessageSquare, Trophy,
  UserPlus, Lock, Smartphone, CreditCard, Wallet, HelpCircle, Phone,
  Bug, Lightbulb, Info, FileText, FileCode, Trash2, Download, AlertTriangle,
  Check, X, Sparkles, Scissors, Clock, TrendingUp, Award, Zap, Gift,
  Crown: CrownIcon,
};

type ProfileSubPage = 'main' | 'theme' | 'animation' | 'language' | 'country' | 'currency' | 'notifications' |
  'privacy' | 'account' | 'subscription' | 'payment' | 'id-verification' |
  'linked-accounts' | 'help' | 'about' | 'badges' | 'stats' | 'edit-profile' | 'services' | 'loyalty' |
  'accessibility' | 'privacy-policy' | 'terms' | 'licenses' | 'security' | 'saves' | 'account-type';

export default function ProfileTab() {
  const { themeConfig, settings, navigate, setActiveTab, unreadCount, bookings, barbers, screenParams } = useApp();
  const { appUser, user, logout, isLoading: authLoading, needsLogin } = useAuthGate();
  const [subPage, setSubPage] = useState<ProfileSubPage>(() => {
    if (screenParams?.openLegal === 'terms') return 'terms';
    if (screenParams?.openLegal === 'privacy') return 'privacy-policy';
    if (screenParams?.openLegal === 'help') return 'help';
    if (screenParams?.openLegal === 'about') return 'about';
    return 'main';
  });
  const [editSection, setEditSection] = useState<'photos' | 'personal' | 'business' | 'portfolio' | 'calendar' | undefined>();
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [loyaltySummary, setLoyaltySummary] = useState<{ points: number; tier: string }>({ points: 0, tier: 'bronze' });
  const [pane, setPane] = useState<'profile' | 'settings'>(() => {
    try {
      return sessionStorage.getItem('hallaqi-profile-pane') === 'settings' ? 'settings' : 'profile';
    } catch {
      return 'profile';
    }
  });

  const switchPane = (next: 'profile' | 'settings') => {
    setPane(next);
    try { sessionStorage.setItem('hallaqi-profile-pane', next); } catch { /* ignore */ }
  };

  const openSubPage = useCallback((page: ProfileSubPage) => {
    saveProfileScrollPosition();
    setSubPage(page);
  }, []);

  const backToMain = useCallback(() => {
    setSubPage('main');
    restoreProfileScrollPosition();
  }, []);

  useEffect(() => {
    if (screenParams?.openLegal === 'terms') setSubPage('terms');
    if (screenParams?.openLegal === 'privacy') setSubPage('privacy-policy');
    if (screenParams?.openLegal === 'help') setSubPage('help');
    if (screenParams?.openLegal === 'about') setSubPage('about');
  }, [screenParams?.openLegal]);

  useEffect(() => {
    if (!appUser) return;
    void getLoyaltyDashboard(appUser.id).then(data => {
      setLoyaltySummary({ points: data.account?.points || 0, tier: data.account?.tier || 'bronze' });
    }).catch(() => {});
  }, [appUser]);

  const handleLogout = async () => {
    try {
      await logout();
      setSubPage('main');
      switchPane('profile');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Legal / about / help are public — available before login
  if (subPage === 'help') return <InformationPage onBack={backToMain} kind="help" />;
  if (subPage === 'about') return <InformationPage onBack={backToMain} kind="about" />;
  if (subPage === 'privacy-policy') return <LegalPage onBack={backToMain} kind="privacy" />;
  if (subPage === 'terms') return <LegalPage onBack={backToMain} kind="terms" />;
  if (subPage === 'licenses') return <LegalPage onBack={backToMain} kind="licenses" />;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: themeConfig.colors.primary + '15' }}>
            <UserIcon size={36} style={{ color: themeConfig.colors.primary }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: themeConfig.colors.text }}>سجل الدخول إلى حسابك</h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>سجل الدخول للوصول لحجوزاتك، المحادثات، والمزيد من الميزات</p>
          <div className="space-y-2">
            <button onClick={() => navigate('login')} className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: themeConfig.colors.primary }}>
              <LogIn size={18} /> {translate(settings.language, 'signIn')}
            </button>
            <button onClick={() => navigate('register')} className="w-full h-12 rounded-xl text-sm font-bold border flex items-center justify-center gap-2" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
              <UserPlusIcon size={18} /> {translate(settings.language, 'createAccount')}
            </button>
          </div>
          <p className="text-[10px] mt-4" style={{ color: themeConfig.colors.textMuted }}>بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية</p>
        </div>
      </div>
    );
  }

  // Map Profile DB fields to UI fields
  const userName = appUser?.full_name || appUser?.username || user?.email?.split('@')[0] || 'مستخدم';
  const userEmail = user?.email || '';
  const userPhone = appUser?.phone_number || '';
  const userAvatar = appUser?.avatar_url || '/logo-icon.png';
  const isVerified = appUser?.verification_status === 'verified' || appUser?.verification_status === 'premium';
  const isIdVerified = isVerified;
  const userRole = String(appUser?.user_role || 'client');

  if (subPage === 'theme') return <ThemeSelector onBack={backToMain} />;
  if (subPage === 'animation') return <AnimationSelector onBack={backToMain} />;
  if (subPage === 'language') return <LanguageSelector onBack={backToMain} />;
  if (subPage === 'country') return <CountrySelector onBack={backToMain} />;
  if (subPage === 'currency') return <CurrencySelector onBack={backToMain} />;
  if (subPage === 'notifications') return <NotificationsSettings onBack={backToMain} />;
  if (subPage === 'privacy') return <PrivacySettings onBack={backToMain} />;
  if (subPage === 'subscription') return <SubscriptionPage onBack={backToMain} />;
  if (subPage === 'payment') return <PaymentMethods onBack={backToMain} />;
  if (subPage === 'id-verification') return <IDVerification onBack={backToMain} />;
  if (subPage === 'linked-accounts') return <LinkedAccounts onBack={backToMain} />;
  if (subPage === 'badges') return <BadgesPage onBack={backToMain} />;
  if (subPage === 'stats') return <StatsPage onBack={backToMain} />;
  if (subPage === 'loyalty') return <LoyaltyPage onBack={backToMain} />;
  if (subPage === 'accessibility') return <AccessibilitySettings onBack={backToMain} />;
  if (subPage === 'security') return <SecuritySettings onBack={backToMain} />;
  if (subPage === 'saves') return <SavedItemsPage onBack={backToMain} />;
  if (subPage === 'account-type') return <AccountTypeSwitcher onBack={backToMain} currentRole={userRole} />;
  if (subPage === 'edit-profile') return <EditBarberProfile onBack={backToMain} userRole={userRole} initialSection={editSection} />;
  if (subPage === 'services') return <ServicesManagement onBack={backToMain} />;

  const storedStats = (appUser as unknown as { stats?: UserStats })?.stats;
  const stats = {
    totalBookings: bookings.length,
    totalSpent: bookings.filter(booking => booking.status === 'completed').reduce((sum, booking) => sum + booking.totalPrice, 0),
    streakDays: storedStats?.streakDays || 0,
    points: loyaltySummary.points,
    rank: ({ bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' } as Record<string, string>)[loyaltySummary.tier] || 'برونزي',
  };
  const badges = (appUser as unknown as { badges?: UserBadge[] })?.badges || [];
  const ownProfessional = barbers.find(barber => barber.id === appUser?.id);
  const followers = ownProfessional?.followers || 0;

  const openOnboardingStep = (stepId: OnboardingStepId) => {
    if (stepId === 'services') openSubPage('services');
    else if (stepId === 'verification') openSubPage('id-verification');
    else if (stepId === 'portfolio') {
      setEditSection('portfolio');
      openSubPage('edit-profile');
    } else if (stepId === 'cover') {
      setEditSection('photos');
      openSubPage('edit-profile');
    } else if (stepId === 'info') {
      setEditSection('business');
      openSubPage('edit-profile');
    } else {
      setEditSection('personal');
      openSubPage('edit-profile');
    }
  };

  return (
    <div className="pb-20 overflow-x-hidden max-w-full">
      <div className="px-4 pt-4 pb-6" style={{ backgroundColor: themeConfig.colors.primary, borderRadius: '0 0 2rem 2rem' }}>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex flex-col gap-1.5 shrink-0">
            {pane === 'profile' && (userRole === 'barber' || userRole === 'specialist') && (
              <>
                <button
                  type="button"
                  onClick={() => openSubPage('services')}
                  className="h-8 px-2.5 rounded-lg flex items-center gap-1 bg-white/15 text-white text-[10px] font-bold"
                >
                  <Scissors size={12} /> الخدمات
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className="h-8 px-2.5 rounded-lg flex items-center gap-1 bg-white/15 text-white text-[10px] font-bold"
                >
                  <CalendarDays size={12} /> الاستوديو
                </button>
              </>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center px-1">
            <h1 className="text-lg font-bold text-white truncate">
              {pane === 'settings' ? 'الإعدادات' : translate(settings.language, 'profile')}
            </h1>
            <p className="text-[10px] text-white/70 mt-0.5 truncate">
              {findCurrency(settings.currencyCode).code}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => navigate('notifications')}
              aria-label="الإشعارات"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-white/10"
            >
              <Bell size={16} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                  {Math.min(unreadCount, 99)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => openSubPage('saves')}
              aria-label="المحفوظات"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10"
            >
              <Bookmark size={15} className="text-white" />
            </button>
            <button
              type="button"
              onClick={() => switchPane(pane === 'profile' ? 'settings' : 'profile')}
              aria-label={pane === 'profile' ? 'الإعدادات' : 'البروفايل'}
              className="h-9 px-3 rounded-xl flex items-center justify-center bg-white/15 text-white text-[11px] font-bold"
            >
              {pane === 'profile' ? 'الإعدادات' : 'البروفايل'}
            </button>
          </div>
        </div>

        {pane === 'profile' && (
        <>
        <button
          type="button"
          onClick={() => { setEditSection('photos'); openSubPage('edit-profile'); }}
          className="w-full flex items-center gap-3 text-right rounded-2xl p-1 -mx-1 active:bg-white/10 transition-colors"
          aria-label="تعديل البروفايل"
        >
          <div className="relative">
            <img src={userAvatar} alt={userName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30" />
            {isIdVerified && <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-white"><BadgeCheck size={12} className="text-white" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white truncate">{userName}</h2>
              {isVerified && <BadgeCheck size={16} className="text-sky-300 fill-sky-300 flex-shrink-0" />}
              <Pencil size={14} className="text-white/70 flex-shrink-0" />
            </div>
            <p className="text-xs text-white/70 mt-0.5 truncate">{userEmail}</p>
            {userPhone && <p className="text-xs text-white/70 truncate">{userPhone}</p>}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {FEATURE_FLAGS.gamificationSurfacesEnabled && (
                <>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">{stats.rank}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">{stats.points} نقطة</span>
                </>
              )}
              {userRole === 'admin' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-white font-medium">مشرف</span>}
              {(userRole === 'barber' || userRole === 'specialist') && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">حلاق</span>
              )}
              {userRole === 'store' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">متجر</span>
              )}
              <span className="text-[10px] text-white/60">اضغط للتعديل</span>
            </div>
          </div>
        </button>

        {FEATURE_FLAGS.gamificationSurfacesEnabled && (
        <div className="flex gap-3 mt-4">
          <button onClick={() => openSubPage("stats")} className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{stats.totalBookings}</p><p className="text-[10px] text-white/60">حجوزات</p>
          </button>
          <button onClick={() => openSubPage("badges")} className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{badges.length}</p><p className="text-[10px] text-white/60">شارات</p>
          </button>
          <div className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{followers}</p><p className="text-[10px] text-white/60">متابعين</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{stats.streakDays}</p><p className="text-[10px] text-white/60">يوم متتالي</p>
          </div>
        </div>
        )}
        </>
        )}
      </div>

      {pane === 'profile' && (
      <>
      {/* Progression + Community (no redesign) */}
      <PendingTagsBanner />
      <TransformationPendingBanner />
      <div className="px-4 mt-4 space-y-3">
        <ProgressCard />
        <GrowthQuickActions />
        <LocalRankCard />
        <CommunityStatsCard />
        <TransformationGallery />
        <AmbassadorCard />
        <ProfileMissionsStrip />
        <BadgeShowcase />
        <ProfileAchievementsStrip />
      </div>
      </>
      )}

      {pane === 'profile' && (userRole === 'barber' || userRole === 'specialist') && appUser && ownProfessional && (
        <BarberOnboardingCard
          userId={appUser.id}
          progressInput={{
            hasNameAndBio: Boolean(ownProfessional.name && ownProfessional.bio),
            hasServices: ownProfessional.services.length > 0,
            hasCover: Boolean(ownProfessional.coverImage && !ownProfessional.coverImage.endsWith('/logo-wordmark.png')),
            hasPortfolio: ownProfessional.portfolio.length > 0,
            isVerified: ownProfessional.idCardVerified || ownProfessional.isVerified,
          }}
          colors={themeConfig.colors}
          onContinue={openOnboardingStep}
        />
      )}

      {pane === 'profile' && appUser?.user_role === 'admin' && (
        <div className="px-4 mt-4">
          <button
            onClick={() => navigate('admin-dashboard')}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: themeConfig.colors.primary, color: themeConfig.colors.surface }}
          >
            <Shield size={20} />
            <span className="text-sm font-bold">لوحة التحكم</span>
          </button>
        </div>
      )}


      {/* Client: appointments moved out of bottom nav — accessible here */}
      {pane === 'profile' && (userRole === 'client' || !appUser) && (
        <div className="px-4 mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className="flex items-center gap-2 p-3 rounded-2xl border text-right"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <CalendarDays size={16} style={{ color: themeConfig.colors.primary }} />
            <span>
              <span className="block text-xs font-bold" style={{ color: themeConfig.colors.text }}>مواعيدي</span>
              <span className="block text-[10px]" style={{ color: themeConfig.colors.textMuted }}>الحجوزات القادمة</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className="flex items-center gap-2 p-3 rounded-2xl border text-right"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <ShoppingBag size={16} style={{ color: themeConfig.colors.accent }} />
            <span>
              <span className="block text-xs font-bold" style={{ color: themeConfig.colors.text }}>السوق</span>
              <span className="block text-[10px]" style={{ color: themeConfig.colors.textMuted }}>اكتشف المنتجات</span>
            </span>
          </button>
        </div>
      )}

      {/* Store / Company / Doctor — separate dashboards (no barber studio mix) */}
      {pane === 'profile' && (userRole === 'store' || userRole === 'company' || userRole === 'doctor') && (
        <div className="px-4 mt-4 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => navigate('seller-dashboard', { role: userRole, sellerId: appUser?.id })}
            className="flex items-center gap-3 p-4 rounded-2xl border text-right"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            {userRole === 'company' ? <Building2 size={18} style={{ color: themeConfig.colors.primary }} />
              : userRole === 'doctor' ? <Stethoscope size={18} style={{ color: themeConfig.colors.primary }} />
                : <Store size={18} style={{ color: themeConfig.colors.primary }} />}
            <span className="flex-1">
              <span className="block text-sm font-bold" style={{ color: themeConfig.colors.text }}>
                {userRole === 'company' ? 'لوحة الشركة' : userRole === 'doctor' ? 'لوحة الطبيب' : 'لوحة المتجر'}
              </span>
              <span className="block text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
                منتجات وتحليلات{FEATURE_FLAGS.hideMonetizationSurfaces ? '' : ' · اشتراكات · مواضع إعلان'}
              </span>
            </span>
            <ChevronLeft size={16} style={{ color: themeConfig.colors.textMuted }} />
          </button>
        </div>
      )}

      {pane === 'profile' && FEATURE_FLAGS.loyaltyEnabled && (
        <div className="px-4 mt-4">
          <button
            type="button"
            onClick={() => openSubPage('loyalty')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border text-right"
            style={{ backgroundColor: themeConfig.colors.accent + '0D', borderColor: themeConfig.colors.accent + '40' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.accent + '18' }}>
              <Gift size={21} style={{ color: themeConfig.colors.accent }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>برنامج ولاء حلاقي</p>
              <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>اكسب نقاطاً من الحجوزات واستبدلها بمكافآت</p>
            </div>
            <ChevronLeft size={17} style={{ color: themeConfig.colors.textMuted }} />
          </button>
        </div>
      )}

      {pane === 'settings' && actionError && (
        <p role="alert" className="mx-4 mt-4 p-3 rounded-xl text-xs" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>
          {actionError}
        </p>
      )}
      {pane === 'settings' && actionMessage && (
        <p role="status" className="mx-4 mt-4 p-3 rounded-xl text-xs" style={{ backgroundColor: themeConfig.colors.success + '10', color: themeConfig.colors.success }}>
          {actionMessage}
        </p>
      )}

      {pane === 'settings' && (
      <div className="px-4 mt-4 space-y-4">
        {FEATURE_FLAGS.accountTypeSwitchEnabled && appUser && (
          <button
            type="button"
            onClick={() => openSubPage('account-type')}
            className="w-full flex items-center gap-2 p-3 rounded-2xl border text-right"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <UserPlus size={16} style={{ color: themeConfig.colors.primary }} />
            <span className="flex-1">
              <span className="block text-xs font-bold" style={{ color: themeConfig.colors.text }}>تغيير نوع الحساب</span>
              <span className="block text-[10px]" style={{ color: themeConfig.colors.textMuted }}>زبون · حلاق · متجر — بدون شروط</span>
            </span>
            <ChevronLeft size={16} style={{ color: themeConfig.colors.textMuted }} />
          </button>
        )}
        {canAccessMfaSettings(userRole) && (
          <button
            type="button"
            onClick={() => openSubPage('security')}
            className="w-full flex items-center gap-2 p-3 rounded-2xl border text-right"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <Shield size={16} style={{ color: themeConfig.colors.primary }} />
            <span className="flex-1">
              <span className="block text-xs font-bold" style={{ color: themeConfig.colors.text }}>أمان الحساب (MFA)</span>
              <span className="block text-[10px]" style={{ color: themeConfig.colors.textMuted }}>مصادقة ثنائية للحسابات المميزة</span>
            </span>
            <ChevronLeft size={16} style={{ color: themeConfig.colors.textMuted }} />
          </button>
        )}
        {settingsSections.map((section, sectionIndex) => {
          const visibleItems = section.items.filter(item => item.id !== 'logout' && isSettingsItemVisible(item.id, userRole));
          if (visibleItems.length === 0) return null;
          return (
          <div key={section.title} id={sectionIndex === 0 ? 'profile-settings' : undefined}>
            <h3 className="text-xs font-bold mb-2 px-1" style={{ color: themeConfig.colors.textMuted }}>{section.title}</h3>
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              {visibleItems.map((item, index) => {
                const Icon = iconMap[item.icon] || Settings;
                const isDanger = item.type === 'danger';
                const isLast = index === visibleItems.length - 1;
                const handleClick = async () => {
                  setActionError('');
                  setActionMessage('');
                  if (item.id === 'clearCache') {
                    try {
                      if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(key => caches.delete(key)));
                      }
                      try { localStorage.removeItem('hallaqi-app-build-v1'); } catch { /* ignore */ }
                      setActionMessage('تم مسح الذاكرة — جاري التحديث…');
                      window.setTimeout(() => window.location.reload(), 600);
                    } catch {
                      setActionMessage('تعذر مسح الذاكرة المؤقتة');
                    }
                    return;
                  }
                  if (item.id === 'exportData' && appUser) {
                    try {
                      const exported = await exportUserData(appUser.id);
                      const url = URL.createObjectURL(new Blob(
                        [JSON.stringify(exported, null, 2)],
                        { type: 'application/json' }
                      ));
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `hallaqi-data-${new Date().toISOString().slice(0, 10)}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : 'تعذر تصدير البيانات');
                    }
                    return;
                  }
                  if (item.id === 'deleteAccount') {
                    const confirmed = window.confirm('سيتم حذف حسابك وبياناته نهائياً. هل أنت متأكد؟');
                    if (!confirmed) return;
                    try {
                      await deleteCurrentAccount();
                      await logout();
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : 'تعذر حذف الحساب');
                    }
                    return;
                  }
                  if (item.id === 'changePassword') { navigate('forgot-password'); return; }
                  if (item.id === 'contactUs') {
                    const wa = getSupportWhatsAppUrl();
                    window.location.href = wa || 'mailto:support@hallaqi.app';
                    return;
                  }
                  if (item.id === 'reportBug') { window.location.href = 'mailto:support@hallaqi.app?subject=Hallaqi%20Bug%20Report'; return; }
                  if (item.id === 'featureRequest') { window.location.href = 'mailto:support@hallaqi.app?subject=Hallaqi%20Feature%20Request'; return; }
                  if (item.id === 'editProfile') {
                    setEditSection('photos');
                    openSubPage('edit-profile');
                    return;
                  }
                  const pageMap: Record<string, ProfileSubPage> = {
                    theme: 'theme', animation: 'animation', language: 'language', country: 'country', currency: 'currency', fontSize: 'accessibility',
                    pushNotifications: 'notifications', emailNotifications: 'notifications', smsNotifications: 'notifications',
                    bookingReminders: 'notifications', promotions: 'notifications', forumReplies: 'notifications',
                    competitionUpdates: 'notifications', newFollowers: 'notifications',
                    profileVisible: 'privacy', showLocation: 'privacy', showBookings: 'privacy', allowMessages: 'privacy', blockList: 'privacy',
                    paymentMethods: 'payment',
                    idVerification: 'id-verification', linkedAccounts: 'linked-accounts', helpCenter: 'help', aboutApp: 'about',
                    services: 'services', privacyPolicy: 'privacy-policy', termsOfService: 'terms', licenses: 'licenses',
                  };
                  const page = pageMap[item.id]; if (page) openSubPage(page);
                };
                return (
                  <button key={item.id} onClick={() => void handleClick()} className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-all hover:bg-black/5 ${!isLast ? 'border-b' : ''}`} style={{ borderColor: themeConfig.colors.border + '60' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isDanger ? themeConfig.colors.error + '10' : themeConfig.colors.primary + '08' }}>
                      <Icon size={16} style={{ color: isDanger ? themeConfig.colors.error : themeConfig.colors.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: isDanger ? themeConfig.colors.error : themeConfig.colors.text }}>{item.label}</p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: themeConfig.colors.textMuted }}>{item.description}</p>
                    </div>
                    <ChevronLeft size={16} style={{ color: themeConfig.colors.textMuted + '60' }} className="flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border"
          style={{
            backgroundColor: themeConfig.colors.error + '12',
            borderColor: themeConfig.colors.error + '40',
            color: themeConfig.colors.error,
          }}
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
      )}
    </div>
  );
}

// ====== SUB PAGE COMPONENTS ======

type LoyaltyData = Awaited<ReturnType<typeof getLoyaltyDashboard>>;

function AccountTypeSwitcher({ onBack, currentRole }: { onBack: () => void; currentRole: string }) {
  const { themeConfig } = useApp();
  const { refreshAppUser } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const options = [
    { id: 'client' as const, label: 'زبون', desc: 'حجز مواعيد وتصفح السوق' },
    { id: 'barber' as const, label: 'حلاق', desc: 'استوديو عمل وحجوزات العملاء' },
    { id: 'store' as const, label: 'متجر', desc: 'بيع منتجات العناية' },
  ];

  const switchRole = async (role: 'client' | 'barber' | 'store') => {
    if (role === currentRole || busy) return;
    setBusy(role);
    setError('');
    setMessage('');
    try {
      const { switchOwnAccountType } = await import('@/supabase/database');
      await switchOwnAccountType(role);
      await refreshAppUser();
      setMessage('تم تغيير نوع الحساب');
      window.setTimeout(() => onBack(), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير نوع الحساب');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>نوع الحساب</h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>
          يمكنك التبديل بين زبون وحلاق ومتجر مباشرة. تسجيل الطبيب مخفي حالياً حتى التوثيق.
        </p>
        {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.error}12`, color: themeConfig.colors.error }}>{error}</p>}
        {message && <p role="status" className="text-xs p-3 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.success}12`, color: themeConfig.colors.success }}>{message}</p>}
        {options.map(option => {
          const active = currentRole === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void switchRole(option.id)}
              className="w-full p-4 rounded-2xl border text-right disabled:opacity-60"
              style={{
                backgroundColor: active ? `${themeConfig.colors.primary}10` : themeConfig.colors.surface,
                borderColor: active ? themeConfig.colors.primary : themeConfig.colors.border,
              }}
            >
              <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
                {option.label}
                {active ? ' · الحالي' : ''}
                {busy === option.id ? '…' : ''}
              </p>
              <p className="text-[11px] mt-1" style={{ color: themeConfig.colors.textMuted }}>{option.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SecuritySettings({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const [verifiedFactorId, setVerifiedFactorId] = useState('');
  const [enrollment, setEnrollment] = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadFactors = useCallback(async () => {
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError(listError.message);
    } else {
      setVerifiedFactorId(data.totp.find(factor => factor.status === 'verified')?.id || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadFactors(); }, [loadFactors]);

  const enroll = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Hallaqi Authenticator',
      });
      if (enrollError) throw enrollError;
      setEnrollment({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر بدء المصادقة الثنائية');
    } finally {
      setLoading(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollment || !/^\d{6}$/.test(code)) return;
    setLoading(true);
    setError('');
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollment.id,
      });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      setEnrollment(null);
      setCode('');
      setMessage('تم تفعيل المصادقة الثنائية بنجاح');
      await loadFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (!verifiedFactorId || !window.confirm('هل تريد إيقاف المصادقة الثنائية؟')) return;
    setLoading(true);
    setError('');
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactorId,
    });
    if (unenrollError) setError(unenrollError.message);
    else {
      setVerifiedFactorId('');
      setMessage('تم إيقاف المصادقة الثنائية');
    }
    setLoading(false);
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>أمان الحساب</h2>
      </div>
      <div className="p-4">
        <div className="rounded-2xl border p-5 text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: verifiedFactorId ? themeConfig.colors.success : themeConfig.colors.border }}>
          <Shield size={34} className="mx-auto" style={{ color: verifiedFactorId ? themeConfig.colors.success : themeConfig.colors.primary }} />
          <h3 className="text-sm font-bold mt-2" style={{ color: themeConfig.colors.text }}>{verifiedFactorId ? 'المصادقة الثنائية مفعلة' : 'احمِ حسابك بتطبيق مصادقة'}</h3>
          <p className="text-xs mt-1 leading-5" style={{ color: themeConfig.colors.textMuted }}>استخدم Google Authenticator أو أي تطبيق TOTP لإضافة رمز عند تسجيل الدخول.</p>
          {!verifiedFactorId && !enrollment && <button onClick={() => void enroll()} disabled={loading} className="w-full h-10 rounded-xl text-xs font-bold text-white mt-4 disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>بدء الإعداد</button>}
          {verifiedFactorId && <button onClick={() => void disable()} disabled={loading} className="w-full h-10 rounded-xl text-xs font-bold mt-4 disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>إيقاف المصادقة الثنائية</button>}
        </div>

        {enrollment && (
          <div className="rounded-2xl border p-4 mt-4 text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.primary }}>
            <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>امسح الرمز بتطبيق المصادقة</p>
            <img src={enrollment.qrCode} alt="رمز إعداد المصادقة الثنائية" className="w-48 h-48 mx-auto mt-3 bg-white rounded-xl" />
            <p className="text-[10px] mt-2" style={{ color: themeConfig.colors.textMuted }}>أو أدخل المفتاح يدوياً</p>
            <code className="block text-[10px] break-all p-2 rounded-lg mt-1" style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}>{enrollment.secret}</code>
            <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="رمز التحقق" className="w-full h-12 rounded-xl border text-center text-xl font-mono tracking-[0.4em] mt-3" style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }} />
            <button onClick={() => void verifyEnrollment()} disabled={loading || code.length !== 6} className="w-full h-10 rounded-xl text-xs font-bold text-white mt-3 disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>تأكيد الرمز</button>
          </div>
        )}
        {message && <p role="status" className="text-xs p-3 rounded-xl mt-3" style={{ backgroundColor: themeConfig.colors.success + '10', color: themeConfig.colors.success }}>{message}</p>}
        {error && <p role="alert" className="text-xs p-3 rounded-xl mt-3" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>{error}</p>}
      </div>
    </div>
  );
}

function AccessibilitySettings({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  useScrollToTopOnMount();
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>سهولة الاستخدام</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <p className="text-xs font-bold mb-3" style={{ color: themeConfig.colors.text }}>حجم الخط</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['small', 'صغير'],
              ['medium', 'متوسط'],
              ['large', 'كبير'],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => updateSettings({ accessibility: { ...settings.accessibility, fontSize: value } })} className="h-10 rounded-xl text-xs font-bold" style={{ backgroundColor: settings.accessibility.fontSize === value ? themeConfig.colors.primary : themeConfig.colors.background, color: settings.accessibility.fontSize === value ? '#fff' : themeConfig.colors.text }}>{label}</button>
            ))}
          </div>
        </div>
        {([
          ['highContrast', 'تباين مرتفع', 'ألوان أوضح للنصوص والعناصر'] as const,
          ['reduceMotion', 'تقليل الحركة', 'تقليل الانتقالات والمؤثرات'] as const,
        ]).map(([key, label, description]) => {
          const enabled = settings.accessibility[key];
          return (
            <div key={key} className="rounded-2xl border p-4 flex items-center gap-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="flex-1"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{label}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{description}</p></div>
              <button role="switch" aria-checked={enabled} onClick={() => updateSettings({ accessibility: { ...settings.accessibility, [key]: !enabled } })} className="w-12 h-7 rounded-full relative" style={{ backgroundColor: enabled ? themeConfig.colors.primary : themeConfig.colors.border }}><span className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all" style={{ right: enabled ? '2px' : '22px' }} /></button>
            </div>
          );
        })}
        <PausedFeatureBanner
          title="تحسين قارئ الشاشة المتقدم"
          description={`وضع أوصاف موسّعة لكل عنصر ${PAUSED_LABEL}. حجم الخط والتباين وتقليل الحركة تعمل الآن.`}
          kind="paused"
          colors={themeConfig.colors}
        />
      </div>
    </div>
  );
}

function LegalPage({ onBack, kind }: { onBack: () => void; kind: 'privacy' | 'terms' | 'licenses' }) {
  const { themeConfig } = useApp();
  const content = {
    privacy: {
      title: 'سياسة الخصوصية',
      sections: [
        ['البيانات التي نجمعها', 'بيانات الحساب (الاسم، البريد، الهاتف)، الحجوزات، الموقع الاختياري، صور الملف/المحفظة، وبيانات الاستخدام لتحسين الخدمة.'],
        ['كيفية الاستخدام', 'نشغّل الحجز والتواصل ومنع الاحتيال، ونفعّل مساعد AI عبر مزودين عند تفعيل الميزة، دون بيع بياناتك الشخصية.'],
        ['المدفوعات', 'الإطلاق الناعم نقدي عند الزيارة فقط. لا نخزّن بيانات بطاقة. الدفع الإلكتروني (CCP/بطاقة) غير مفعّل حالياً.'],
        ['السوق الخارجي', 'عند زيارة متجر خارجي (Visit Store) تغادر Hallaqi؛ سياسة ذلك الموقع منفصلة عنّا.'],
        ['حقوقك', 'يمكنك طلب تصدير بياناتك أو حذف حسابك من الإعدادات. للاستفسار: عبر الدعم داخل التطبيق أو واتساب إن وُجد.'],
        ['ملفات الارتباط والتحليلات', 'قد نستخدم أدوات تحليل (مثل Vercel Analytics) لقياس الأداء دون تحديد هوية شخصية قدر الإمكان.'],
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      sections: [
        ['الحسابات والأدوار', 'في الإطلاق الناعم: عميل أو حلاق. أدوار السوق (متجر/شركة/طبيب) لاحقاً بعد موافقة الإدارة.'],
        ['الحجوزات', 'يلتزم العميل بمعلومات صحيحة، ويلتزم الحلاق بتحديث التوفر والخدمات والأسعار. الإلغاء يخضع لسياسة الحلاق الظاهرة عند الحجز.'],
        ['المدفوعات', 'الدفع نقداً عند الزيارة للحلاق. لا يُطلب دفع إلكتروني مسبقاً في هذه المرحلة.'],
        ['السوق', 'الشراء داخل التطبيق للمنتجات غير مفعّل عند الإطلاق؛ الروابط الخارجية على مسؤولية البائع والمشتري.'],
        ['المساعد الذكي', 'محتوى AI استرشادي فقط وليس تشخيصاً طبياً. للمشاكل الجلدية أو تساقط غير مفسَّر راجع مختصاً.'],
        ['السلوك', 'يُمنع الاحتيال والتحرش والمحتوى المضلل، ويحق للإدارة تعليق الحساب عند المخالفة.'],
      ],
    },
    licenses: {
      title: 'التراخيص مفتوحة المصدر',
      sections: [
        ['التقنيات', 'React وVite وSupabase وTailwind CSS وLucide وVercel AI SDK ومكتباتها وفق تراخيصها الأصلية.'],
        ['العلامة', 'اسم وشعار Hallaqi وأصوله البصرية ملك للمنتج ولا تشملها تراخيص مكتبات البرمجيات.'],
      ],
    },
  }[kind];
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>{content.title}</h2>
      </div>
      <div className="p-4 space-y-3">
        {content.sections.map(([title, text]) => (
          <section key={title} className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{title}</h3>
            <p className="text-xs leading-6 mt-2" style={{ color: themeConfig.colors.textMuted }}>{text}</p>
          </section>
        ))}
        <p className="text-[10px] text-center" style={{ color: themeConfig.colors.textMuted }}>آخر تحديث: يوليو 2026</p>
      </div>
    </div>
  );
}

function LoyaltyPage({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyReward, setBusyReward] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!appUser) return;
    setLoading(true);
    try {
      setData(await getLoyaltyDashboard(appUser.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل نقاط الولاء');
    } finally {
      setLoading(false);
    }
  }, [appUser]);

  useEffect(() => { void load(); }, [load]);

  const redeem = async (rewardId: string) => {
    setBusyReward(rewardId);
    setError('');
    try {
      await redeemLoyaltyReward(rewardId);
      await load();
    } catch (err) {
      setError(err instanceof Error && err.message.includes('Insufficient')
        ? 'نقاطك غير كافية لهذه المكافأة'
        : err instanceof Error ? err.message : 'تعذر استبدال المكافأة');
    } finally {
      setBusyReward('');
    }
  };

  const points = data?.account?.points || 0;
  const tier = data?.account?.tier || 'bronze';
  const tierLabel: Record<string, string> = {
    bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني',
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>برنامج الولاء</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})` }}>
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-white/70">رصيدك</p><p className="text-3xl font-black mt-1">{loading ? '—' : points}</p><p className="text-xs text-white/80">نقطة</p></div>
            <div className="text-center"><Gift size={34} className="mx-auto" /><p className="text-xs font-bold mt-1">{tierLabel[tier]}</p></div>
          </div>
          <p className="text-[11px] mt-4 text-white/80">تحصل على نقطة واحدة على الأقل لكل حجز مكتمل، وتزداد النقاط حسب قيمة الخدمة.</p>
        </div>

        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>المكافآت</h3>
          <div className="space-y-2">
            {(data?.rewards || []).map(reward => (
              <div key={reward.id} className="p-3 rounded-2xl border flex items-center gap-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.accent + '15' }}><Gift size={18} style={{ color: themeConfig.colors.accent }} /></div>
                <div className="flex-1"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{reward.title_ar}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{reward.points_cost} نقطة</p></div>
                <button type="button" disabled={points < reward.points_cost || busyReward === reward.id} onClick={() => void redeem(reward.id)} className="px-3 h-8 rounded-lg text-[11px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: themeConfig.colors.primary }}>استبدال</button>
              </div>
            ))}
          </div>
        </div>

        {(data?.redemptions || []).length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-2" style={{ color: themeConfig.colors.text }}>قسائمك</h3>
            {data?.redemptions.map(redemption => (
              <div key={redemption.id} className="p-3 rounded-xl border mb-2" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <p className="font-mono text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{redemption.voucher_code}</p>
                <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>صالح حتى {new Date(redemption.expires_at).toLocaleDateString('ar-DZ')}</p>
              </div>
            ))}
          </div>
        )}
        {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ color: themeConfig.colors.error, backgroundColor: themeConfig.colors.error + '10' }}>{error}</p>}
      </div>
    </div>
  );
}

function InformationPage({ onBack, kind }: { onBack: () => void; kind: 'help' | 'about' }) {
  const { themeConfig } = useApp();
  const isHelp = kind === 'help';
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>{isHelp ? 'مركز المساعدة' : 'عن حلاقي'}</h2>
      </div>
      <div className="p-4 space-y-3">
        {isHelp ? (
          <>
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <h3 className="font-bold text-sm" style={{ color: themeConfig.colors.text }}>الحجوزات</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>اختر الحلاق والخدمة والموعد، ثم تابع من تبويب المواعيد. الدفع نقداً عند الزيارة فقط. {CANCEL_POLICY.summaryAr}</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <h3 className="font-bold text-sm" style={{ color: themeConfig.colors.text }}>الدعم والتواصل</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
                راسلنا على <a href="mailto:support@hallaqi.app" className="font-bold underline" style={{ color: themeConfig.colors.primary }}>support@hallaqi.app</a>.
                {isWhatsAppSupportConfigured() ? (
                  <>{' '}أو عبر <a href={getSupportWhatsAppUrl() || '#'} className="font-bold underline" style={{ color: themeConfig.colors.primary }}>واتساب الدعم</a>.</>
                ) : (
                  <> واتساب الدعم <span className="font-bold" style={{ color: themeConfig.colors.warning }}>{COMING_SOON_LABEL}</span> حتى ضبط الرقم.</>
                )}
                {' '}لا ترسل كلمة المرور أبداً.
              </p>
            </div>
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <h3 className="font-bold text-sm" style={{ color: themeConfig.colors.text }}>السوق</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>اكتشف منتجات ومتاجر ثم اشترِ عبر Visit Store (https). لا يوجد دفع منتجات داخل التطبيق عند الإطلاق.</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border p-5 text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <img src="/logo-icon.png" alt="Hallaqi" className="w-20 h-20 rounded-2xl mx-auto" />
              <h3 className="font-black text-lg mt-3" style={{ color: themeConfig.colors.text }}>Hallaqi — حلاقي</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>منصة جزائرية للحجز والسوق والمنتدى ومساعد AI — تربط العملاء بالحلاقين والمتاجر والشركات والأطباء.</p>
              <p className="text-[11px] mt-4" style={{ color: themeConfig.colors.textMuted }}>الإصدار 12.1.0 · إطلاق ناعم في الجزائر</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <h3 className="font-bold text-sm" style={{ color: themeConfig.colors.text }}>اتصل بنا</h3>
              <p className="text-xs mt-2 leading-6" style={{ color: themeConfig.colors.textMuted }}>
                البريد: support@hallaqi.app<br />
                الموقع: https://hallaqi.app<br />
                الجزائر
              </p>
            </div>
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <h3 className="font-bold text-sm" style={{ color: themeConfig.colors.text }}>إشعار قانوني (Mentions)</h3>
              <p className="text-xs mt-2 leading-6" style={{ color: themeConfig.colors.textMuted }}>
                خدمة رقمية لإدارة الحجوزات والاكتشاف. الدفع النقدي عند الزيارة هو الافتراضي في الإطلاق الناعم.
                سياسة الخصوصية وشروط الاستخدام متاحة من الملف الشخصي. للاستفسارات القانونية: support@hallaqi.app.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ThemeSelector({ onBack }: { onBack: () => void }) {
  const { themeConfig, currentTheme, setTheme } = useApp();
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>السمة</h2>
      </div>
      <div className="px-4 mt-4 space-y-2">
        {(Object.entries(themes) as [ThemeName, typeof themes[ThemeName]][]).map(([key, theme]) => (
          <button key={key} onClick={() => setTheme(key)} className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all" style={{ backgroundColor: currentTheme === key ? theme.colors.primary + '08' : themeConfig.colors.surface, borderColor: currentTheme === key ? theme.colors.primary : themeConfig.colors.border }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.primary + '15' }}><Palette size={20} style={{ color: theme.colors.primary }} /></div>
            <div className="flex-1 text-right"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{theme.label}</p><p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{theme.animation === 'smooth' ? 'حركات سلسة' : theme.animation === 'modern' ? 'حركات عصرية' : theme.animation === 'digital' ? 'تأثيرات رقمية' : theme.animation === 'bouncy' ? 'حركات مرنة' : 'بدون حركات'}</p></div>
            <div className="flex gap-1"><div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: theme.colors.primary, borderColor: theme.colors.border }} /><div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: theme.colors.accent, borderColor: theme.colors.border }} /><div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }} /></div>
            {currentTheme === key && <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.primary }}><Check size={14} className="text-white" /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnimationSelector({ onBack }: { onBack: () => void }) {
  const { themeConfig, animationStyle, setAnimationStyle } = useApp();
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>نمط الحركة</h2>
      </div>
      <div className="px-4 mt-4 space-y-2">
        {(Object.entries(animationStyles) as [AnimationStyle, typeof animationStyles[AnimationStyle]][]).map(([key, style]) => (
          <button key={key} onClick={() => setAnimationStyle(key)} className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all" style={{ backgroundColor: animationStyle === key ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, borderColor: animationStyle === key ? themeConfig.colors.primary : themeConfig.colors.border }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary + '15' }}><Sparkles size={20} style={{ color: themeConfig.colors.primary }} /></div>
            <div className="flex-1 text-right"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{style.label}</p><p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{style.description}</p></div>
            {animationStyle === key && <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary }}><Check size={14} className="text-white" /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function LanguageSelector({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  const languages = [
    { key: 'ar' as const, label: 'العربية', flag: '🇩🇿' },
    { key: 'fr' as const, label: 'Français', flag: '🇫🇷' },
    { key: 'en' as const, label: 'English', flag: '🇬🇧' },
  ];
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button type="button" onClick={onBack} aria-label={translate(settings.language, 'back')} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>{translate(settings.language, 'language')}</h2>
      </div>
      <div className="px-4 mt-4 space-y-2">
        {languages.map(lang => (
          <button
            key={lang.key}
            type="button"
            onClick={() => updateSettings({ language: lang.key })}
            className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all"
            style={{
              backgroundColor: settings.language === lang.key ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
              borderColor: settings.language === lang.key ? themeConfig.colors.primary : themeConfig.colors.border,
            }}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1 text-start"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{lang.label}</p></div>
            {settings.language === lang.key && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary }}>
                <Check size={14} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CountrySelector({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  const [query, setQuery] = useState('');
  const language = settings.language;
  const filtered = WORLD_COUNTRIES.filter(country => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      country.code.toLowerCase().includes(q)
      || country.nameAr.includes(query.trim())
      || country.nameFr.toLowerCase().includes(q)
      || country.nameEn.toLowerCase().includes(q)
    );
  });

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 px-4 pt-3 pb-3 backdrop-blur-lg border-b space-y-2" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={translate(language, 'back')} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
          <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>{translate(language, 'selectCountry')}</h2>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={translate(language, 'searchCountry')}
          className="w-full h-11 rounded-xl border px-3 text-sm outline-none"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
        />
      </div>
      <div className="px-4 mt-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
        {filtered.map(country => {
          const selected = settings.countryCode === country.code;
          return (
            <button
              key={country.code}
              type="button"
              onClick={() => updateSettings({ countryCode: country.code })}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border text-start"
              style={{
                backgroundColor: selected ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                borderColor: selected ? themeConfig.colors.primary : themeConfig.colors.border,
              }}
            >
              <span className="text-[10px] font-bold w-8" style={{ color: themeConfig.colors.textMuted }}>{country.code}</span>
              <p className="flex-1 text-sm font-bold" style={{ color: themeConfig.colors.text }}>{countryLabel(country, language)}</p>
              {selected && <Check size={16} style={{ color: themeConfig.colors.primary }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CurrencySelector({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  const language = settings.language;
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button type="button" onClick={onBack} aria-label={translate(language, 'back')} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>{translate(language, 'selectCurrency')}</h2>
      </div>
      <p className="px-4 mt-3 text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>
        {translate(language, 'displayCurrencyNote')}
      </p>
      <div className="px-4 mt-3 space-y-2">
        {DISPLAY_CURRENCIES.map(currency => {
          const selected = settings.currencyCode === currency.code;
          return (
            <button
              key={currency.code}
              type="button"
              onClick={() => updateSettings({ currencyCode: currency.code })}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border text-start"
              style={{
                backgroundColor: selected ? themeConfig.colors.primary + '08' : themeConfig.colors.surface,
                borderColor: selected ? themeConfig.colors.primary : themeConfig.colors.border,
              }}
            >
              <span className="text-xs font-black w-12" style={{ color: themeConfig.colors.primary }}>{currency.code}</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{currencyLabel(currency, language)}</p>
                <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{currencySymbol(currency, language)}</p>
              </div>
              {selected && <Check size={16} style={{ color: themeConfig.colors.primary }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NotificationsSettings({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  const { appUser } = useAuth();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const pushReady = isWebPushSupported() && isWebPushConfigured();

  useEffect(() => {
    if (!isWebPushSupported()) {
      setPushMessage('الإشعارات الفورية غير مدعومة على هذا الجهاز');
      return;
    }
    if (!isWebPushConfigured()) {
      setPushMessage(`Web Push ${PAUSED_LABEL} — لم يُضبط مفتاح VAPID بعد`);
      return;
    }
    void getPushSubscription().then(subscription => setPushSubscribed(!!subscription));
  }, []);

  const toggleNotification = async (key: keyof typeof settings.notifications, enabled: boolean) => {
    setPushMessage('');
    if (key !== 'pushEnabled') {
      updateSettings({ notifications: { ...settings.notifications, [key]: !enabled } });
      return;
    }
    if (!appUser) return;
    if (!pushReady) {
      setPushMessage(`تفعيل الإشعارات الفورية ${PAUSED_LABEL} حتى ضبط VAPID`);
      return;
    }
    setPushBusy(true);
    try {
      if (enabled) {
        await disableWebPush();
        setPushSubscribed(false);
        updateSettings({ notifications: { ...settings.notifications, pushEnabled: false } });
      } else {
        await enableWebPush(appUser.id);
        setPushSubscribed(true);
        updateSettings({ notifications: { ...settings.notifications, pushEnabled: true } });
      }
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'تعذر تحديث الإشعارات');
    } finally {
      setPushBusy(false);
    }
  };
  const items = [
    { key: 'emailEnabled', label: 'إشعارات البريد', icon: Mail },
    { key: 'bookingReminders', label: 'تذكير المواعيد', icon: Calendar },
    { key: 'forumReplies', label: 'ردود المنتدى', icon: MessageSquare },
    ...(pushReady ? [{ key: 'pushEnabled' as const, label: 'الإشعارات الفورية', icon: Bell }] : []),
  ];
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الإشعارات</h2>
      </div>
      <div className="px-4 mt-4 space-y-3">
        {!pushReady && (
          <PausedFeatureBanner
            title="الإشعارات الفورية (Web Push)"
            description="متوقفة حتى ضبط VAPID على الخادم. إشعارات داخل التطبيق تبقى تعمل."
            kind="paused"
            colors={themeConfig.colors}
          />
        )}
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        {items.map((item, index) => { const Icon = item.icon; const isEnabled = item.key === 'pushEnabled' ? pushSubscribed : settings.notifications[item.key as keyof typeof settings.notifications]; return (
          <div key={item.key} className={`flex items-center gap-3 px-4 py-3.5 ${index < items.length - 1 ? 'border-b' : ''}`} style={{ borderColor: themeConfig.colors.border + '60' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary + '08' }}><Icon size={16} style={{ color: themeConfig.colors.primary }} /></div>
            <div className="flex-1"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{item.label}</p>
              {item.key === 'pushEnabled' && !pushReady && <p className="text-[9px] font-bold" style={{ color: themeConfig.colors.warning }}>{PAUSED_LABEL}</p>}
            </div>
            <button role="switch" aria-checked={isEnabled} disabled={(pushBusy && item.key === 'pushEnabled') || (item.key === 'pushEnabled' && !pushReady)} onClick={() => void toggleNotification(item.key as keyof typeof settings.notifications, isEnabled)} className="w-12 h-7 rounded-full transition-all relative flex-shrink-0 disabled:opacity-50" style={{ backgroundColor: isEnabled ? themeConfig.colors.primary : themeConfig.colors.border }}>
              <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all" style={{ right: isEnabled ? '2px' : 'auto', left: isEnabled ? 'auto' : '2px' }} />
            </button>
          </div>
        ); })}</div>
        {pushMessage && <p role="status" className="text-[11px] p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.text }}>{pushMessage}</p>}
      </div>
    </div>
  );
}

function PrivacySettings({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  const { appUser } = useAuth();
  const [contacts, setContacts] = useState<Awaited<ReturnType<typeof getUserConversations>>>([]);
  const [blocked, setBlocked] = useState<Awaited<ReturnType<typeof getBlockedUsers>>>([]);
  const [privacyError, setPrivacyError] = useState('');

  const loadPrivacy = useCallback(async () => {
    if (!appUser) return;
    try {
      const [conversationRows, blockedRows] = await Promise.all([
        getUserConversations(),
        getBlockedUsers(appUser.id),
      ]);
      setContacts(conversationRows);
      setBlocked(blockedRows);
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : 'تعذر تحميل قائمة الحظر');
    }
  }, [appUser]);

  useEffect(() => { void loadPrivacy(); }, [loadPrivacy]);

  const setBlockedState = async (userId: string, shouldBlock: boolean) => {
    if (!appUser) return;
    setPrivacyError('');
    try {
      if (shouldBlock) await blockUser(appUser.id, userId);
      else await unblockUser(appUser.id, userId);
      await loadPrivacy();
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : 'تعذر تحديث قائمة الحظر');
    }
  };

  const blockedIds = new Set(blocked.map(item => item.blocked_id));
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الخصوصية</h2>
      </div>
      <div className="px-4 mt-4 space-y-4">
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          {[{ key: 'profileVisible', label: 'إظهار البروفايل', icon: Eye }, { key: 'showLocation', label: 'إظهار الموقع', icon: MapPin }, { key: 'showBookings', label: 'إظهار الحجوزات', icon: Calendar }].map((item, index, arr) => { const Icon = item.icon; const isEnabled = settings.privacy[item.key as keyof typeof settings.privacy]; return (
            <div key={item.key} className={`flex items-center gap-3 px-4 py-3.5 ${index < arr.length - 1 ? 'border-b' : ''}`} style={{ borderColor: themeConfig.colors.border + '60' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary + '08' }}><Icon size={16} style={{ color: themeConfig.colors.primary }} /></div>
              <div className="flex-1"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{item.label}</p></div>
              <button onClick={() => updateSettings({ privacy: { ...settings.privacy, [item.key]: !isEnabled } })} className="w-12 h-7 rounded-full transition-all relative flex-shrink-0" style={{ backgroundColor: isEnabled ? themeConfig.colors.primary : themeConfig.colors.border }}>
                <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all" style={{ right: isEnabled ? '2px' : 'auto', left: isEnabled ? 'auto' : '2px' }} />
              </button>
            </div>
          ); })}</div>
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary + '08' }}><MessageSquare size={16} style={{ color: themeConfig.colors.primary }} /></div><div className="flex-1"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>من يمكنه مراسلتك</p></div></div>
            <div className="flex gap-2 mt-2">
              {(['all', 'followed', 'none'] as const).map(option => (
                <button key={option} onClick={() => updateSettings({ privacy: { ...settings.privacy, allowMessages: option } })} className="flex-1 py-2 rounded-xl text-xs font-bold transition-all" style={{ backgroundColor: settings.privacy.allowMessages === option ? themeConfig.colors.primary : themeConfig.colors.background, color: settings.privacy.allowMessages === option ? '#fff' : themeConfig.colors.textMuted }}>{option === 'all' ? 'الجميع' : option === 'followed' ? 'المتابَعون' : 'لا أحد'}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <h3 className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>قائمة الحظر</h3>
          <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>يمكنك حظر مستخدم سبق أن تواصلت معه. يمنع الحظر إنشاء محادثات جديدة.</p>
          {blocked.length > 0 && <div className="space-y-2 mt-3">{blocked.map(item => (
            <div key={item.blocked_id} className="flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: themeConfig.colors.background }}>
              {item.profiles?.avatar_url ? <img src={item.profiles.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <UserIcon size={18} style={{ color: themeConfig.colors.textMuted }} />}
              <span className="text-xs flex-1" style={{ color: themeConfig.colors.text }}>{item.profiles?.full_name || 'مستخدم'}</span>
              <button onClick={() => void setBlockedState(item.blocked_id, false)} className="px-2 h-7 rounded-lg text-[10px] font-bold" style={{ backgroundColor: themeConfig.colors.success + '12', color: themeConfig.colors.success }}>إلغاء الحظر</button>
            </div>
          ))}</div>}
          {contacts.some(contact => !blockedIds.has(contact.participant_id)) && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
              <p className="text-[10px] mb-2" style={{ color: themeConfig.colors.textMuted }}>جهات اتصال حديثة</p>
              {contacts.filter(contact => !blockedIds.has(contact.participant_id)).map(contact => (
                <div key={contact.participant_id} className="flex items-center gap-2 py-2">
                  {contact.participant_avatar ? <img src={contact.participant_avatar} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <UserIcon size={18} style={{ color: themeConfig.colors.textMuted }} />}
                  <span className="text-xs flex-1" style={{ color: themeConfig.colors.text }}>{contact.participant_name}</span>
                  <button onClick={() => void setBlockedState(contact.participant_id, true)} className="px-2 h-7 rounded-lg text-[10px] font-bold" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>حظر</button>
                </div>
              ))}
            </div>
          )}
          {blocked.length === 0 && contacts.length === 0 && <p className="text-[10px] text-center py-4" style={{ color: themeConfig.colors.textMuted }}>لا توجد حسابات محظورة أو محادثات سابقة</p>}
          {privacyError && <p role="alert" className="text-[10px] mt-2" style={{ color: themeConfig.colors.error }}>{privacyError}</p>}
        </div>
      </div>
    </div>
  );
}

function SubscriptionPage({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [requestStatus, setRequestStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([
      getSubscriptionPlans(),
      appUser ? getLatestSubscriptionRequest(appUser.id) : Promise.resolve(null),
    ]).then(([loadedPlans, latestRequest]) => {
      setPlans(loadedPlans);
      if (latestRequest) {
        setSelectedPlan(latestRequest.plan_id);
        setRequestStatus(latestRequest.status);
      }
    }).catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل الخطط'));
  }, [appUser]);

  const requestPlan = async () => {
    if (!appUser) return;
    setIsSubmitting(true);
    setError('');
    try {
      const request = await createSubscriptionRequest(appUser.id, selectedPlan);
      setRequestStatus(request.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>خطط الاشتراك</h2>
        {!FEATURE_FLAGS.paidSubscriptionsEnabled && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">متوقف</span>
        )}
      </div>
      <div className="px-4 mt-4 space-y-3">
        {!FEATURE_FLAGS.paidSubscriptionsEnabled && (
          <div className="p-3 rounded-xl text-xs leading-5" style={{ backgroundColor: themeConfig.colors.warning + '12', color: themeConfig.colors.warning }}>
            ترقية الاشتراكات المدفوعة <strong>متوقفة</strong> عند الإطلاق. الخطة المجانية متاحة؛ الطلبات المدفوعة ستُفعَّل لاحقاً.
          </div>
        )}
        {requestStatus && (
          <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: themeConfig.colors.info + '12', color: themeConfig.colors.info }}>
            حالة طلب الاشتراك: {requestStatus === 'pending' ? 'قيد المراجعة' : requestStatus}
          </div>
        )}
        {plans.map(plan => {
          const features = Array.isArray(plan.features) ? plan.features.filter((item): item is string => typeof item === 'string') : [];
          const paidPaused = plan.price_dzd > 0 && !FEATURE_FLAGS.paidSubscriptionsEnabled;
          return (
          <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} className="rounded-2xl border-2 overflow-hidden transition-all cursor-pointer" style={{ backgroundColor: selectedPlan === plan.id ? themeConfig.colors.primary + '05' : themeConfig.colors.surface, borderColor: selectedPlan === plan.id ? themeConfig.colors.primary : themeConfig.colors.border }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: plan.id === 'free' ? '#22C55E15' : plan.id === 'basic' ? '#3B82F615' : plan.id === 'pro' || plan.id === 'professional' ? '#8B5CF615' : '#EAB30815' }}><Crown size={20} style={{ color: plan.id === 'free' ? '#22C55E' : plan.id === 'basic' ? '#3B82F6' : plan.id === 'pro' || plan.id === 'professional' ? '#8B5CF6' : '#EAB308' }} /></div><div><h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{plan.name_ar}</h3><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{plan.billing_period === 'monthly' ? 'شهرياً' : plan.billing_period}</p></div></div>
                <div className="text-right"><p className="text-lg font-bold" style={{ color: themeConfig.colors.primary }}>{plan.price_dzd === 0 ? 'مجاني' : `${plan.price_dzd} دج`}</p>{paidPaused && <p className="text-[10px] font-bold text-amber-600">متوقف</p>}</div>
              </div>
              <div className="space-y-1.5">{features.map((feature, i) => (<div key={i} className="flex items-center gap-2"><Check size={14} className="text-green-500 flex-shrink-0" /><span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{feature}</span></div>))}</div>
              {paidPaused && (
                <div className="mt-3 p-3 rounded-xl text-[11px]" style={{ backgroundColor: themeConfig.colors.warning + '12', color: themeConfig.colors.warning }}>
                  تفعيل الخطط المدفوعة متوقف مؤقتاً عند الإطلاق الناعم.
                </div>
              )}
              <button
                type="button"
                disabled={selectedPlan !== plan.id || isSubmitting || requestStatus === 'pending' || paidPaused}
                onClick={event => { event.stopPropagation(); void requestPlan(); }}
                className="w-full h-10 rounded-xl text-sm font-bold text-white mt-3 transition-all disabled:opacity-50"
                style={{ backgroundColor: selectedPlan === plan.id ? themeConfig.colors.primary : themeConfig.colors.border }}
              >
                {paidPaused ? 'متوقف' : requestStatus === 'pending' ? 'الطلب قيد المراجعة' : plan.price_dzd > 0 ? 'طلب التفعيل' : 'اختيار الخطة المجانية'}
              </button>
            </div>
          </div>
        ); })}
        {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>{error}</p>}
      </div>
    </div>
  );
}

function PaymentMethods({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الدفع</h2>
      </div>
      <div className="px-4 mt-4 space-y-3">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#22C55E15' }}>
              <CreditCard size={24} style={{ color: '#22C55E' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>نقداً عند الزيارة</h3>
              <p className="text-xs mt-1 leading-5" style={{ color: themeConfig.colors.textMuted }}>
                ادفع للحلاق مباشرة عند الموعد. لا حجز مدفوع مسبقاً في الإطلاق الناعم.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-bold">متاح</span>
          </div>
        </div>
        <p className="text-[11px] leading-5 px-1" style={{ color: themeConfig.colors.textMuted }}>
          البطاقة وCCP وبريدي موب غير مفعّلة بعد. الاشتراكات المدفوعة مخفية حتى الإطلاق الكامل.
        </p>
      </div>
    </div>
  );
}

function IDVerification({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [status, setStatus] = useState<string>(appUser?.verification_status || 'unverified');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appUser) return;
    void getLatestIdVerificationRequest(appUser.id)
      .then(request => {
        if (request?.status === 'approved') setStatus('verified');
        else if (request?.status) setStatus(request.status);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل حالة التوثيق'));
  }, [appUser]);

  const submitDocument = async (file?: File) => {
    if (!file || !appUser) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('ارفع صورة أو ملف PDF صالحاً');
      return;
    }
    const { assertFileWithinLimit, compressImageFile, UPLOAD_LIMITS } = await import('@/lib/imageUpload');
    const limitError = assertFileWithinLimit(file, UPLOAD_LIMITS.idCardMaxBytes);
    if (limitError) {
      setError(limitError);
      return;
    }
    setIsUploading(true);
    setError('');
    try {
      const prepared = file.type.startsWith('image/')
        ? await compressImageFile(file, { maxBytes: UPLOAD_LIMITS.idCardMaxBytes })
        : file;
      const path = await uploadIdCard(appUser.id, prepared);
      if (!path) throw new Error('فشل رفع ملف الهوية');
      await createIdVerificationRequest(appUser.id, path);
      setStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال طلب التوثيق');
    } finally {
      setIsUploading(false);
    }
  };

  const isIdVerified = status === 'verified' || status === 'premium';

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>توثيق الهوية</h2>
      </div>
      <div className="px-4 mt-4">
        {isIdVerified ? (
          <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: '#DCFCE7', borderColor: '#22C55E' }}>
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3"><BadgeCheck size={32} className="text-white" /></div>
            <h3 className="text-base font-bold text-green-800">تم توثيق هويتك</h3><p className="text-xs text-green-600 mt-1">حسابك موثق بالبطاقة التعريفية الوطنية</p>
          </div>
        ) : (
          <div className="space-y-4">
            {status === 'pending' && (
              <div className="rounded-2xl border p-4 text-center" style={{ backgroundColor: themeConfig.colors.warning + '10', borderColor: themeConfig.colors.warning }}>
                <Clock size={28} className="mx-auto" style={{ color: themeConfig.colors.warning }} />
                <h3 className="text-sm font-bold mt-2" style={{ color: themeConfig.colors.text }}>طلبك قيد المراجعة</h3>
                <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>سنحدّث حالة حسابك بعد مراجعة الوثيقة.</p>
              </div>
            )}
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="flex items-center gap-3 mb-3"><Shield size={24} style={{ color: themeConfig.colors.primary }} /><div><h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>لماذا التوثيق؟</h3></div></div>
              <div className="space-y-2">{['الوصول لقسم التعليقات الموجه للموثقين', 'المشاركة في المسابقات', 'ربط الحساب بالخدمات المالية', 'زيادة مصداقيتك في المنتدى', 'الحصول على شارة التوثيق'].map((item, i) => (<div key={i} className="flex items-center gap-2"><Check size={14} style={{ color: themeConfig.colors.primary }} /><span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{item}</span></div>))}</div>
            </div>
            {status !== 'pending' && <div className="rounded-2xl border p-4 text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed mx-auto mb-3 flex flex-col items-center justify-center" style={{ borderColor: themeConfig.colors.border }}><Shield size={24} style={{ color: themeConfig.colors.textMuted }} /><span className="text-[9px] mt-1" style={{ color: themeConfig.colors.textMuted }}>امسح البطاقة</span></div>
              <label htmlFor="id-card-upload" className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center cursor-pointer" style={{ backgroundColor: themeConfig.colors.primary }}>
                {isUploading ? 'جاري الرفع...' : 'رفع صورة البطاقة التعريفية'}
                <input id="id-card-upload" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={isUploading} className="hidden" onChange={event => void submitDocument(event.target.files?.[0])} />
              </label>
              <p className="text-[10px] mt-2" style={{ color: themeConfig.colors.textMuted }}>البيانات مشفرة وآمنة. لن يتم مشاركتها مع أحد.</p>
            </div>}
            {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedAccounts({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const { user, googleSignIn } = useAuth();
  const [error, setError] = useState('');
  const providers = [{ key: 'google', name: 'Google', color: '#EF4444' }, { key: 'facebook', name: 'Facebook', color: '#3B82F6' }, { key: 'apple', name: 'Apple', color: '#1F1F1F' }, { key: 'instagram', name: 'Instagram', color: '#EC4899' }];
  const googleIdentity = user?.identities?.find(identity => identity.provider === 'google');

  const handleGoogle = async () => {
    setError('');
    try {
      if (googleIdentity) {
        if ((user?.identities?.length || 0) <= 1) {
          setError('لا يمكن فصل طريقة تسجيل الدخول الوحيدة للحساب');
          return;
        }
        const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
        if (unlinkError) throw unlinkError;
      } else {
        await googleSignIn();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث الحساب المرتبط');
    }
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الحسابات المرتبطة</h2>
      </div>
      <div className="px-4 mt-4 space-y-2">
        {providers.map(provider => { const connected = provider.key === 'google' && !!googleIdentity; return (
          <div key={provider.key} className="flex items-center gap-3 p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: provider.color + '15' }}><LinkIcon size={20} style={{ color: provider.color }} /></div>
            <div className="flex-1"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{provider.name}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{connected ? user?.email || 'متصل' : provider.key === 'google' ? 'غير متصل' : 'قريباً'}</p></div>
            <button disabled={provider.key !== 'google'} onClick={() => provider.key === 'google' && void handleGoogle()} className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-45" style={{ backgroundColor: connected ? themeConfig.colors.error + '10' : themeConfig.colors.primary, color: connected ? themeConfig.colors.error : '#fff' }}>{provider.key !== 'google' ? 'قريباً' : connected ? 'فصل' : 'ربط'}</button>
          </div>
        ); })}
        {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>{error}</p>}
      </div>
    </div>
  );
}

function BadgesPage({ onBack }: { onBack: () => void }) {
  const { themeConfig, currentUser } = useApp();
  const { appUser } = useAuth();
  const badges = (appUser as unknown as { badges?: UserBadge[] })?.badges || (currentUser as unknown as { badges?: UserBadge[] })?.badges || [];
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الشارات</h2>
      </div>
      <div className="px-4 mt-4"><div className="grid grid-cols-2 gap-2">
        {badges.map((badge: UserBadge) => (
          <div key={badge.id} className="p-3 rounded-2xl border text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: badge.color + '30' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: badge.color + '15' }}><Award size={24} style={{ color: badge.color }} /></div>
            <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{badge.name}</p><p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{badge.description}</p>
          </div>
        ))}
        {[{ name: 'متفاعل', desc: 'شارك في 10 نقاشات', color: '#F59E0B' }, { name: 'خبير', desc: 'أجب على 50 سؤال', color: '#8B5CF6' }, { name: 'مشهور', desc: 'احصل على 100 متابع', color: '#EC4899' }, { name: 'ملك الحلاقة', desc: 'احجز 50 موعد', color: '#EAB308' }].map((badge, i) => (
          <div key={i} className="p-3 rounded-2xl border text-center opacity-50" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: themeConfig.colors.textMuted + '15' }}><Lock size={24} style={{ color: themeConfig.colors.textMuted }} /></div>
            <p className="text-xs font-bold" style={{ color: themeConfig.colors.textMuted }}>{badge.name}</p><p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{badge.desc}</p>
          </div>
        ))}</div></div>
    </div>
  );
}

function StatsPage({ onBack }: { onBack: () => void }) {
  const { themeConfig, bookings, barbers } = useApp();
  const { appUser } = useAuth();
  const [loyalty, setLoyalty] = useState({ points: 0, lifetimePoints: 0, tier: 'bronze' });
  useEffect(() => {
    if (!appUser) return;
    void getLoyaltyDashboard(appUser.id).then(data => setLoyalty({
      points: data.account?.points || 0,
      lifetimePoints: data.account?.lifetime_points || 0,
      tier: data.account?.tier || 'bronze',
    })).catch(() => {});
  }, [appUser]);
  const completed = bookings.filter(booking => booking.status === 'completed');
  const totalSpent = completed.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const counts = new Map<string, number>();
  completed.forEach(booking => counts.set(booking.barberId, (counts.get(booking.barberId) || 0) + 1));
  const favoriteId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const favorite = barbers.find(barber => barber.id === favoriteId);
  const tierLabels: Record<string, string> = { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' };
  const nextThreshold: Record<string, number> = { bronze: 200, silver: 500, gold: 1000, platinum: 1000 };
  const threshold = nextThreshold[loyalty.tier] || 1000;
  const progress = loyalty.tier === 'platinum' ? 100 : Math.min(100, Math.round(loyalty.lifetimePoints / threshold * 100));
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الإحصائيات</h2>
      </div>
      <div className="px-4 mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[{ label: 'إجمالي الحجوزات', value: bookings.length.toString(), icon: Calendar, color: '#3B82F6' }, { label: 'إجمالي الإنفاق', value: `${totalSpent} دج`, icon: CreditCard, color: '#22C55E' }, { label: 'حجوزات مكتملة', value: completed.length.toString(), icon: Zap, color: '#F59E0B' }, { label: 'النقاط', value: loyalty.points.toString(), icon: Star, color: '#8B5CF6' }].map((stat, i) => (
            <div key={i} className="p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: stat.color + '15' }}><stat.icon size={16} style={{ color: stat.color }} /></div>
              <p className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>{stat.value}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{stat.label}</p>
            </div>
          ))}</div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#C0C0C015' }}><Award size={28} style={{ color: '#C0C0C0' }} /></div>
            <div className="flex-1"><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>مرتبتك الحالية</p><p className="text-xl font-bold" style={{ color: themeConfig.colors.text }}>{tierLabels[loyalty.tier] || 'برونزي'}</p></div>
            <div className="text-right"><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{loyalty.tier === 'platinum' ? 'أعلى مستوى' : 'التقدم للتصنيف التالي'}</p><div className="w-24 h-2 rounded-full bg-gray-200 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: themeConfig.colors.primary }} /></div><p className="text-[9px] mt-0.5" style={{ color: themeConfig.colors.primary }}>{loyalty.lifetimePoints} / {threshold}</p></div>
          </div>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.textMuted }}>المختص المفضل</p>
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '15' }}>{favorite?.avatar ? <img src={favorite.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <Scissors size={18} style={{ color: themeConfig.colors.primary }} />}</div><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{favorite?.name || 'لم يتحدد بعد'}</p></div>
        </div>
      </div>
    </div>
  );
}