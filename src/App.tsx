import { lazy, Suspense, useEffect } from 'react';
import { AppProvider } from '@/contexts/AppContext';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { isDeveloperMode } from '@/supabase/client';

import ErrorBoundary from '@/components/ErrorBoundary';
import BottomNav from '@/components/BottomNav';
import BrandLogo from '@/components/BrandLogo';
import InstallPrompt from '@/components/InstallPrompt';
import { reportClientError } from '@/lib/error-reporting';
import BookingTab from '@/tabs/BookingTab';
import './App.css';

const AppointmentsTab = lazy(() => import('@/tabs/AppointmentsTab'));
const CameraTab = lazy(() => import('@/tabs/CameraTab'));
const ForumTab = lazy(() => import('@/tabs/ForumTab'));
const ProfileTab = lazy(() => import('@/tabs/ProfileTab'));
const BarberDetailPage = lazy(() => import('@/pages/BarberDetailPage'));
const BookingFlowPage = lazy(() => import('@/pages/BookingFlowPage'));
const ChatRoomPage = lazy(() => import('@/pages/ChatRoomPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));
const CreateForumPostPage = lazy(() => import('@/pages/CreateForumPostPage'));
const ComingSoonPage = lazy(() => import('@/components/ComingSoon'));
const LoginScreen = lazy(() => import('@/pages/LoginScreen'));
const RegisterScreen = lazy(() => import('@/pages/RegisterScreen'));
const ForgotPassword = lazy(() => import('@/components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/components/auth/ResetPassword'));
const MFAChallengePage = lazy(() => import('@/pages/MFAChallengePage'));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccessPage"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AIAdvisorPage = lazy(() => import("@/pages/AIAdvisorPage"));
const MarketplacePage = lazy(() => import("@/pages/MarketplacePage"));
const StoreDetailPage = lazy(() => import("@/pages/StoreDetailPage"));
const StoreWebViewPage = lazy(() => import("@/pages/StoreWebViewPage"));
const BusinessAnalyticsPage = lazy(() => import("@/pages/BusinessAnalyticsPage"));
const SellerAIToolsPage = lazy(() => import("@/pages/SellerAIToolsPage"));
const CompanyDetailPage = lazy(() => import("@/pages/CompanyDetailPage"));
const SellerCatalogPage = lazy(() => import("@/pages/SellerCatalogPage"));
const BarberExtrasPage = lazy(() => import("@/pages/BarberExtrasPage"));
const DoctorProfilePage = lazy(() => import("@/pages/DoctorProfilePage"));
const BusinessProfileEditPage = lazy(() => import("@/pages/BusinessProfileEditPage"));

function TabContent({ tab }: { tab: string }) {
  let content;
  switch (tab) {
    case 'booking': content = <BookingTab />; break;
    case 'appointments': content = <AppointmentsTab />; break;
    case 'camera': content = <CameraTab />; break;
    case 'forum': content = <ForumTab />; break;
    case 'profile': content = <ProfileTab />; break;
    default: content = <BookingTab />;
  }
  return <Suspense fallback={<LoadingFallback />}>{content}</Suspense>;
}

function ScreenRouter() {
  const { screen, screenParams, activeTab } = useApp();
  const { isAuthenticated, appUser } = useAuth();

  const authRequiredScreens = ['booking-flow', 'chat-room', 'messages', 'create-post', 'admin-dashboard'];
  const needsAuth = authRequiredScreens.includes(screen) && !isAuthenticated;

  if (needsAuth) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginScreen redirectScreen={screen} redirectParams={screenParams} />
      </Suspense>
    );
  }

  switch (screen) {
    case 'barber-detail':
      return <Suspense fallback={<LoadingFallback />}><BarberDetailPage /></Suspense>;
    case 'booking-flow':
      return <Suspense fallback={<LoadingFallback />}><BookingFlowPage /></Suspense>;
    case 'chat-room':
      return <Suspense fallback={<LoadingFallback />}><ChatRoomPage /></Suspense>;
    case 'messages':
      return <Suspense fallback={<LoadingFallback />}><MessagesPage /></Suspense>;
    case 'notifications':
      return <Suspense fallback={<LoadingFallback />}><NotificationsPage /></Suspense>;
    case 'post-detail':
      return <Suspense fallback={<LoadingFallback />}><PostDetailPage /></Suspense>;
    case 'create-post':
      return <Suspense fallback={<LoadingFallback />}><CreateForumPostPage /></Suspense>;
    case 'login':
      return <Suspense fallback={<LoadingFallback />}><LoginScreen redirectScreen={screenParams?.redirectScreen} redirectParams={screenParams} /></Suspense>;
    case 'register':
      return <Suspense fallback={<LoadingFallback />}><RegisterScreen /></Suspense>;
    case 'forgot-password':
      return <Suspense fallback={<LoadingFallback />}><ForgotPassword /></Suspense>;
    case 'reset-password':
      return <Suspense fallback={<LoadingFallback />}><ResetPassword /></Suspense>;
    case 'mfa-challenge':
      return <Suspense fallback={<LoadingFallback />}><MFAChallengePage /></Suspense>;
    case 'payment-success':
      return <Suspense fallback={<LoadingFallback />}><PaymentSuccessPage /></Suspense>;
    case 'admin-dashboard':
      return appUser?.user_role === 'admin'
        ? <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense>
        : <Suspense fallback={<LoadingFallback />}><ComingSoonPage title="غير مصرح" description="هذه الصفحة مخصصة لإدارة Hallaqi." /></Suspense>;
    case 'ai-advisor':
      return <Suspense fallback={<LoadingFallback />}><AIAdvisorPage /></Suspense>;
    case 'marketplace':
      return (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}><MarketplacePage /></Suspense>
        </ErrorBoundary>
      );
    case 'store-detail':
      return <Suspense fallback={<LoadingFallback />}><StoreDetailPage /></Suspense>;
    case 'company-detail':
      return <Suspense fallback={<LoadingFallback />}><CompanyDetailPage /></Suspense>;
    case 'store-webview':
      return <Suspense fallback={<LoadingFallback />}><StoreWebViewPage /></Suspense>;
    case 'business-analytics':
      return <Suspense fallback={<LoadingFallback />}><BusinessAnalyticsPage /></Suspense>;
    case 'seller-ai-tools':
      return <Suspense fallback={<LoadingFallback />}><SellerAIToolsPage /></Suspense>;
    case 'seller-catalog':
      return <Suspense fallback={<LoadingFallback />}><SellerCatalogPage /></Suspense>;
    case 'barber-extras':
      return <Suspense fallback={<LoadingFallback />}><BarberExtrasPage /></Suspense>;
    case 'doctor-profile':
      return <Suspense fallback={<LoadingFallback />}><DoctorProfilePage /></Suspense>;
    case 'business-profile-edit':
      return <Suspense fallback={<LoadingFallback />}><BusinessProfileEditPage /></Suspense>;
    default: {
      const params = screenParams;
      if (params?.title) {
        return <Suspense fallback={<LoadingFallback />}><ComingSoonPage title={params.title} description={params.description} eta={params.eta} /></Suspense>;
      }
      return <TabContent tab={activeTab} />;
    }
  }
}

