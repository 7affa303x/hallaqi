import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { settingsSections, subscriptionPlans } from '@/data/mockData';
import type { ThemeName, AnimationStyle, LinkedAccount, User } from '@/types';
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
  ArrowLeft, LogIn, UserPlus as UserPlusIcon
} from 'lucide-react';
import EditBarberProfile from '@/components/EditBarberProfile';
import ServicesManagement from '@/components/ServicesManagement';

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

const iconMap: Record<string, any> = {
  Shield, BadgeCheck, Settings, Star, Calendar, MapPin, LinkIcon,
  LogOut, Bell, Eye, Palette, Globe, Type, Mail, MessageSquare, Trophy,
  UserPlus, Lock, Smartphone, CreditCard, Wallet, HelpCircle, Phone,
  Bug, Lightbulb, Info, FileText, FileCode, Trash2, Download, AlertTriangle,
  Check, X, Sparkles, Scissors, Clock, TrendingUp, Award, Zap,
  Crown: CrownIcon,
};

type ProfileSubPage = 'main' | 'theme' | 'animation' | 'language' | 'notifications' |
  'privacy' | 'account' | 'subscription' | 'payment' | 'id-verification' |
  'linked-accounts' | 'help' | 'about' | 'badges' | 'stats' | 'edit-profile' | 'services';

