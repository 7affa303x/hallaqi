import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl.startsWith('http') || supabaseUrl.length < 20 || supabaseKey.length < 20) {
    return false;
  }
  if (supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
    return false;
  }
  if (supabaseKey.includes('your_') || supabaseKey === 'placeholder') {
    return false;
  }
  return true;
};

export const isDeveloperMode = (() => {
  if (!import.meta.env.DEV) return false;
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem('hallaqi_dev_mode') === 'true';
  } catch {
    return false;
  }
})();

export function toggleDeveloperMode() {
  if (!import.meta.env.DEV) return;
  try {
    const current = localStorage.getItem('hallaqi_dev_mode') === 'true';
    localStorage.setItem('hallaqi_dev_mode', (!current).toString());
    window.location.reload();
  } catch {
    // ignore
  }
}

export const supabase = isSupabaseConfigured()
  ? createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : createClient<Database>('https://placeholder.supabase.co', 'placeholder', {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

/** @deprecated Use table names directly from Database types instead */
export const TABLES = {
  PROFILES: 'profiles',
  PROFESSIONALS: 'professionals',
  SERVICES: 'services',
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  AVAILABILITY_SCHEDULES: 'availability_schedules',
  AVAILABILITY_EXCEPTIONS: 'availability_exceptions',
  PORTFOLIO_ITEMS: 'portfolio_items',
  CONVERSATIONS: 'conversations',
  CONVERSATION_MEMBERS: 'conversation_members',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  FORUM_CATEGORIES: 'forum_categories',
  FORUM_POSTS: 'forum_posts',
  FORUM_COMMENTS: 'forum_comments',
  FORUM_LIKES: 'forum_likes',
  FORUM_REPORTS: 'forum_reports',
} as const;

export const STORAGE = {
  AVATARS: 'avatars',
  COVERS: 'covers',
  PORTFOLIO: 'portfolio',
  REVIEWS: 'review-images',
  FORUM: 'forum-images',
  ID_CARDS: 'id-cards',
  PAYMENT_RECEIPTS: 'payment-receipts',
} as const;

export default supabase;
