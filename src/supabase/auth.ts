import { supabase, isSupabaseConfigured } from './client';
import type { Profile } from '@/types/supabase-aliases';
import { getAuthRedirectUrl } from '@/lib/authRedirect';

function getAuthErrorMessage(err: { message?: string; code?: string; status?: number }): string {
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';

  // Check specific error codes/messages before the broad "email" match below,
  // otherwise messages that merely contain the word "email" (e.g. the
  // "email rate limit exceeded" throttling error) get mislabelled.
  if (code === 'over_email_send_rate_limit' || msg.includes('email rate limit')) {
    return 'تم تجاوز حد إرسال البريد. انتظر دقيقة ثم حاول مرة أخرى.';
  }
  if (code === 'over_request_rate_limit' || msg.includes('rate limit')) {
    return 'طلبات كثيرة لتسجيل الدخول. انتظر نحو دقيقة ثم حاول مجدداً.';
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (code === 'user_not_found' || msg.includes('user not found')) return 'لا يوجد حساب بهذا البريد';
  if (code === 'email_exists' || msg.includes('already registered') || msg.includes('already been registered')) return 'هذا البريد مسجل بالفعل';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  if (code === 'weak_password' || msg.includes('password')) return 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل';
  if (code === 'invalid_email' || msg.includes('invalid email') || msg.includes('unable to validate email')) return 'البريد الإلكتروني غير صالح';
  if (code === 'session_expired' || msg.includes('expired')) return 'انتهت الجلسة. سجل الدخول مرة أخرى';
  if (err.status === 0 || msg.includes('network') || msg.includes('failed to fetch')) return 'فشل الاتصال بالشبكة. تحقق من اتصالك';

  return 'حدث خطأ. حاول مرة أخرى';
}

/* ========== SIGN UP ========== */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  accountType: 'client' | 'barber' | 'store' | 'company' | 'doctor' = 'client'
) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, account_type: accountType } },
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
    redirectTo: getAuthRedirectUrl('/reset-password'),
  });
  if (error) throw new Error(getAuthErrorMessage(error));
}

/* ========== USER PROFILE ========== */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const ownProfile = await supabase.rpc('get_own_profile');
  if (!ownProfile.error) return ownProfile.data?.id === userId ? ownProfile.data : null;
  // Safe rollout fallback until the profile privacy migration is applied.
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return error ? null : data;
}

/* ========== UPDATE PROFILE ========== */
export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(getAuthErrorMessage(error));
  return fetchUserProfile(userId);
}

export { supabase };