export default function ProfileTab() {
  const { themeConfig, navigate } = useApp();
  const { isAuthenticated, appUser, user, logout, isLoading: authLoading } = useAuth();
  const [subPage, setSubPage] = useState<ProfileSubPage>('main');

  const handleLogout = async () => {
    try { await logout(); setSubPage('main'); } catch (err) { console.error('Logout error:', err); }
  };

  if (!isAuthenticated) {
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
              <LogIn size={18} /> تسجيل الدخول
            </button>
            <button onClick={() => navigate('register')} className="w-full h-12 rounded-xl text-sm font-bold border flex items-center justify-center gap-2" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
              <UserPlusIcon size={18} /> إنشاء حساب جديد
            </button>
          </div>
          <p className="text-[10px] mt-4" style={{ color: themeConfig.colors.textMuted }}>بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  // Map Profile DB fields to UI fields
  const userName = appUser?.full_name || appUser?.username || user?.email?.split('@')[0] || 'مستخدم';
  const userEmail = user?.email || '';
  const userPhone = appUser?.phone_number || '';
  const userAvatar = appUser?.avatar_url || '/logo-icon.png';
  const isVerified = appUser?.verification_status === 'verified' || appUser?.verification_status === 'premium';
  const isIdVerified = false; // Not in profiles table
  const userRole = appUser?.user_role || 'client';

  if (subPage === 'theme') return <ThemeSelector onBack={() => setSubPage('main')} />;
  if (subPage === 'animation') return <AnimationSelector onBack={() => setSubPage('main')} />;
  if (subPage === 'language') return <LanguageSelector onBack={() => setSubPage('main')} />;
  if (subPage === 'notifications') return <NotificationsSettings onBack={() => setSubPage('main')} />;
  if (subPage === 'privacy') return <PrivacySettings onBack={() => setSubPage('main')} />;
  if (subPage === 'subscription') return <SubscriptionPage onBack={() => setSubPage('main')} />;
  if (subPage === 'payment') return <PaymentMethods onBack={() => setSubPage('main')} />;
  if (subPage === 'id-verification') return <IDVerification onBack={() => setSubPage('main')} />;
  if (subPage === 'linked-accounts') return <LinkedAccounts onBack={() => setSubPage('main')} />;
  if (subPage === 'badges') return <BadgesPage onBack={() => setSubPage('main')} />;
  if (subPage === 'stats') return <StatsPage onBack={() => setSubPage('main')} />;
  if (subPage === 'edit-profile') return <EditBarberProfile onBack={() => setSubPage('main')} userRole={userRole} />;
  if (subPage === 'services') return <ServicesManagement onBack={() => setSubPage('main')} />;

  const stats = (appUser as unknown as { stats?: UserStats })?.stats || { totalBookings: 0, totalSpent: 0, streakDays: 0, points: 0, rank: 'جديد' };
  const badges = (appUser as unknown as { badges?: UserBadge[] })?.badges || [];
  const followers = 0; // Not in profiles table

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-6" style={{ backgroundColor: themeConfig.colors.primary, borderRadius: '0 0 2rem 2rem' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-white">البروفايل</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10" title="تسجيل الخروج"><LogOut size={16} className="text-white" /></button>
            <button onClick={() => setSubPage('edit-profile')} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10"><Settings size={16} className="text-white" /></button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={userAvatar} alt={userName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30" />
            {isIdVerified && <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-white"><BadgeCheck size={12} className="text-white" /></div>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{userName}</h2>
              {isVerified && <BadgeCheck size={16} className="text-sky-300 fill-sky-300" />}
            </div>
            <p className="text-xs text-white/70 mt-0.5">{userEmail}</p>
            {userPhone && <p className="text-xs text-white/70">{userPhone}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">{stats.rank}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">{stats.points} نقطة</span>
              {userRole === 'admin' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-white font-medium">مشرف</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={() => setSubPage("stats")} className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{stats.totalBookings}</p><p className="text-[10px] text-white/60">حجوزات</p>
          </button>
          <button onClick={() => setSubPage("badges")} className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{badges.length}</p><p className="text-[10px] text-white/60">شارات</p>
          </button>
          <div className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{followers}</p><p className="text-[10px] text-white/60">متابعين</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-white">{stats.streakDays}</p><p className="text-[10px] text-white/60">يوم متتالي</p>
          </div>
        </div>
      </div>

      {appUser?.user_role === 'admin' && (
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

      <div className="px-4 mt-4 space-y-4">
        {settingsSections.map(section => (
          <div key={section.title}>
            <h3 className="text-xs font-bold mb-2 px-1" style={{ color: themeConfig.colors.textMuted }}>{section.title}</h3>
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              {section.items.map((item, index) => {
                const Icon = iconMap[item.icon] || Settings;
                const isDanger = item.type === 'danger';
                const isLast = index === section.items.length - 1;
                const handleClick = () => {
                  if (item.id === 'logout') { handleLogout(); return; }
                  const pageMap: Record<string, ProfileSubPage> = { theme: 'theme', animation: 'animation', language: 'language', notifications: 'notifications', privacy: 'privacy', subscription: 'subscription', paymentMethods: 'payment', baridiMob: 'payment', idVerification: 'id-verification', linkedAccounts: 'linked-accounts', helpCenter: 'help', aboutApp: 'about', services: 'services' };
                  const page = pageMap[item.id]; if (page) setSubPage(page);
                };
                return (
                  <button key={item.id} onClick={handleClick} className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-all hover:bg-black/5 ${!isLast ? 'border-b' : ''}`} style={{ borderColor: themeConfig.colors.border + '60' }}>
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
        ))}
      </div>
    </div>
  );
}

// ====== SUB PAGE COMPONENTS ======

function ThemeSelector({ onBack }: { onBack: () => void }) {
  const { themeConfig, currentTheme, setTheme } = useApp();
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
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
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
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
  const languages = [{ key: 'ar', label: 'العربية', flag: '🇩🇿' }, { key: 'fr', label: 'Français', flag: '🇫🇷' }, { key: 'en', label: 'English', flag: '🇬🇧' }];
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>اللغة</h2>
      </div>
      <div className="px-4 mt-4 space-y-2">
        {languages.map(lang => (
          <button key={lang.key} onClick={() => updateSettings({ language: lang.key as 'ar' | 'fr' | 'en' })} className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all" style={{ backgroundColor: settings.language === lang.key ? themeConfig.colors.primary + '08' : themeConfig.colors.surface, borderColor: settings.language === lang.key ? themeConfig.colors.primary : themeConfig.colors.border }}>
            <span className="text-2xl">{lang.flag}</span><div className="flex-1 text-right"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{lang.label}</p></div>
            {settings.language === lang.key && <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary }}><Check size={14} className="text-white" /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationsSettings({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  const items = [
    { key: 'pushEnabled', label: 'الإشعارات الفورية', icon: Bell }, { key: 'emailEnabled', label: 'إشعارات البريد', icon: Mail },
    { key: 'smsEnabled', label: 'إشعارات الرسائل', icon: MessageSquare }, { key: 'bookingReminders', label: 'تذكير المواعيد', icon: Calendar },
    { key: 'promotions', label: 'العروض والتخفيضات', icon: Star }, { key: 'forumReplies', label: 'ردود المنتدى', icon: MessageSquare },
    { key: 'competitionUpdates', label: 'تحديثات المسابقات', icon: Trophy }, { key: 'newFollowers', label: 'متابعين جدد', icon: UserPlus },
  ];
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الإشعارات</h2>
      </div>
      <div className="px-4 mt-4"><div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        {items.map((item, index) => { const Icon = item.icon; const isEnabled = settings.notifications[item.key as keyof typeof settings.notifications]; return (
          <div key={item.key} className={`flex items-center gap-3 px-4 py-3.5 ${index < items.length - 1 ? 'border-b' : ''}`} style={{ borderColor: themeConfig.colors.border + '60' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.primary + '08' }}><Icon size={16} style={{ color: themeConfig.colors.primary }} /></div>
            <div className="flex-1"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{item.label}</p></div>
            <button onClick={() => updateSettings({ notifications: { ...settings.notifications, [item.key]: !isEnabled } })} className="w-12 h-7 rounded-full transition-all relative flex-shrink-0" style={{ backgroundColor: isEnabled ? themeConfig.colors.primary : themeConfig.colors.border }}>
              <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all" style={{ right: isEnabled ? '2px' : 'auto', left: isEnabled ? 'auto' : '2px' }} />
            </button>
          </div>
        ); })}</div></div>
    </div>
  );
}

function PrivacySettings({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings, updateSettings } = useApp();
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
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
      </div>
    </div>
  );
}

function SubscriptionPage({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>خطط الاشتراك</h2>
      </div>
      <div className="px-4 mt-4 space-y-3">
        {subscriptionPlans.map(plan => (
          <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} className="rounded-2xl border-2 overflow-hidden transition-all cursor-pointer" style={{ backgroundColor: selectedPlan === plan.id ? themeConfig.colors.primary + '05' : themeConfig.colors.surface, borderColor: selectedPlan === plan.id ? themeConfig.colors.primary : themeConfig.colors.border }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: plan.id === 'free' ? '#22C55E15' : plan.id === 'basic' ? '#3B82F615' : plan.id === 'pro' ? '#8B5CF615' : '#EAB30815' }}><Crown size={20} style={{ color: plan.id === 'free' ? '#22C55E' : plan.id === 'basic' ? '#3B82F6' : plan.id === 'pro' ? '#8B5CF6' : '#EAB308' }} /></div><div><h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{plan.name}</h3><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{plan.period}</p></div></div>
                <div className="text-right"><p className="text-lg font-bold" style={{ color: themeConfig.colors.primary }}>{plan.price === 0 ? 'مجاني' : `${plan.price} دج`}</p></div>
              </div>
              <div className="space-y-1.5">{plan.features.map((feature: string, i: number) => (<div key={i} className="flex items-center gap-2"><Check size={14} className="text-green-500 flex-shrink-0" /><span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{feature}</span></div>))}</div>
              {plan.price > 0 && (<div className="mt-3 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}><p className="text-[10px] font-medium mb-1.5" style={{ color: themeConfig.colors.textMuted }}>معلومات الدفع CCP:</p><div className="p-2 rounded-lg text-center" style={{ backgroundColor: themeConfig.colors.background }}><p className="text-xs font-mono" style={{ color: themeConfig.colors.text }}>{plan.ccpInfo.accountNumber}</p><p className="text-[10px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>رقم البطاقة: {plan.ccpInfo.cardNumber}</p></div></div>)}
              <button className="w-full h-10 rounded-xl text-sm font-bold text-white mt-3 transition-all" style={{ backgroundColor: selectedPlan === plan.id ? themeConfig.colors.primary : themeConfig.colors.border, opacity: selectedPlan === plan.id ? 1 : 0.6 }}>{selectedPlan === plan.id ? 'اختر هذا الباقة' : 'اختيار'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentMethods({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>طرق الدفع</h2>
      </div>
      <div className="px-4 mt-4 space-y-3">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center gap-3 mb-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EAB30815' }}><CreditCard size={24} style={{ color: '#EAB308' }} /></div><div className="flex-1"><h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>CCP - حساب بريد الجزائر</h3><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>الدفع عبر الحساب البريدي</p></div><span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-bold">متاح</span></div>
          <div className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.background }}><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>رقم الحساب البريدي</p><p className="text-sm font-mono font-bold mt-0.5" style={{ color: themeConfig.colors.text }}>007999990000000012345678</p><p className="text-xs mt-2" style={{ color: themeConfig.colors.textMuted }}>رقم البطاقة</p><p className="text-sm font-mono font-bold mt-0.5" style={{ color: themeConfig.colors.text }}>1234 5678 9012 3456</p></div>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center gap-3 mb-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3B82F615' }}><Wallet size={24} style={{ color: '#3B82F6' }} /></div><div className="flex-1"><h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>بريدي موب</h3><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>الدفع عبر تطبيق بريدي موب</p></div><span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">قريباً</span></div>
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: themeConfig.colors.background }}><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>سيتم دمج الدفع عبر بريدي موب قريباً</p><button className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>إشعاري عند التوفر</button></div>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#22C55E15' }}><CreditCard size={24} style={{ color: '#22C55E' }} /></div><div className="flex-1"><h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>الدفع النقدي</h3><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>الدفع مباشرة عند الزيارة</p></div><span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-bold">متاح</span></div>
        </div>
      </div>
    </div>
  );
}

function IDVerification({ onBack }: { onBack: () => void }) {
  const { themeConfig } = useApp();
  const { appUser: _appUser } = useAuth();
  const isIdVerified = false; // Not in profiles table

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
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
            <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="flex items-center gap-3 mb-3"><Shield size={24} style={{ color: themeConfig.colors.primary }} /><div><h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>لماذا التوثيق؟</h3></div></div>
              <div className="space-y-2">{['الوصول لقسم التعليقات الموجه للموثقين', 'المشاركة في المسابقات', 'ربط الحساب بالخدمات المالية', 'زيادة مصداقيتك في المنتدى', 'الحصول على شارة التوثيق'].map((item, i) => (<div key={i} className="flex items-center gap-2"><Check size={14} style={{ color: themeConfig.colors.primary }} /><span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{item}</span></div>))}</div>
            </div>
            <div className="rounded-2xl border p-4 text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed mx-auto mb-3 flex flex-col items-center justify-center" style={{ borderColor: themeConfig.colors.border }}><Shield size={24} style={{ color: themeConfig.colors.textMuted }} /><span className="text-[9px] mt-1" style={{ color: themeConfig.colors.textMuted }}>امسح البطاقة</span></div>
              <button className="w-full h-10 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>رفع صورة البطاقة التعريفية</button>
              <p className="text-[10px] mt-2" style={{ color: themeConfig.colors.textMuted }}>البيانات مشفرة وآمنة. لن يتم مشاركتها مع أحد.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedAccounts({ onBack }: { onBack: () => void }) {
  const { themeConfig, currentUser } = useApp();
  const providers = [{ key: 'google', name: 'Google', color: '#EF4444' }, { key: 'facebook', name: 'Facebook', color: '#3B82F6' }, { key: 'apple', name: 'Apple', color: '#1F1F1F' }, { key: 'instagram', name: 'Instagram', color: '#EC4899' }];
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الحسابات المرتبطة</h2>
      </div>
      <div className="px-4 mt-4 space-y-2">
        {providers.map(provider => { const account = (currentUser as User)?.linkedAccounts?.find((a: LinkedAccount) => a.provider === provider.key); return (
          <div key={provider.key} className="flex items-center gap-3 p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: provider.color + '15' }}><LinkIcon size={20} style={{ color: provider.color }} /></div>
            <div className="flex-1"><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{provider.name}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{account?.connected ? account.username || 'متصل' : 'غير متصل'}</p></div>
            <button className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ backgroundColor: account?.connected ? themeConfig.colors.error + '10' : themeConfig.colors.primary, color: account?.connected ? themeConfig.colors.error : '#fff' }}>{account?.connected ? 'فصل' : 'ربط'}</button>
          </div>
        ); })}</div>
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
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
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
  const { themeConfig, currentUser } = useApp();
  const { appUser } = useAuth();
  const stats = (appUser as unknown as { stats?: UserStats })?.stats || (currentUser as unknown as { stats?: UserStats })?.stats || { totalBookings: 0, totalSpent: 0, streakDays: 0, points: 0, rank: 'جديد' };
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b" style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"><ArrowLeft size={20} style={{ color: themeConfig.colors.text }} /></button>
        <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الإحصائيات</h2>
      </div>
      <div className="px-4 mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[{ label: 'إجمالي الحجوزات', value: (stats.totalBookings || 0).toString(), icon: Calendar, color: '#3B82F6' }, { label: 'إجمالي الإنفاق', value: `${stats.totalSpent || 0} دج`, icon: CreditCard, color: '#22C55E' }, { label: 'الأيام المتتالية', value: (stats.streakDays || 0).toString(), icon: Zap, color: '#F59E0B' }, { label: 'النقاط', value: (stats.points || 0).toString(), icon: Star, color: '#8B5CF6' }].map((stat, i) => (
            <div key={i} className="p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: stat.color + '15' }}><stat.icon size={16} style={{ color: stat.color }} /></div>
              <p className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>{stat.value}</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{stat.label}</p>
            </div>
          ))}</div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#C0C0C015' }}><Award size={28} style={{ color: '#C0C0C0' }} /></div>
            <div className="flex-1"><p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>مرتبتك الحالية</p><p className="text-xl font-bold" style={{ color: themeConfig.colors.text }}>{stats.rank}</p></div>
            <div className="text-right"><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>النقاط للتصنيف التالي</p><div className="w-24 h-2 rounded-full bg-gray-200 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: '62%', backgroundColor: themeConfig.colors.primary }} /></div><p className="text-[9px] mt-0.5" style={{ color: themeConfig.colors.primary }}>1250 / 2000</p></div>
          </div>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <p className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.textMuted }}>المختص المفضل</p>
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '15' }}><Scissors size={18} style={{ color: themeConfig.colors.primary }} /></div><p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>لم يتحدد بعد</p></div>
        </div>
      </div>
    </div>
  );
}