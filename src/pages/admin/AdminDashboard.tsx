import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { supabase } from '@/supabase/client';
import {
  adminListProfiles, adminUpdateUserRole, adminUpdateUserStatus,
  adminListPendingReviews, adminModerateReview, adminListPendingPayments,
  adminListBookings, adminListPendingIdVerifications, adminReviewIdVerification,
  adminListPendingSubscriptions, adminReviewSubscription,
  adminListPendingReports, adminResolveReport,
  updateBookingStatus,
  type AdminUserRow, type AdminReviewRow,
} from '@/supabase/database';
import { ccpProvider } from '@/lib/payment/ccp-provider';
import { getSignedUrl } from '@/supabase/storage';
import type { Database } from '@/types/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Scissors, Calendar, CreditCard, Clock, Star, DollarSign, TrendingUp, ChevronRight, Shield, Check, X, ArrowRight, Crown, Flag, ShoppingBag } from 'lucide-react';
import { marketplaceProducts, marketplacePlacements } from '@/data/marketplaceSeed';
import type { MarketplaceSeller, MarketplaceProduct, MarketplaceSectionConfig } from '@/types/marketplace';
import {
  adminReviewPlacement,
  adminReviewSeller,
  adminSetProductOfDay,
  getMarketplaceSellersForAdmin,
  listPlacementRequests,
} from '@/supabase/marketplace';
import type { SellerPlacementRequest } from '@/lib/marketplace/sellerInventory';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import PausedFeatureBanner from '@/components/PausedFeatureBanner';
import {
  listMarketplaceReports,
  readMarketplaceSectionConfig,
  resolveMarketplaceReport,
  writeMarketplaceSectionConfig,
  type MarketplaceReport,
} from '@/lib/marketplace/sectionConfig';

interface DashboardStats {
  totalUsers: number;
  totalProfessionals: number;
  totalBookings: number;
  totalPayments: number;
  pendingCCPReceipts: number;
  stripePayments: number;
  pendingReviews: number;
  totalRevenue: number;
}

interface RecentBooking {
  id: string;
  client_name: string;
  professional_name: string;
  status: string;
  total_price: number;
  created_at: string;
}

interface RecentPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

interface RecentUser {
  id: string;
  full_name: string;
  user_role: string;
  created_at: string;
}

interface ChartData {
  date: string;
  bookings: number;
  revenue: number;
}