function LoadingFallback() {
  const { themeConfig } = useApp();
  return (
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: themeConfig.colors.primary, borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
      </div>
    </div>
  );
}

function NetworkStatusBar() {
  const { themeConfig } = useApp();
  const isOnline = useStore(s => s.isOnline);
  if (isOnline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 px-4"
      style={{ backgroundColor: themeConfig.colors.warning }}>
      <span className="text-xs font-bold text-white">لا يوجد اتصال بالإنترنت</span>
    </div>
  );
}



function AppContent() {
  const { themeConfig, animationStyle, screen, dataError, refreshData } = useApp();
  const { isLoading: authLoading } = useAuth();
  const showNav = screen === 'home';
  const setIsOnline = useStore(s => s.setIsOnline);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportClientError(event.error instanceof Error ? event.error : new Error(event.message));
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);



  const cssVars = {
    '--primary': themeConfig.colors.primary,
    '--secondary': themeConfig.colors.secondary,
    '--accent': themeConfig.colors.accent,
    '--background': themeConfig.colors.background,
    '--surface': themeConfig.colors.surface,
    '--text': themeConfig.colors.text,
    '--text-muted': themeConfig.colors.textMuted,
    '--border': themeConfig.colors.border,
    '--success': themeConfig.colors.success,
    '--warning': themeConfig.colors.warning,
    '--error': themeConfig.colors.error,
    '--info': themeConfig.colors.info,
    '--radius': themeConfig.borderRadius,
    '--font-family': themeConfig.fontFamily,
    ...(themeConfig.colors.gradient ? { '--gradient': themeConfig.colors.gradient } : {}),
  } as React.CSSProperties;

  if (authLoading) {
    return (
      <div className="min-h-screen anim-modern flex items-center justify-center" style={{ ...cssVars, backgroundColor: themeConfig.colors.background }}>
        <div className="flex flex-col items-center gap-4">
          <BrandLogo variant="icon" className="w-20 h-20 rounded-2xl animate-pulse shadow-lg" priority />
          <p className="text-sm font-medium" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen anim-${animationStyle}`} style={{ ...cssVars, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text, fontFamily: themeConfig.fontFamily, transition: 'background-color 0.5s ease, color 0.5s ease' }}>
      <NetworkStatusBar />
      {dataError && (
        <div
          role="alert"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md rounded-xl px-3 py-2 flex items-center gap-3 shadow-lg"
          style={{ backgroundColor: themeConfig.colors.error, color: '#fff' }}
        >
          <span className="text-xs flex-1">{dataError}</span>
          <button type="button" onClick={() => void refreshData()} className="text-xs font-bold underline">
            إعادة المحاولة
          </button>
        </div>
      )}
      <main className={`max-w-lg mx-auto min-h-screen ${showNav ? 'pb-16' : ''}`}>
        {/* Developer Mode toggle — dev builds only; stripped from production. */}
        {import.meta.env.DEV && (
          <>
            <button
              onClick={() => { import('@/supabase/client').then(m => m.toggleDeveloperMode()); }}
              className={`fixed bottom-20 left-2 z-[100] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-all ${isDeveloperMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500 opacity-50'}`}
              title="وضع المطور"
            >
              {'</>'}
            </button>
            {isDeveloperMode && (
              <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 px-4 bg-purple-500">
                <span className="text-xs font-bold text-white">وضع المطور (Developer Mode)</span>
              </div>
            )}
          </>
        )}
        <ScreenRouter />
      </main>
      {showNav && <BottomNav />}
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
