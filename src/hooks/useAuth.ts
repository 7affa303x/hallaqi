import { useState, useEffect, useCallback } from 'react';
import { supabase, isDeveloperMode } from '@/supabase/client';
import { signIn, signUp, signOut, resetPassword, fetchUserProfile } from '@/supabase/auth';
import type { Profile } from '@/types/supabase-aliases';
import type { Session, User } from '@supabase/supabase-js';

function getErrMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

export interface AuthState {
  user: User | null;
  appUser: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  session: Session | null;
}

const INITIAL_STATE: AuthState = {
  user: null,
  appUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  session: null,
};

/** Build a complete default client profile for a freshly-authenticated user. */
function createDefaultProfile(user: User): Profile {
  return {
    id: user.id,
    username: null,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'مستخدم',
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
}

// Dev mode mock profile aligned with Live DB schema
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

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  /* ---- Restore session on mount ---- */
  useEffect(() => {
    let mounted = true;

    if (isDeveloperMode) {
      if (mounted) {
        setState(s => ({
          ...s,
          user: { id: 'dev-user', email: 'developer@example.com', aud: 'authenticated', role: 'authenticated' } as User,
          appUser: DEV_PROFILE,
          isLoading: false,
          isAuthenticated: true,
          error: null,
          session: { user: { id: 'dev-user', email: 'developer@example.com', aud: 'authenticated', role: 'authenticated' } as User } as Session,
        }));
      }
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          if (!mounted) return;
          if (profile) {
            setState({
              user: session.user,
              appUser: profile,
              isLoading: false,
              isAuthenticated: true,
              error: null,
              session,
            });
          } else {
            // Profile doesn't exist - create it
            const newProfile = createDefaultProfile(session.user);
            Promise.resolve(supabase.from('profiles').insert(newProfile).select().single()).then(({ data }) => {
              if (!mounted) return;
              setState({
                user: session.user,
                appUser: data || newProfile,
                isLoading: false,
                isAuthenticated: true,
                error: null,
                session,
              });
            }).catch(() => {
              if (mounted) setState(s => ({ ...s, isLoading: false, isAuthenticated: true, user: session.user, session }));
            });
          }
        }).catch(() => {
          if (mounted) setState(s => ({ ...s, isLoading: false, isAuthenticated: false }));
        });
      } else {
        setState(s => ({ ...s, isLoading: false, isAuthenticated: false }));
      }
    }).catch(() => {
      if (mounted) setState(s => ({ ...s, isLoading: false, isAuthenticated: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          if (!mounted) return;
          if (profile) {
            setState({
              user: session.user,
              appUser: profile,
              isLoading: false,
              isAuthenticated: true,
              error: null,
              session,
            });
          } else {
            // Profile doesn't exist - create it
            const newProfile = createDefaultProfile(session.user);
            Promise.resolve(supabase.from('profiles').insert(newProfile).select().single()).then(({ data }) => {
              if (!mounted) return;
              setState({
                user: session.user,
                appUser: data || newProfile,
                isLoading: false,
                isAuthenticated: true,
                error: null,
                session,
              });
            }).catch(() => {
              if (mounted) setState(s => ({ ...s, isLoading: false, isAuthenticated: true, user: session.user, session }));
            });
          }
        }).catch(() => {
          if (mounted) setState({
            user: null, appUser: null, isLoading: false,
            isAuthenticated: false, error: null, session: null,
          });
        });
      } else {
        setState({
          user: null, appUser: null, isLoading: false,
          isAuthenticated: false, error: null, session: null,
        });
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  /* ---- Sign In ---- */
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

  /* ---- Sign Up ---- */
  const register = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    accountType: 'client' | 'barber' = 'client'
  ) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    if (isDeveloperMode) {
      setState(s => ({ ...s, isLoading: false, isAuthenticated: true, user: { id: 'dev-user' } as User, appUser: { ...DEV_PROFILE, full_name: displayName } }));
      return { user: { id: 'dev-user' } as User, session: null };
    }
    try {
      const { user, session } = await signUp(email, password, displayName, accountType);
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

  /* ---- Google Sign In ---- */
  const googleSignIn = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    if (isDeveloperMode) {
      setState(s => ({ ...s, isLoading: false, isAuthenticated: true, user: { id: 'dev-user' } as User, appUser: DEV_PROFILE }));
      return { data: { url: window.location.origin }, error: null };
    }
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      setState(s => ({ ...s, isLoading: true }));
      return data;
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: getErrMsg(err) }));
      throw err;
    }
  }, []);

  /* ---- Sign Out ---- */
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

  /* ---- Password Reset ---- */
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

  /* ---- Clear error ---- */
  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    login,
    register,
    googleSignIn,
    logout,
    forgotPassword,
    clearError,
  };
}