export default function AdminDashboard() {
  const { appUser } = useAuth();
  const { goBack, themeConfig } = useApp();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalProfessionals: 0, totalBookings: 0,
    totalPayments: 0, pendingCCPReceipts: 0, stripePayments: 0,
    pendingReviews: 0, totalRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [activeSection, setActiveSection] = useState<'home' | 'users' | 'bookings' | 'payments' | 'reviews' | 'identity' | 'subscriptions' | 'reports' | 'marketplace'>('home');

  const isAdmin = !!appUser && appUser.user_role === 'admin';

  const fetchStats = useCallback(async () => {
    try {
      setStatsError('');
      const [
        { count: usersCount, error: usersErr },
        { count: prosCount, error: prosErr },
        { count: bookingsCount, error: bookingsErr },
        { count: paymentsCount, error: paymentsErr },
        { data: pendingCCP, error: ccpErr },
        { data: stripeData, error: stripeErr },
        { count: reviewsCount, error: reviewsErr },
        { data: revenueData, error: revenueErr },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('professionals').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('id').eq('status', 'processing').in('provider', ['ccp', 'baridi-mob']),
        supabase.from('payments').select('id').eq('provider', 'stripe'),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
        supabase.from('payments').select('amount').eq('status', 'completed'),
      ]);

      const firstError = usersErr || prosErr || bookingsErr || paymentsErr || ccpErr || stripeErr || reviewsErr || revenueErr;
      if (firstError) {
        setStatsError(firstError.message || 'تعذر تحميل بعض إحصائيات الأدمن');
      }

      const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalProfessionals: prosCount || 0,
        totalBookings: bookingsCount || 0,
        totalPayments: paymentsCount || 0,
        pendingCCPReceipts: pendingCCP?.length || 0,
        stripePayments: stripeData?.length || 0,
        pendingReviews: reviewsCount || 0,
        totalRevenue,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStatsError(err instanceof Error ? err.message : 'فشل تحميل إحصائيات الأدمن');
    }
  }, []);

  const fetchRecentData = useCallback(async () => {
    try {
      // Recent bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, status, total_price, created_at, client_id, professional_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (bookingsData) {
        const enriched = await Promise.all(bookingsData.map(async (b) => {
          const { data: client } = await supabase.from('profiles').select('full_name').eq('id', b.client_id || '').single();
          const { data: pro } = await supabase.from('professionals').select('business_name').eq('id', b.professional_id || '').single();
          return {
            id: b.id,
            client_name: client?.full_name || 'غير معروف',
            professional_name: pro?.business_name || 'غير معروف',
            status: String(b.status || 'pending'),
            total_price: b.total_price || 0,
            created_at: b.created_at || new Date().toISOString(),
          };
        }));
        setRecentBookings(enriched);
      }

      // Recent payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, provider, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (paymentsData) {
        setRecentPayments(paymentsData.map(p => ({
          id: p.id,
          amount: p.amount || 0,
          method: p.provider || 'unknown',
          status: p.status || 'pending',
          created_at: p.created_at || new Date().toISOString(),
        })));
      }

      // Recent users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, user_role, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (usersData) {
        setRecentUsers(usersData.map(u => ({
          id: u.id,
          full_name: u.full_name || 'مستخدم',
          user_role: u.user_role || 'client',
          created_at: u.updated_at || new Date().toISOString(),
        })));
      }
    } catch (err) {
      console.error('Failed to fetch recent data:', err);
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('created_at, total_price')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (bookingsData) {
        const grouped: Record<string, { bookings: number; revenue: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          grouped[key] = { bookings: 0, revenue: 0 };
        }
        bookingsData.forEach(b => {
          const day = b.created_at?.split('T')[0];
          if (day && grouped[day]) {
            grouped[day].bookings++;
            grouped[day].revenue += b.total_price || 0;
          }
        });
        setChartData(Object.entries(grouped).map(([date, data]) => ({
          date: date.slice(5), // MM-DD
          ...data,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRecentData(), fetchChartData()]);
      setLoading(false);
    };
    loadAll();
  }, [isAdmin, fetchStats, fetchRecentData, fetchChartData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'confirmed': return themeConfig.colors.success;
      case 'pending': case 'processing': return themeConfig.colors.warning;
      case 'cancelled': case 'failed': return themeConfig.colors.error;
      default: return themeConfig.colors.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار', confirmed: 'مؤكد', completed: 'مكتمل',
      cancelled: 'ملغي', processing: 'قيد المعالجة', failed: 'فشل',
      in_progress: 'جاري', no_show: 'لم يحضر',
    };
    return labels[status] || status;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      client: 'عميل', barber: 'حلاق', store: 'متجر', company: 'شركة', doctor: 'طبيب',
      specialist: 'متخصص', admin: 'مدير', moderator: 'مشرف',
    };
    return labels[role] || role;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="text-center p-8 rounded-2xl max-w-sm w-full" style={{ backgroundColor: themeConfig.colors.surface }}>
          <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: themeConfig.colors.error }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: themeConfig.colors.text }}>غير مصرح</h2>
          <p className="text-sm mb-6" style={{ color: themeConfig.colors.textMuted }}>ليس لديك صلاحية الوصول إلى لوحة التحكم</p>
          <button onClick={goBack} className="px-6 py-2 rounded-xl text-white font-medium" style={{ backgroundColor: themeConfig.colors.primary }}>
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: themeConfig.colors.primary, borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (activeSection !== 'home' && appUser) {
    return <AdminSection section={activeSection} adminId={appUser.id} onBack={() => setActiveSection('home')} />;
  }

  const statCards = [
    { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: '#3b82f6', section: 'users' as const },
    { label: 'المحترفين', value: stats.totalProfessionals, icon: Scissors, color: '#8b5cf6', section: 'users' as const },
    { label: 'إجمالي الحجوزات', value: stats.totalBookings, icon: Calendar, color: '#10b981', section: 'bookings' as const },
    { label: 'إجمالي المدفوعات', value: stats.totalPayments, icon: CreditCard, color: '#f59e0b', section: 'payments' as const },
    { label: 'إيصالات CCP معلقة', value: stats.pendingCCPReceipts, icon: Clock, color: '#ef4444', section: 'payments' as const },
    { label: 'مدفوعات Stripe', value: stats.stripePayments, icon: DollarSign, color: '#6366f1', section: 'payments' as const },
    { label: 'مراجعات معلقة', value: stats.pendingReviews, icon: Star, color: '#f97316', section: 'reviews' as const },
    { label: 'إجمالي الإيرادات', value: `${stats.totalRevenue.toLocaleString()} د.ج`, icon: TrendingUp, color: '#059669', section: 'payments' as const },
  ];

  const quickActions = [
    { label: 'مراجعة المدفوعات المعلقة', action: () => setActiveSection('payments'), icon: CreditCard },
    { label: 'إدارة المراجعات', action: () => setActiveSection('reviews'), icon: Star },
    { label: 'إدارة المستخدمين', action: () => setActiveSection('users'), icon: Users },
    { label: 'إدارة الحجوزات', action: () => setActiveSection('bookings'), icon: Calendar },
    { label: 'توثيق الهويات', action: () => setActiveSection('identity'), icon: Shield },
    { label: 'طلبات الاشتراك', action: () => setActiveSection('subscriptions'), icon: Crown },
    { label: 'السوق (متاجر/شركات/أطباء)', action: () => setActiveSection('marketplace'), icon: ShoppingBag },
    { label: 'البلاغات', action: () => setActiveSection('reports'), icon: Flag },
  ];

  return (
    <div className="min-h-screen pb-6" style={{ backgroundColor: themeConfig.colors.background }}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: themeConfig.colors.surface, borderBottom: `1px solid ${themeConfig.colors.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-xl" style={{ backgroundColor: themeConfig.colors.background }}>
            <ChevronRight className="w-5 h-5" style={{ color: themeConfig.colors.text }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>لوحة التحكم</h1>
            <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>مرحباً، {appUser?.full_name || 'المدير'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: themeConfig.colors.primary }}>Admin</span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {statsError && (
          <div role="alert" className="p-3 rounded-xl text-xs leading-5" style={{ backgroundColor: `${themeConfig.colors.error}12`, color: themeConfig.colors.error }}>
            تعذر تحميل بعض الإحصائيات: {statsError}
            <button type="button" className="underline font-bold mr-2" onClick={() => void fetchStats()}>إعادة المحاولة</button>
          </div>
        )}
        <div className="p-3 rounded-xl text-[11px] leading-5" style={{ backgroundColor: `${themeConfig.colors.warning}12`, color: themeConfig.colors.warning }}>
          تنبيه الإطلاق: دفع البطاقة/CCP وترقية الاشتراكات المدفوعة <strong>متوقفة</strong> في الواجهة حتى التفعيل اليدوي.
        </div>
        {(!FEATURE_FLAGS.adminAuditLogEnabled || !FEATURE_FLAGS.moderatorConsoleEnabled) && (
          <PausedFeatureBanner
            title="سجل التدقيق ولوحة المشرف"
            description="متوقفان حتى تجهيز الجداول وRLS. الإدارة الحالية (مستخدمون، حجوزات، سوق، تقارير) تبقى متاحة."
            kind="paused"
            colors={themeConfig.colors}
          />
        )}
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card, i) => (
            <button key={i} onClick={() => setActiveSection(card.section)} className="p-3 rounded-xl text-right transition-transform active:scale-95" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${card.color}20` }}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>{card.value}</p>
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{card.label}</p>
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="space-y-4">
          <h3 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الحجوزات (آخر 7 أيام)</h3>
          <div className="p-4 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.colors.border} />
                <XAxis dataKey="date" tick={{ fill: themeConfig.colors.textMuted, fontSize: 11 }} />
                <YAxis tick={{ fill: themeConfig.colors.textMuted, fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}`, borderRadius: '8px' }} />
                <Bar dataKey="bookings" fill={themeConfig.colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>الإيرادات (آخر 7 أيام)</h3>
          <div className="p-4 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.colors.border} />
                <XAxis dataKey="date" tick={{ fill: themeConfig.colors.textMuted, fontSize: 11 }} />
                <YAxis tick={{ fill: themeConfig.colors.textMuted, fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}`, borderRadius: '8px' }} />
                <Line type="monotone" dataKey="revenue" stroke={themeConfig.colors.success} strokeWidth={2} dot={{ fill: themeConfig.colors.success }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <button key={i} onClick={action.action} className="p-3 rounded-xl text-right flex items-center gap-2 transition-all active:scale-95" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
                <action.icon className="w-5 h-5 flex-shrink-0" style={{ color: themeConfig.colors.primary }} />
                <span className="text-xs font-medium" style={{ color: themeConfig.colors.text }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h3 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>آخر الحجوزات</h3>
          <div className="space-y-2">
            {recentBookings.map(booking => (
              <div key={booking.id} className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{booking.client_name}</p>
                  <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{booking.professional_name} • {formatDate(booking.created_at)}</p>
                </div>
                <div className="text-left">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${getStatusColor(booking.status)}20`, color: getStatusColor(booking.status) }}>
                    {getStatusLabel(booking.status)}
                  </span>
                  <p className="text-xs mt-1 font-medium" style={{ color: themeConfig.colors.text }}>{booking.total_price} د.ج</p>
                </div>
              </div>
            ))}
            {recentBookings.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: themeConfig.colors.textMuted }}>لا توجد حجوزات حديثة</p>
            )}
          </div>

          <h3 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>آخر المدفوعات</h3>
          <div className="space-y-2">
            {recentPayments.map(payment => (
              <div key={payment.id} className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{payment.amount} د.ج</p>
                  <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{payment.method} • {formatDate(payment.created_at)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${getStatusColor(payment.status)}20`, color: getStatusColor(payment.status) }}>
                  {getStatusLabel(payment.status)}
                </span>
              </div>
            ))}
            {recentPayments.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: themeConfig.colors.textMuted }}>لا توجد مدفوعات حديثة</p>
            )}
          </div>

          <h3 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>آخر المستخدمين</h3>
          <div className="space-y-2">
            {recentUsers.map(user => (
              <div key={user.id} className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{user.full_name}</p>
                  <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{formatDate(user.created_at)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${themeConfig.colors.primary}20`, color: themeConfig.colors.primary }}>
                  {getRoleLabel(user.user_role)}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: themeConfig.colors.textMuted }}>لا يوجد مستخدمين جدد</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= ADMIN MANAGEMENT SECTIONS (I2 / I3 / H3) ================= */
const ROLE_OPTIONS = ['client', 'barber', 'store', 'company', 'doctor', 'specialist', 'moderator', 'admin'];
const ROLE_LABELS: Record<string, string> = {
  client: 'عميل',
  barber: 'حلاق',
  store: 'متجر',
  company: 'شركة',
  doctor: 'طبيب',
  specialist: 'متخصص',
  moderator: 'مشرف محتوى',
  admin: 'مدير',
};
const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  in_progress: 'جاري',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  no_show: 'لم يحضر',
};

interface PendingPaymentRow {
  id: string;
  amount: number | null;
  provider: string | null;
  created_at: string | null;
  metadata: unknown;
  receipt_url?: string | null;
}

interface AdminBookingRow {
  id: string;
  booking_start_time: string;
  status: string | null;
  total_price: number;
  profiles?: { full_name: string | null } | null;
  professionals?: { business_name: string | null; profiles?: { full_name: string | null } | null } | null;
  services?: { name: string | null } | null;
  booking_services?: Array<{ services?: { name: string | null } | null }>;
}

interface AdminIdVerificationRow {
  id: string;
  document_path: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface AdminSubscriptionRow {
  id: string;
  plan_id: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
  subscription_plans?: { name_ar: string; price_dzd: number } | null;
}

interface AdminReportRow {
  id: string;
  reason: string;
  created_at: string | null;
  kind: 'forum' | 'professional';
  reporterName: string;
  targetName: string;
}

function AdminSection({ section, adminId, onBack }: { section: 'users' | 'bookings' | 'payments' | 'reviews' | 'identity' | 'subscriptions' | 'reports' | 'marketplace'; adminId: string; onBack: () => void }) {
  const { themeConfig } = useApp();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [payments, setPayments] = useState<PendingPaymentRow[]>([]);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [identityRequests, setIdentityRequests] = useState<AdminIdVerificationRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [identityUrls, setIdentityUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (section === 'users') setUsers(await adminListProfiles());
      else if (section === 'reviews') setReviews(await adminListPendingReviews());
      else if (section === 'bookings') setBookings((await adminListBookings()) as unknown as AdminBookingRow[]);
      else if (section === 'subscriptions') {
        setSubscriptions((await adminListPendingSubscriptions()) as unknown as AdminSubscriptionRow[]);
      }
      else if (section === 'reports') {
        const pending = await adminListPendingReports();
        setReports([
          ...pending.forum.map(report => ({
            id: report.id,
            reason: report.reason,
            created_at: report.created_at,
            kind: 'forum' as const,
            reporterName: report.profiles?.full_name || 'مستخدم',
            targetName: report.forum_posts?.title || 'منشور أو تعليق',
          })),
          ...pending.professionals.map(report => ({
            id: report.id,
            reason: report.reason,
            created_at: report.created_at,
            kind: 'professional' as const,
            reporterName: report.profiles?.full_name || 'مستخدم',
            targetName: report.professionals?.business_name || 'حلاق',
          })),
        ]);
      }
      else if (section === 'identity') {
        const rows = (await adminListPendingIdVerifications()) as unknown as AdminIdVerificationRow[];
        setIdentityRequests(rows);
        const signedEntries = await Promise.all(rows.map(request =>
          getSignedUrl('id-cards', request.document_path)
            .then(url => [request.id, url] as const)
            .catch(() => null)
        ));
        setIdentityUrls(Object.fromEntries(signedEntries.filter((entry): entry is readonly [string, string] => entry !== null)));
      }
      else if (section === 'payments') {
        const rows = (await adminListPendingPayments()) as unknown as PendingPaymentRow[];
        setPayments(rows);
        const signedEntries = await Promise.all(rows.flatMap(payment =>
          payment.receipt_url
            ? [getSignedUrl('payment-receipts', payment.receipt_url)
                .then(url => [payment.id, url] as const)
                .catch(() => null)]
            : []
        ));
        setReceiptUrls(Object.fromEntries(signedEntries.filter((entry): entry is readonly [string, string] => entry !== null)));
      }
      // marketplace uses local seed panel — no remote fetch required
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  const titles: Record<string, string> = {
    users: 'إدارة المستخدمين',
    bookings: 'إدارة الحجوزات',
    payments: 'مراجعة المدفوعات',
    reviews: 'إدارة المراجعات',
    identity: 'توثيق الهويات',
    subscriptions: 'طلبات الاشتراك',
    reports: 'البلاغات',
    marketplace: 'إدارة السوق',
  };

  const changeRole = async (u: AdminUserRow, role: string) => {
    setBusyId(u.id);
    try { await adminUpdateUserRole(u.id, role); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'فشل'); } finally { setBusyId(null); }
  };
  const toggleStatus = async (u: AdminUserRow) => {
    setBusyId(u.id);
    const next = u.user_status === 'suspended' ? 'active' : 'suspended';
    try { await adminUpdateUserStatus(u.id, next); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'فشل'); } finally { setBusyId(null); }
  };
  const moderate = async (r: AdminReviewRow, approved: boolean) => {
    setBusyId(r.id);
    try { await adminModerateReview(r.id, approved); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'فشل'); } finally { setBusyId(null); }
  };
  const decidePayment = async (p: PendingPaymentRow, approve: boolean) => {
    setBusyId(p.id);
    try {
      if (approve) await ccpProvider.approvePayment(p.id, adminId);
      else await ccpProvider.rejectPayment(p.id, adminId, 'مرفوض من الإدارة');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'فشل'); } finally { setBusyId(null); }
  };
  const changeBookingStatus = async (booking: AdminBookingRow, status: string) => {
    setBusyId(booking.id);
    try {
      await updateBookingStatus(
        booking.id,
        status as Database['public']['Enums']['booking_status']
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث الحجز');
    } finally {
      setBusyId(null);
    }
  };
  const reviewIdentity = async (request: AdminIdVerificationRow, approve: boolean) => {
    setBusyId(request.id);
    try {
      await adminReviewIdVerification(request.id, approve, approve ? undefined : 'الوثيقة غير واضحة أو غير صالحة');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل مراجعة الهوية');
    } finally {
      setBusyId(null);
    }
  };
  const reviewSubscription = async (request: AdminSubscriptionRow, approve: boolean) => {
    setBusyId(request.id);
    try {
      await adminReviewSubscription(request.id, approve, approve ? undefined : 'لم يتم اعتماد طلب الاشتراك');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل مراجعة الاشتراك');
    } finally {
      setBusyId(null);
    }
  };
  const resolveReport = async (report: AdminReportRow, accepted: boolean) => {
    setBusyId(report.id);
    try {
      await adminResolveReport(report.kind, report.id, accepted);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل مراجعة البلاغ');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen pb-6" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: themeConfig.colors.surface, borderBottom: `1px solid ${themeConfig.colors.border}` }}>
        <button onClick={onBack} className="p-2 rounded-xl" style={{ backgroundColor: themeConfig.colors.background }}>
          <ArrowRight className="w-5 h-5" style={{ color: themeConfig.colors.text }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>{titles[section]}</h1>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {error && <p className="text-xs p-2 rounded-lg" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>{error}</p>}
        {loading && <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>}

        {!loading && section === 'users' && users.map(u => (
          <div key={u.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: themeConfig.colors.text }}>{u.full_name || 'مستخدم'}</p>
              <button disabled={busyId === u.id} onClick={() => toggleStatus(u)} className="text-[11px] px-2 py-1 rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: (u.user_status === 'suspended' ? themeConfig.colors.success : themeConfig.colors.error) + '15', color: u.user_status === 'suspended' ? themeConfig.colors.success : themeConfig.colors.error }}>
                {u.user_status === 'suspended' ? 'تفعيل' : 'تعليق'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{u.city || '—'} · {u.user_status}</span>
              <select value={u.user_role || 'client'} disabled={busyId === u.id} onChange={e => changeRole(u, e.target.value)}
                className="mr-auto text-[11px] px-2 py-1 rounded-lg border bg-transparent" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
        ))}

        {!loading && section === 'reviews' && (reviews.length === 0
          ? <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>لا توجد مراجعات معلقة</p>
          : reviews.map(r => (
            <div key={r.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < (r.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />)}
              </div>
              <p className="text-xs mb-2" style={{ color: themeConfig.colors.text }}>{r.comment || 'بدون تعليق'}</p>
              <div className="flex gap-2">
                <button disabled={busyId === r.id} onClick={() => moderate(r, true)} className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}><Check size={13} /> نشر</button>
                <button disabled={busyId === r.id} onClick={() => moderate(r, false)} className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}><X size={13} /> رفض</button>
              </div>
            </div>
          )))}

        {!loading && section === 'payments' && (payments.length === 0
          ? <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>لا توجد مدفوعات بانتظار المراجعة</p>
          : payments.map(p => {
            return (
              <div key={p.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{p.amount ?? 0} دج · {p.provider}</p>
                  {receiptUrls[p.id] && <a href={receiptUrls[p.id]} target="_blank" rel="noreferrer" className="text-[11px] underline" style={{ color: themeConfig.colors.primary }}>عرض الإيصال</a>}
                </div>
                <div className="flex gap-2">
                  <button disabled={busyId === p.id} onClick={() => decidePayment(p, true)} className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}><Check size={13} /> قبول الدفع</button>
                  <button disabled={busyId === p.id} onClick={() => decidePayment(p, false)} className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}><X size={13} /> رفض</button>
                </div>
              </div>
            );
          }))}

        {!loading && section === 'bookings' && (bookings.length === 0
          ? <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>لا توجد حجوزات</p>
          : bookings.map(booking => (
            <div key={booking.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{booking.profiles?.full_name || 'عميل'}</p>
                  <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
                    {booking.professionals?.business_name || booking.professionals?.profiles?.full_name || 'حلاق'} · {booking.booking_services?.map(item => item.services?.name).filter(Boolean).join(' + ') || booking.services?.name || 'خدمة'}
                  </p>
                </div>
                <span className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>{booking.total_price} دج</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{new Date(booking.booking_start_time).toLocaleString('ar-DZ')}</span>
                <select
                  value={booking.status || 'pending'}
                  disabled={busyId === booking.id}
                  onChange={event => void changeBookingStatus(booking, event.target.value)}
                  className="mr-auto text-[11px] px-2 py-1 rounded-lg border bg-transparent"
                  style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
                >
                  {Object.entries(BOOKING_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                </select>
              </div>
            </div>
          )))}

        {!loading && section === 'identity' && (identityRequests.length === 0
          ? <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>لا توجد طلبات توثيق معلقة</p>
          : identityRequests.map(request => (
            <div key={request.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{request.profiles?.full_name || 'مستخدم'}</p>
                  <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{new Date(request.created_at).toLocaleString('ar-DZ')}</p>
                </div>
                {identityUrls[request.id] && <a href={identityUrls[request.id]} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: themeConfig.colors.primary }}>عرض الوثيقة</a>}
              </div>
              <div className="flex gap-2">
                <button disabled={busyId === request.id} onClick={() => void reviewIdentity(request, true)} className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>قبول</button>
                <button disabled={busyId === request.id} onClick={() => void reviewIdentity(request, false)} className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>رفض</button>
              </div>
            </div>
          )))}

        {!loading && section === 'subscriptions' && (subscriptions.length === 0
          ? <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>لا توجد طلبات اشتراك معلقة</p>
          : subscriptions.map(request => (
            <div key={request.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{request.profiles?.full_name || 'مستخدم'}</p>
                  <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{request.subscription_plans?.name_ar || request.plan_id} · {request.subscription_plans?.price_dzd || 0} دج</p>
                </div>
                <Crown size={20} style={{ color: themeConfig.colors.accent }} />
              </div>
              <div className="flex gap-2">
                <button disabled={busyId === request.id} onClick={() => void reviewSubscription(request, true)} className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>تفعيل</button>
                <button disabled={busyId === request.id} onClick={() => void reviewSubscription(request, false)} className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>رفض</button>
              </div>
            </div>
          )))}

        {!loading && section === 'reports' && (reports.length === 0
          ? <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>لا توجد بلاغات معلقة</p>
          : reports.map(report => (
            <div key={`${report.kind}-${report.id}`} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Flag size={16} style={{ color: themeConfig.colors.error }} />
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{report.targetName}</p>
                  <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>بواسطة {report.reporterName} · {report.kind === 'forum' ? 'محتوى المنتدى' : 'ملف حلاق'}</p>
                </div>
              </div>
              <p className="text-xs mb-3" style={{ color: themeConfig.colors.text }}>{report.reason}</p>
              <div className="flex gap-2">
                <button disabled={busyId === report.id} onClick={() => void resolveReport(report, true)} className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.warning + '15', color: themeConfig.colors.warning }}>تمت المراجعة</button>
                <button disabled={busyId === report.id} onClick={() => void resolveReport(report, false)} className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.textMuted + '15', color: themeConfig.colors.textMuted }}>رفض البلاغ</button>
              </div>
            </div>
          )))}

        {!loading && section === 'marketplace' && (
          <MarketplaceAdminPanel />
        )}
      </div>
    </div>
  );
}

function MarketplaceAdminPanel() {
  const { themeConfig, navigate } = useApp();
  const [sellers, setSellers] = useState<MarketplaceSeller[]>([]);
  const [products] = useState<MarketplaceProduct[]>(marketplaceProducts);
  const [potdId, setPotdId] = useState(marketplaceProducts.find(p => p.isProductOfTheDay)?.id || '');
  const [placementReqs, setPlacementReqs] = useState<SellerPlacementRequest[]>([]);
  const [reports, setReports] = useState<MarketplaceReport[]>([]);
  const [sections, setSections] = useState<MarketplaceSectionConfig>(DEFAULT_SECTIONS_SAFE);
  const [toast, setToast] = useState('');

  useEffect(() => {
    void getMarketplaceSellersForAdmin().then(setSellers);
    void listPlacementRequests().then(setPlacementReqs);
    setReports(listMarketplaceReports());
    setSections(readMarketplaceSectionConfig());
  }, []);

  const approve = async (id: string, ok: boolean) => {
    const result = await adminReviewSeller(id, ok);
    setSellers(await getMarketplaceSellersForAdmin());
    setToast(result.ok
      ? (ok ? 'تمت الموافقة على الحساب' : 'تم رفض الحساب')
      : (result.error || 'فشل'));
  };

  const setProductOfDay = async (productId: string) => {
    const result = await adminSetProductOfDay(productId, 25000);
    setPotdId(productId);
    setToast(result.ok
      ? 'تم تعيين منتج اليوم (موضع إعلاني مدفوع — بدون عمولة)'
      : (result.error || 'فشل'));
  };

  const reviewPlacement = async (id: string, ok: boolean) => {
    const result = await adminReviewPlacement(id, ok);
    setPlacementReqs(await listPlacementRequests());
    setToast(result.ok
      ? (ok ? 'تم تفعيل الموضع الإعلاني' : 'تم رفض طلب الموضع')
      : (result.error || 'فشل'));
  };

  const toggleSection = (key: keyof MarketplaceSectionConfig) => {
    if (key === 'categoryOrder') return;
    const next = { ...sections, [key]: !sections[key] };
    setSections(next);
    writeMarketplaceSectionConfig(next);
    setToast('تم تحديث أقسام السوق');
  };

  const resolveReport = (id: string, ok: boolean) => {
    resolveMarketplaceReport(id, ok);
    setReports(listMarketplaceReports());
    setToast(ok ? 'تمت مراجعة بلاغ السوق' : 'تم رفض البلاغ');
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
        <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>قواعد الأدمن للسوق</p>
        <ul className="text-[11px] mt-1 space-y-1" style={{ color: themeConfig.colors.textMuted }}>
          <li>• الموافقة على المتاجر / الشركات / الأطباء (وليس كل منتج)</li>
          <li>• التحكم في منتج اليوم والمواضع المميزة وأقسام السوق</li>
          <li>• مراجعة بلاغات المنتجات/البائعين</li>
          <li>• لا عمولات · لا دفع منتجات داخل التطبيق</li>
        </ul>
        <button
          type="button"
          className="mt-2 text-xs font-bold"
          style={{ color: themeConfig.colors.primary }}
          onClick={() => navigate('marketplace-analytics')}
        >
          فتح تحليلات السوق ←
        </button>
      </div>

      <h4 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>التحكم بأقسام السوق</h4>
      <div className="grid grid-cols-2 gap-2">
        {([
          ['showProductOfTheDay', 'منتج اليوم'],
          ['showFeaturedStrip', 'شريط المميز'],
          ['showBanners', 'البانرات'],
          ['showBarberExtras', 'خدمات الحلاقين'],
          ['showCompanies', 'الشركات'],
          ['showDoctors', 'الأطباء'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleSection(key)}
            className="p-2 rounded-xl text-[11px] font-bold text-right"
            style={{
              backgroundColor: sections[key] ? `${themeConfig.colors.success}15` : themeConfig.colors.surface,
              border: `1px solid ${themeConfig.colors.border}`,
              color: themeConfig.colors.text,
            }}
          >
            {label}: {sections[key] ? 'ظاهر' : 'مخفي'}
          </button>
        ))}
      </div>

      <h4 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>حسابات البائعين</h4>
      {sellers.length === 0 && (
        <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>لا حسابات بائعين</p>
      )}
      {sellers.map(seller => (
        <div key={seller.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{seller.displayName}</p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                {ROLE_LABELS[seller.sellerType] || seller.sellerType} · {seller.approvalStatus} · {seller.subscriptionPlan}
              </p>
            </div>
            <ShoppingBag size={16} style={{ color: themeConfig.colors.primary }} />
          </div>
          {seller.approvalStatus === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => void approve(seller.id, true)} className="flex-1 h-8 rounded-lg text-xs font-bold" style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>موافقة</button>
              <button type="button" onClick={() => void approve(seller.id, false)} className="flex-1 h-8 rounded-lg text-xs font-bold" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>رفض</button>
            </div>
          )}
        </div>
      ))}

      <h4 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>بلاغات السوق</h4>
      {reports.filter(r => r.status === 'pending').length === 0 && (
        <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>لا بلاغات معلّقة</p>
      )}
      {reports.filter(r => r.status === 'pending').map(r => (
        <div key={r.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
          <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{r.targetLabel}</p>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{r.targetType} · {r.reason}</p>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => resolveReport(r.id, true)} className="flex-1 h-8 rounded-lg text-xs font-bold" style={{ backgroundColor: themeConfig.colors.warning + '15', color: themeConfig.colors.warning }}>تمت المراجعة</button>
            <button type="button" onClick={() => resolveReport(r.id, false)} className="flex-1 h-8 rounded-lg text-xs font-bold" style={{ backgroundColor: themeConfig.colors.textMuted + '15', color: themeConfig.colors.textMuted }}>رفض</button>
          </div>
        </div>
      ))}

      <h4 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>طلبات المواضع الإعلانية</h4>
      {placementReqs.length === 0 && (
        <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>لا طلبات مواضع حالياً</p>
      )}
      {placementReqs.map(req => (
        <div key={req.id} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
          <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{req.title}</p>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            {req.placementType} · {req.bidAmountDzd.toLocaleString('ar-DZ')} دج · {req.status}
          </p>
          {req.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => void reviewPlacement(req.id, true)} className="flex-1 h-8 rounded-lg text-xs font-bold" style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>تفعيل</button>
              <button type="button" onClick={() => void reviewPlacement(req.id, false)} className="flex-1 h-8 rounded-lg text-xs font-bold" style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>رفض</button>
            </div>
          )}
        </div>
      ))}

      <h4 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>منتج اليوم (أعلى عرض إعلاني)</h4>
      {products.map(product => (
        <button
          key={product.id}
          type="button"
          onClick={() => void setProductOfDay(product.id)}
          className="w-full p-3 rounded-xl text-right"
          style={{
            backgroundColor: potdId === product.id ? `${themeConfig.colors.accent}18` : themeConfig.colors.surface,
            border: `1px solid ${potdId === product.id ? themeConfig.colors.accent : themeConfig.colors.border}`,
          }}
        >
          <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{product.title}</p>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            {product.sellerName} · عرض توضيحي {marketplacePlacements[0]?.bidAmountDzd?.toLocaleString('ar-DZ')} دج
            {potdId === product.id ? ' · الحالي' : ''}
          </p>
        </button>
      ))}

      {toast && <p className="text-xs text-center font-bold" style={{ color: themeConfig.colors.success }}>{toast}</p>}
    </div>
  );
}

const DEFAULT_SECTIONS_SAFE: MarketplaceSectionConfig = {
  showProductOfTheDay: true,
  showFeaturedStrip: true,
  showBanners: true,
  showBarberExtras: true,
  showCompanies: true,
  showDoctors: true,
  categoryOrder: [],
}
