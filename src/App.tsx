import { lazy, Suspense, useEffect } from 'react';
import { AppProvider } from '@/contexts/AppContext';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { isDeveloperMode } from '@/supabase/client';

import ErrorBoundary from '@/components/ErrorBoundary';
import BottomNav from '@/components/BottomNav';
import BookingTab from '@/tabs/BookingTab';
import AppointmentsTab from '@/tabs/AppointmentsTab';
import CameraTab from '@/tabs/CameraTab';
import ForumTab from '@/tabs/ForumTab';
import ProfileTab from '@/tabs/ProfileTab';
import './App.css';

const BarberDetailPage = lazy(() => import('@/pages/BarberDetailPage'));
const BookingFlowPage = lazy(() => import('@/pages/BookingFlowPage'));
const ChatRoomPage = lazy(() => import('@/pages/ChatRoomPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));
const ComingSoonPage = lazy(() => import('@/components/ComingSoon'));
const LoginScreen = lazy(() => import('@/pages/LoginScreen'));
const RegisterScreen = lazy(() => import('@/pages/RegisterScreen'));
const ForgotPassword = lazy(() => import('@/components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/components/auth/ResetPassword'));

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'booking': return <BookingTab />;
    case 'appointments': return <AppointmentsTab />;
    case 'camera': return <CameraTab />;
    case 'forum': return <ForumTab />;
    case 'profile': return <ProfileTab />;
    default: return <BookingTab />;
  }
}

function ScreenRouter() {
  const { screen, screenParams, activeTab } = useApp();
  const { isAuthenticated } = useAuth();

  const authRequiredScreens = ['booking-flow', 'chat-room'];
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
    case 'notifications':
      return <Suspense fallback={<LoadingFallback />}><NotificationsPage /></Suspense>;
    case 'post-detail':
      return <Suspense fallback={<LoadingFallback />}><PostDetailPage /></Suspense>;
    case 'login':
      return <Suspense fallback={<LoadingFallback />}><LoginScreen /></Suspense>;
    case 'register':
      return <Suspense fallback={<LoadingFallback />}><RegisterScreen /></Suspense>;
    case 'forgot-password':
      return <Suspense fallback={<LoadingFallback />}><ForgotPassword /></Suspense>;
    case 'reset-password':
      return <Suspense fallback={<LoadingFallback />}><ResetPassword /></Suspense>;
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
  const { themeConfig, animationStyle, screen } = useApp();
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
          <img src="/logo-icon.png" alt="Hallaqi" className="w-20 h-20 rounded-2xl animate-pulse" />
          <p className="text-sm font-medium" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen anim-${animationStyle}`} style={{ ...cssVars, backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text, fontFamily: themeConfig.fontFamily, transition: 'background-color 0.5s ease, color 0.5s ease' }}>
      <NetworkStatusBar />
      <main className={`max-w-lg mx-auto min-h-screen ${showNav ? 'pb-16' : ''}`}>
        {isDeveloperMode && (
          <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 px-4 bg-purple-500">
            <span className="text-xs font-bold text-white">وضع المطور (Developer Mode)</span>
          </div>
        )}
        <ScreenRouter />
      </main>
      {showNav && <BottomNav />}
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
