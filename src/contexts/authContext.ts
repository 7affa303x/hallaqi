import { createContext } from 'react';
import type { Profile } from '@/types/supabase-aliases';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  appUser: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  session: Session | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    accountType?: 'client' | 'barber' | 'store' | 'doctor',
    phoneNumber?: string | null,
  ) => Promise<{ user: User | null; session: Session | null }>;
  googleSignIn: () => Promise<unknown>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
