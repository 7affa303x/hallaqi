import { supabase, isSupabaseConfigured } from './client';
import type { Profile } from '@/types/supabase';

function getAuthErrorMessage(err: { message?: string; code?: string; status?: number }): string {
  const msg = err.message || '';
  const code = err.code || '';

  if (code === 'invalid_credentials' || msg.includes('Invalid login')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (code === 'user_not_found' || msg.includes('user not found')) return 'لا يوجد حساب بهذا البريد';
  if (code === 'email_exists' || msg.includes('already registered')) return 'هذا البريد مسجل بالفعل';
  if (code === 'weak_password' || msg.includes('password')) return 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل';
  if (code === 'invalid_email' || msg.includes('email')) return 'البريد الإلكتروني غير صالح';
  if (code === 'session_expired' || msg.includes('expired')) return 'انتهت الجلسة. سجل الدخول مرة أخرى';
  if (err.status === 0 || msg.includes('network')) return 'فشل الاتصال بالشبكة. تحقق من اتصالك';
  if (code === 'over_email_send_rate_limit') return 'طلبات كثيرة. حاول لاحقاً';

  return 'حدث خطأ. حاول مرة أخرى';
}

/* ========== SIGN UP ========== */
export async function signUp(email: string, password: string, fullName: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw new Error(getAuthErrorMessage(error));

  // The profile row is created by the handle_new_user trigger using the
  // full_name we pass in user_metadata above. Syncing it again here is
  // best-effort only and MUST NOT be awaited: awaiting a PostgREST request
  // immediately after an auth call deadlocks on the browser auth lock and
  // leaves the sign-up UI hanging. Fire-and-forget instead.
  if (data.user) {
    void supabase.from('profiles').update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    }).eq('id', data.user.id).then(() => {}, () => {});
  }
  return data;
}

/* ========== SIGN IN ========== */
export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(getAuthErrorMessage(error));

  // Best-effort "last active" bump — fire-and-forget for the same auth-lock
  // reason described in signUp(); never block the sign-in flow on it.
  if (data.user) {
    void supabase.from('profiles').update({
      updated_at: new Date().toISOString(),
    }).eq('id', data.user.id).then(() => {}, () => {});
  }
  return data;
}

/* ========== SIGN OUT ========== */
export async function signOut() {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(getAuthErrorMessage(error));
}

/* ========== PASSWORD RESET ========== */
export async function resetPassword(email: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(getAuthErrorMessage(error));
}

/* ========== USER PROFILE ========== */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

/* ========== UPDATE PROFILE ========== */
export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(getAuthErrorMessage(error));
  return data;
}

/* ========== GOOGLE OAUTH ========== */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw new Error(getAuthErrorMessage(error));
  return data;
}

export { supabase };
