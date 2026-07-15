import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl.length > 10 && supabaseKey.length > 10 && supabaseUrl.startsWith('http');
};

export const isDeveloperMode = !isSupabaseConfigured();

export const supabase = isSupabaseConfigured()
  ? createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
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
  REVIEWS: 'reviews',
} as const;

export default supabase;
