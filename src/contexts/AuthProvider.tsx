import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase, isDeveloperMode } from '@/supabase/client';
import { signIn, signUp, signOut, resetPassword, fetchUserProfile } from '@/supabase/auth';
import { getAuthRedirectUrl } from '@/lib/authRedirect';
import { AuthContext, type AuthContextValue, type AuthState } from '@/contexts/authContext';
import type { Profile } from '@/types/supabase-aliases';
import type { Session, User } from '@supabase/supabase-js';

function getErrMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

function clearStaleAuthStorage() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage may be unavailable in private browser contexts.
  }
}

const INITIAL_STATE: AuthState = {
  user: null,
  appUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  session: null,
};

const DEV_PROFILE: Profile = {
  id: 'dev-user',
  username: null,
  full_name: 'Developer',
  avatar_url: null,
  website: null,
  phone_number: null,
  address: null,
  city: null,
  country: null,
  user_role: 'client',
  user_status: 'active',
  verification_status: 'unverified',
  updated_at: new Date().toISOString(),
};

/**
 * Single shared auth state for the whole app.
 * Previous useAuth() created a fresh isLoading/false session per component —
 * that caused LoginScreen to flash on every navigation.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  useEffect(() => {
    let mounted = true;

    if (isDeveloperMode) {
      if (mounted) {
        setState({
          user: { id: 'dev-user', email: 'developer@example.com', aud: 'authenticated', role: 'authenticated' } as User,
          appUser: DEV_PROFILE,
          isLoading: false,
          isAuthenticated: true,
          error: null,
          session: { user: { id: 'dev-user', email: 'developer@example.com', aud: 'authenticated', role: 'authenticated' } as User } as Session,
        });
      }
      return;
    }

    const applySession = async (session: Session | null) => {
      if (!mounted) return;
      if (!session?.user) {
        setState({
          user: null, appUser: null, isLoading: false,
          isAuthenticated: false, error: null, session: null,
        });
        return;
      }
      try {
        let profile: Profile | null = null;
        for (let attempt = 0; attempt < 3 && !profile; attempt += 1) {
          profile = await fetchUserProfile(session.user.id);
          if (!profile && attempt < 2) {
            await new Promise(resolve => window.setTimeout(resolve, 150 * (attempt + 1)));
          }
        }
        if (!mounted) return;
        setState({
          user: session.user,
          appUser: profile,
          isLoading: false,
          isAuthenticated: true,
          error: profile ? null : 'تعذر تحميل ملف الحساب. حاول تحديث الصفحة.',
          session,
        });
      } catch {
        // Keep session authenticated — a profile fetch blip must not flash LoginScreen.
        if (mounted) {
          setState({
            user: session.user,
            appUser: null,
            isLoading: false,
            isAuthenticated: true,
            error: 'تعذر تحميل ملف الحساب. حاول تحديث الصفحة.',
            session,
          });
        }
      }
    };

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          clearStaleAuthStorage();
          return applySession(null);
        }
        return applySession(session);
      })
      .catch(() => {
        clearStaleAuthStorage();
        if (mounted) setState(s => ({ ...s, isLoading: false, isAuthenticated: false }));
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // getSession already applied the initial session — avoid a second paint that can flash Login UI.
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT' || !session) {
        void applySession(null);
        return;
      }
      void applySession(session);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    if (isDeveloperMode) {
      setState(s => ({ ...s, isLoading: false, isAuthenticated: true, user: { id: 'dev-user' } as User, appUser: DEV_PROFILE }));
      return;
    }
    try {
      const { session } = await signIn(email, password);
      const appUser = session?.user ? await fetchUserProfile(session.user.id) : null;
      setState({
        user: session?.user || null,
        appUser,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        session,
      });
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: getErrMsg(err) }));
      throw err;
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    accountType: 'client' | 'barber' | 'store' | 'company' | 'doctor' = 'client',
    phoneNumber?: string | null,
  ) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    if (isDeveloperMode) {
      setState(s => ({
        ...s,
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'dev-user' } as User,
        appUser: { ...DEV_PROFILE, full_name: displayName, phone_number: phoneNumber || null },
      }));
      return { user: { id: 'dev-user' } as User, session: null };
    }
    try {
      const { user, session } = await signUp(email, password, displayName, accountType, phoneNumber);
      const profile = session?.user ? await fetchUserProfile(session.user.id) : null;
      setState(s => ({
        ...s,
        user: session?.user || null,
        appUser: profile,
        session,
        isLoading: false,
        isAuthenticated: !!session,
      }));
      return { user, session };
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: getErrMsg(err) }));
      throw err;
    }
  }, []);

  const googleSignIn = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    if (isDeveloperMode) {
      setState(s => ({ ...s, isLoading: false, isAuthenticated: true, user: { id: 'dev-user' } as User, appUser: DEV_PROFILE }));
      return { data: { url: window.location.origin }, error: null };
    }
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getAuthRedirectUrl('/') },
      });
      if (error) throw error;
      setState(s => ({ ...s, isLoading: true }));
      return data;
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: getErrMsg(err) }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));
    if (isDeveloperMode) {
      setState(s => ({ ...s, isLoading: false, isAuthenticated: false, user: null, appUser: null }));
      return;
    }
    try {
      await signOut();
      setState({
        user: null, appUser: null, isLoading: false,
        isAuthenticated: false, error: null, session: null,
      });
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: getErrMsg(err) }));
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    if (isDeveloperMode) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    try {
      await resetPassword(email);
      setState(s => ({ ...s, isLoading: false }));
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: getErrMsg(err) }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    register,
    googleSignIn,
    logout,
    forgotPassword,
    clearError,
  }), [state, login, register, googleSignIn, logout, forgotPassword, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
