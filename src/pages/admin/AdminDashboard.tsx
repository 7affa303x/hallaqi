import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { supabase } from '@/supabase/client';
import {
  adminListProfiles, adminUpdateUserRole, adminUpdateUserStatus,
  adminListPendingReviews, adminModerateReview, adminListPendingPayments,
  type AdminUserRow, type AdminReviewRow,
} from '@/supabase/database';
import { ccpProvider } from '@/lib/payment/ccp-provider';
import { getSignedUrl } from '@/supabase/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Scissors, Calendar, CreditCard, Clock, Star, DollarSign, TrendingUp, ChevronRight, Shield, Check, X, ArrowRight } from 'lucide-react';

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
  const [activeSection, setActiveSection] = useState<'home' | 'users' | 'bookings' | 'payments' | 'reviews'>('home');

  const isAdmin = !!appUser && appUser.user_role === 'admin';

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: usersCount },
        { count: prosCount },
        { count: bookingsCount },
        { count: paymentsCount },
        { data: pendingCCP },
        { data: stripeData },
        { count: reviewsCount },
        { data: revenueData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('professionals').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('id').eq('status', 'processing').in('provider', ['ccp', 'baridi-mob']),
        supabase.from('payments').select('id').eq('provider', 'stripe'),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
        supabase.from('payments').select('amount').eq('status', 'completed'),
      ]);

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
      client: 'عميل', barber: 'حلاق', specialist: 'متخصص', admin: 'مدير',
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
    { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: '#3b82f6' },
    { label: 'المحترفين', value: stats.totalProfessionals, icon: Scissors, color: '#8b5cf6' },
    { label: 'إجمالي الحجوزات', value: stats.totalBookings, icon: Calendar, color: '#10b981' },
    { label: 'إجمالي المدفوعات', value: stats.totalPayments, icon: CreditCard, color: '#f59e0b' },
    { label: 'إيصالات CCP معلقة', value: stats.pendingCCPReceipts, icon: Clock, color: '#ef4444' },
    { label: 'مدفوعات Stripe', value: stats.stripePayments, icon: DollarSign, color: '#6366f1' },
    { label: 'مراجعات معلقة', value: stats.pendingReviews, icon: Star, color: '#f97316' },
    { label: 'إجمالي الإيرادات', value: `${stats.totalRevenue.toLocaleString()} د.ج`, icon: TrendingUp, color: '#059669' },
  ];

  const quickActions = [
    { label: 'مراجعة المدفوعات المعلقة', action: () => setActiveSection('payments'), icon: CreditCard },
    { label: 'إدارة المراجعات', action: () => setActiveSection('reviews'), icon: Star },
    { label: 'إدارة المستخدمين', action: () => setActiveSection('users'), icon: Users },
    { label: 'إدارة الحجوزات', action: () => setActiveSection('bookings'), icon: Calendar },
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
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${card.color}20` }}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>{card.value}</p>
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{card.label}</p>
            </div>
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
const ROLE_OPTIONS = ['client', 'barber', 'specialist', 'moderator', 'admin'];
const ROLE_LABELS: Record<string, string> = { client: 'عميل', barber: 'حلاق', specialist: 'متخصص', moderator: 'مشرف محتوى', admin: 'مدير' };

interface PendingPaymentRow {
  id: string;
  amount: number | null;
  provider: string | null;
  created_at: string | null;
  metadata: unknown;
  receipt_url?: string | null;
}

function AdminSection({ section, adminId, onBack }: { section: 'users' | 'bookings' | 'payments' | 'reviews'; adminId: string; onBack: () => void }) {
  const { themeConfig } = useApp();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [payments, setPayments] = useState<PendingPaymentRow[]>([]);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (section === 'users') setUsers(await adminListProfiles());
      else if (section === 'reviews') setReviews(await adminListPendingReviews());
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  const titles: Record<string, string> = { users: 'إدارة المستخدمين', bookings: 'إدارة الحجوزات', payments: 'مراجعة المدفوعات', reviews: 'إدارة المراجعات' };

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

        {!loading && section === 'bookings' && (
          <p className="text-sm text-center py-6" style={{ color: themeConfig.colors.textMuted }}>تُدار الحجوزات من طرف الحلاقين من تبويب المواعيد.</p>
        )}
      </div>
    </div>
  );
}
