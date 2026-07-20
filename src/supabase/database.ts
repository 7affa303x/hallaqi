import { supabase, isSupabaseConfigured } from './client';
import type { Database } from '../types/supabase';

import type {
  Profile, Professional, Service, Review, Favorite,
  AvailabilitySchedule, AvailabilityException, PortfolioItem,
  Message, Notification,
  ForumPost, ForumComment, ForumCategory
} from '@/types/supabase-aliases';
import type { Json } from '@/types/supabase';
import type { AppSettings } from '@/types';
import { transformToBarber } from '@/lib/utils';

function guard(): void {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');
}

/* ========== PROFILES ========== */

export async function getProfile(userId: string): Promise<Profile | null> {
  guard();
  const ownProfile = await supabase.rpc('get_own_profile');
  if (!ownProfile.error) return ownProfile.data?.id === userId ? ownProfile.data : null;
  // Safe rollout fallback: removed after the privacy migration is deployed.
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

type EditableProfile = Pick<
  Profile,
  'username' | 'full_name' | 'avatar_url' | 'website' | 'phone_number'
  | 'address' | 'city' | 'country'
>;

export async function updateProfile(userId: string, updates: Partial<EditableProfile>) {
  guard();
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return getProfile(userId);
}

export async function exportUserData(userId: string) {
  guard();
  const [
    profile,
    bookings,
    reviews,
    favorites,
    notifications,
    settings,
    forumPosts,
    forumComments,
  ] = await Promise.all([
    getProfile(userId),
    supabase.from('bookings').select('*').eq('client_id', userId),
    supabase.from('reviews').select('*').eq('reviewer_id', userId),
    supabase.from('favorites').select('*').eq('user_id', userId),
    supabase.from('notifications').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('forum_posts').select('*').eq('author_id', userId),
    supabase.from('forum_comments').select('*').eq('author_id', userId),
  ]);
  const error = [bookings, reviews, favorites, notifications, settings, forumPosts, forumComments]
    .find(result => result.error)?.error;
  if (error) throw new Error(error.message);
  return {
    exported_at: new Date().toISOString(),
    profile,
    bookings: bookings.data || [],
    reviews: reviews.data || [],
    favorites: favorites.data || [],
    notifications: notifications.data || [],
    settings: settings.data,
    forum_posts: forumPosts.data || [],
    forum_comments: forumComments.data || [],
  };
}

export async function deleteCurrentAccount() {
  guard();
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error || data?.success !== true) {
    throw new Error(error?.message || 'تعذر حذف الحساب');
  }
}

/* ========== PROFESSIONALS ========== */

export async function getProfessionals(filters?: { city?: string; search?: string; category?: string }) {
  guard();
  let query = supabase
    .from('professionals')
    .select('*, profiles(full_name, avatar_url, city, user_role, verification_status), services(*), availability_schedules(*)')
    .eq('is_active', true)
    .limit(50)
    .order('average_rating', { ascending: false });

  if (filters?.city) {
    query = query.filter('profiles.city', 'eq', filters.city);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(transformToBarber);
}

export async function getProfessionalById(id: string) {
  guard();
  const { data, error } = await supabase
    .from('professionals')
    .select('*, profiles(id, username, full_name, avatar_url, website, city, country, user_role, user_status, verification_status, updated_at), services(*), portfolio_items(*), availability_schedules(*), reviews(*, profiles!reviews_reviewer_id_fkey(full_name, avatar_url, user_role, verification_status))')
    .eq('id', id)
    .single();
  if (error) return null;
  return data ? transformToBarber(data) : null;
}

export async function updateProfessionalProfile(proId: string, updates: Partial<Professional>) {
  guard();
  const { data, error } = await supabase
    .from('professionals')
    .update(updates)
    .eq('id', proId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function completeBarberOnboarding() {
  guard();
  const { error } = await supabase.rpc('complete_barber_onboarding');
  if (error) throw new Error(error.message);
}

export async function getProfessionalWithProfile(proId: string) {
  guard();
  const { data, error } = await supabase
    .from('professionals')
    .select('id, business_name, profiles(full_name)')
    .eq('id', proId)
    .single();
  if (error) return null;
  return data;
}

export async function getProfessionalMetrics(proId: string) {
  guard();
  const { data, error } = await supabase.rpc('get_professional_metrics', {
    professional: proId,
  });
  if (error) throw new Error(error.message);
  return data?.[0] || {
    average_response_minutes: 0,
    acceptance_rate: 0,
    completed_bookings: 0,
  };
}

export async function getProfileById(userId: string) {
  guard();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

/* ========== SERVICES ========== */

export async function getProfessionalServices(proId: string): Promise<Service[]> {
  guard();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('professional_id', proId)
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) {
  guard();
  const { data, error } = await supabase.from('services').insert(service).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateService(serviceId: string, updates: Partial<Service>) {
  guard();
  const { data, error } = await supabase
    .from('services')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', serviceId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteService(serviceId: string) {
  guard();
  const { error } = await supabase
    .from('services')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', serviceId);
  if (error) throw new Error(error.message);
}

/* ========== BOOKINGS ========== */

export async function getClientBookings(clientId: string, statusFilter?: (Database["public"]["Enums"]["booking_status"])[] | null) {
  guard();
  let query = supabase
    .from('bookings')
    .select('*, professionals(*, profiles(full_name, avatar_url)), services!bookings_service_id_fkey(*), booking_services(*, services!booking_services_service_id_fkey(*)), reviews(id, rating)')
    .eq('client_id', clientId)
    .order('booking_start_time', { ascending: false });
  if (statusFilter?.length) query = query.in('status', statusFilter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getProfessionalBookings(proId: string, statusFilter?: (Database["public"]["Enums"]["booking_status"])[] | null) {
  guard();
  let query = supabase
    .from('bookings')
    .select('*, profiles(id, full_name, avatar_url, city, user_role, user_status, verification_status), services!bookings_service_id_fkey(*), booking_services(*, services!booking_services_service_id_fkey(*))')
    .eq('professional_id', proId)
    .order('booking_start_time', { ascending: false });
  if (statusFilter?.length) query = query.in('status', statusFilter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createBooking(booking: Database['public']['Tables']['bookings']['Insert']) {
  guard();
  const { data, error } = await supabase.from('bookings').insert(booking).select().single();
  if (error) {
    // Handle duplicate key constraint - find and return existing booking
    if (error.code === '23505' && error.message.includes('idx_bookings_no_double_booking')) {
      // Find the existing booking for this slot and reuse if same client
      const { data: existing } = await supabase
        .from('bookings')
        .select('*')
        .eq('professional_id', booking.professional_id as string)
        .eq('booking_start_time', booking.booking_start_time as string)
        .neq('status', 'cancelled' as never)
        .neq('status', 'no_show' as never)
        .single();
      if (existing) {
        // If the existing booking belongs to the same client, reuse it
        if (existing.client_id === booking.client_id) {
          return existing;
        }
        // Otherwise, the slot is genuinely taken
        throw new Error('هذا الوقت محجوز بالفعل. يرجى اختيار وقت آخر.');
      }
    }
    throw new Error(error.message);
  }
  return data;
}

/** Desk / walk-in booking created by the professional (no app client). */
export async function createWalkInBooking(params: {
  serviceIds: string[];
  startsAt?: string;
  guestName?: string;
  note?: string;
  paymentMethod?: string;
  markCompleted?: boolean;
}) {
  guard();
  const { data, error } = await supabase.rpc('create_walk_in_booking', {
    selected_services: params.serviceIds,
    starts_at: params.startsAt || new Date().toISOString(),
    guest_name: params.guestName || undefined,
    note: params.note || undefined,
    payment_method_name: params.paymentMethod || 'cash',
    mark_completed: params.markCompleted ?? false,
  });
  if (error) {
    if (error.message.includes('create_walk_in_booking') || error.code === 'PGRST202') {
      throw new Error('ميزة العميل المباشر تحتاج تحديث قاعدة البيانات. طبّق الـ migration أولاً.');
    }
    throw new Error(error.message);
  }
  return data;
}

export async function createBookingWithServices(params: {
  professionalId: string;
  serviceIds: string[];
  /** Preferred day — barber will set the real clock time when accepting. */
  preferredDate: string;
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
  note?: string;
  paymentMethod: string;
  isMobileService: boolean;
  mobileAddress?: string;
  voucherCode?: string;
}) {
  guard();
  // RPC still takes starts_at; we pass noon on the preferred date as a soft placeholder.
  const startsAt = `${params.preferredDate}T12:00:00`;
  const { data, error } = await supabase.rpc('create_booking_with_services', {
    professional: params.professionalId,
    selected_services: params.serviceIds,
    starts_at: startsAt,
    note: params.note || undefined,
    payment_method_name: params.paymentMethod,
    mobile_service: params.isMobileService,
    mobile_address: params.mobileAddress || undefined,
    loyalty_voucher: params.voucherCode || undefined,
    preferred_period: params.preferredTimeOfDay || 'any',
  });
  if (error) {
    if (error.message?.includes('PHONE_REQUIRED') || error.code === 'P0001') {
      throw new Error('PHONE_REQUIRED');
    }
    if (error.code === '23P01' || error.code === '23505') {
      throw new Error('تعذر إرسال الطلب. حاول مرة أخرى.');
    }
    throw new Error(error.message);
  }
  return data;
}

export async function acceptBookingWithTime(bookingId: string, startsAt: string) {
  guard();
  const { data, error } = await supabase.rpc('accept_booking_with_time', {
    booking: bookingId,
    starts_at: startsAt,
  });
  if (error) {
    if (error.message?.includes('SLOT_TAKEN') || error.code === '23P01') {
      throw new Error('هذا الوقت محجوز. اختر وقتاً آخر.');
    }
    throw new Error(error.message);
  }
  return data;
}

export async function getBookingClientPhone(bookingId: string): Promise<string | null> {
  guard();
  const { data, error } = await supabase.rpc('get_booking_client_phone', {
    booking: bookingId,
  });
  if (error) {
    // Soft-fail until migration is applied.
    if (error.code === 'PGRST202' || error.message.includes('get_booking_client_phone')) {
      return null;
    }
    throw new Error(error.message);
  }
  return typeof data === 'string' && data.trim() ? data.trim() : null;
}

export async function updateBookingStatus(bookingId: string, status: Database["public"]["Enums"]["booking_status"]) {
  guard();
  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) throw new Error(error.message);
}

export async function updateBookingStatusWithReturn(
  bookingId: string,
  status: Database["public"]["Enums"]["booking_status"]
) {
  guard();
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getBookingById(bookingId: string) {
  guard();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, professionals(*, profiles(full_name, avatar_url)), profiles!bookings_client_id_fkey(full_name, avatar_url)')
    .eq('id', bookingId)
    .single();
  if (error) return null;
  return data;
}

/** Check if a time slot is available for a professional */
export async function isSlotAvailable(
  professionalId: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  guard();
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('professional_id', professionalId)
    .not('status', 'in', '(cancelled,no_show)')
    .lt('booking_start_time', endTime)
    .gt('booking_end_time', startTime);

  if (error) throw new Error(error.message);
  return (data || []).length === 0;
}

/* ========== AVAILABILITY ========== */

export async function getProfessionalSchedules(proId: string): Promise<AvailabilitySchedule[]> {
  guard();
  const { data, error } = await supabase
    .from('availability_schedules')
    .select('*')
    .eq('professional_id', proId)
    .eq('is_active', true)
    .order('day_of_week');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateProfessionalSchedules(
  proId: string,
  schedules: Omit<AvailabilitySchedule, 'id' | 'created_at' | 'updated_at'>[]
) {
  guard();
  // Delete existing schedules
  await supabase.from('availability_schedules').delete().eq('professional_id', proId);
  // Insert new schedules
  const { data, error } = await supabase
    .from('availability_schedules')
    .insert(schedules.map(s => ({ ...s, professional_id: proId })))
    .select();
  if (error) throw new Error(error.message);
  return data;
}

export async function getProfessionalExceptions(proId: string, fromDate?: string, toDate?: string) {
  guard();
  let query = supabase
    .from('availability_exceptions')
    .select('*')
    .eq('professional_id', proId)
    .order('date');
  if (fromDate) query = query.gte('date', fromDate);
  if (toDate) query = query.lte('date', toDate);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as AvailabilityException[];
}

export async function addAvailabilityException(exception: Omit<AvailabilityException, 'id' | 'created_at' | 'updated_at'>) {
  guard();
  const { data, error } = await supabase.from('availability_exceptions').insert(exception).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAvailabilityException(exceptionId: string) {
  guard();
  const { error } = await supabase.from('availability_exceptions').delete().eq('id', exceptionId);
  if (error) throw new Error(error.message);
}

/* ========== REVIEWS ========== */

export async function getProfessionalReviews(proId: string): Promise<Review[]> {
  guard();
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('professional_id', proId)
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as (Review & { profiles?: Profile })[];
}

export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at' | 'is_public' | 'moderation_status'>) {
  guard();
  const { data, error } = await supabase
    .from('reviews')
    .insert({ ...review, is_public: true, moderation_status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ========== FAVORITES ========== */

export async function toggleFavorite(userId: string, professionalId: string, isFav: boolean) {
  guard();
  if (isFav) {
    const { error } = await supabase.from('favorites').insert({ user_id: userId, professional_id: professionalId });
    if (error && !error.message.includes('duplicate')) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('professional_id', professionalId);
    if (error) throw new Error(error.message);
  }
}

export async function getFavorites(userId: string) {
  guard();
  const { data, error } = await supabase
    .from('favorites')
    .select('*, professionals(*, profiles(full_name, avatar_url))')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data || []) as (Favorite & { professionals?: Professional & { profiles?: Profile } })[];
}

export async function isFavorited(userId: string, professionalId: string): Promise<boolean> {
  guard();
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('professional_id', professionalId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/* ========== PORTFOLIO ========== */

export async function getPortfolioItems(proId: string): Promise<PortfolioItem[]> {
  guard();
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('professional_id', proId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addPortfolioItem(item: Omit<PortfolioItem, 'id' | 'created_at'>) {
  guard();
  const { data, error } = await supabase.from('portfolio_items').insert(item).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePortfolioItem(itemId: string) {
  guard();
  const { error } = await supabase.from('portfolio_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function updatePortfolioItem(itemId: string, updates: Partial<PortfolioItem>) {
  guard();
  const { data, error } = await supabase
    .from('portfolio_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ========== NOTIFICATIONS / EDGE FUNCTIONS ========== */

/**
 * Send a notification via the send-notification Edge Function
 */
export async function sendNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, Json | undefined>;
}) {
  guard();
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        metadata: params.metadata || {},
      },
    });
    if (error) {
      console.error('sendNotification edge function error:', error);
      return false;
    }
    return data?.success === true;
  } catch (err) {
    console.error('sendNotification failed:', err);
    return false;
  }
}

/* ========== CHAT / MESSAGING ========== */

export async function getOrCreateConversation(user1Id: string, user2Id: string): Promise<string> {
  guard();
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    user1_id: user1Id,
    user2_id: user2Id,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserConversations() {
  guard();
  const { data, error } = await supabase.rpc('get_user_conversations');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getBlockedUsers(userId: string) {
  guard();
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id, created_at, profiles!user_blocks_blocked_id_fkey(full_name, avatar_url)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function blockUser(blockerId: string, blockedId: string) {
  guard();
  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function unblockUser(blockerId: string, blockedId: string) {
  guard();
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw new Error(error.message);
}

export async function getConversationMessages(conversationId: string, limit = 50): Promise<Message[]> {
  guard();
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(full_name, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as (Message & { profiles?: Profile })[];
}

export async function sendMessage(message: Omit<Message, 'id' | 'created_at' | 'updated_at'>) {
  guard();
  const { data, error } = await supabase.from('messages').insert(message).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
  guard();
  await supabase.rpc('mark_conversation_messages_as_read', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });
}

/* ========== NOTIFICATIONS ========== */

export async function getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
  guard();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Directly insert a notification into the notifications table
 */
export async function insertNotification(notification: {
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata?: unknown;
}) {
  guard();
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: (notification.metadata as unknown as Json) || null,
      read: false,
    })
    .select()
    .single();
  if (error) {
    console.error('insertNotification error:', error);
    return null;
  }
  return data;
}

export async function markNotificationRead(notificationId: string) {
  guard();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string) {
  guard();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw new Error(error.message);
}

export async function upsertPushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  guard();
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    throw new Error('بيانات اشتراك الإشعارات غير مكتملة');
  }
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: navigator.userAgent,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(endpoint: string) {
  guard();
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);
  if (error) throw new Error(error.message);
}

export async function getUserSettings(userId: string): Promise<Partial<AppSettings> | null> {
  guard();
  const { data, error } = await supabase
    .from('user_settings')
    .select('notification_preferences, privacy_preferences, accessibility_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    notifications: data.notification_preferences as unknown as AppSettings['notifications'],
    privacy: data.privacy_preferences as unknown as AppSettings['privacy'],
    accessibility: data.accessibility_preferences as unknown as AppSettings['accessibility'],
  };
}

export async function upsertUserSettings(userId: string, settings: AppSettings) {
  guard();
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    notification_preferences: settings.notifications as unknown as Json,
    privacy_preferences: settings.privacy as unknown as Json,
    accessibility_preferences: settings.accessibility as unknown as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export async function createIdVerificationRequest(userId: string, documentPath: string) {
  guard();
  const { data, error } = await supabase
    .from('id_verification_requests')
    .insert({ user_id: userId, document_path: documentPath, status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLatestIdVerificationRequest(userId: string) {
  guard();
  const { data, error } = await supabase
    .from('id_verification_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function reportProfessional(params: {
  reporterId: string;
  professionalId: string;
  reason: string;
}) {
  guard();
  const { error } = await supabase.from('professional_reports').insert({
    reporter_id: params.reporterId,
    professional_id: params.professionalId,
    reason: params.reason,
  });
  if (error) throw new Error(error.message);
}

export async function getSubscriptionPlans() {
  guard();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_dzd');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getLatestSubscriptionRequest(userId: string) {
  guard();
  const { data, error } = await supabase
    .from('subscription_requests')
    .select('*, subscription_plans(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSubscriptionRequest(userId: string, planId: string) {
  guard();
  const { data, error } = await supabase
    .from('subscription_requests')
    .insert({ user_id: userId, plan_id: planId, status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLoyaltyDashboard(userId: string) {
  guard();
  const [account, transactions, rewards, redemptions] = await Promise.all([
    supabase.from('loyalty_accounts').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('loyalty_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('loyalty_rewards').select('*').eq('is_active', true).order('points_cost'),
    supabase.from('loyalty_redemptions').select('*, loyalty_rewards(*)').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);
  const error = [account, transactions, rewards, redemptions].find(result => result.error)?.error;
  if (error) throw new Error(error.message);
  return {
    account: account.data,
    transactions: transactions.data || [],
    rewards: rewards.data || [],
    redemptions: redemptions.data || [],
  };
}

export async function redeemLoyaltyReward(rewardId: string): Promise<string> {
  guard();
  const { data, error } = await supabase.rpc('redeem_loyalty_reward', { reward: rewardId });
  if (error) throw new Error(error.message);
  return data;
}

/* ========== FORUM ========== */

export async function getForumCategories(): Promise<ForumCategory[]> {
  guard();
  const { data, error } = await supabase
    .from('forum_categories')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getForumPosts(categorySlug?: string) {
  guard();
  let query = supabase
    .from('forum_posts')
    .select('*, profiles(full_name, avatar_url, user_role, verification_status), forum_categories(name, slug, color)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (categorySlug && categorySlug !== 'all') {
    query = query.eq('forum_categories.slug', categorySlug);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as (ForumPost & { profiles?: Profile; forum_categories?: ForumCategory })[];
}

export async function getPostComments(postId: string) {
  guard();
  const { data, error } = await supabase
    .from('forum_comments')
    .select('*, profiles(full_name, avatar_url, user_role, verification_status)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as (ForumComment & { profiles?: Profile })[];
}

export async function addForumPost(post: Omit<ForumPost, 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'comments_count' | 'views_count'>) {
  guard();
  const { data, error } = await supabase.from('forum_posts').insert(post).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addForumComment(comment: Omit<ForumComment, 'id' | 'created_at' | 'updated_at' | 'likes_count'>) {
  guard();
  const { data, error } = await supabase.from('forum_comments').insert(comment).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleForumLike(userId: string, postId?: string, commentId?: string) {
  guard();
  if (!postId && !commentId) throw new Error('Must provide postId or commentId');

  // Check if already liked
  let query = supabase.from('forum_likes').select('id').eq('user_id', userId);
  if (postId) query = query.eq('post_id', postId);
  if (commentId) query = query.eq('comment_id', commentId);

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from('forum_likes').delete().eq('id', existing.id);
    return false;
  } else {
    // Like
    await supabase.from('forum_likes').insert({
      user_id: userId,
      post_id: postId || null,
      comment_id: commentId || null,
    });
    return true;
  }
}

export async function isPostLikedByUser(userId: string, postId: string): Promise<boolean> {
  guard();
  const { data } = await supabase
    .from('forum_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();
  return !!data;
}

export async function getUserLikedPostIds(userId: string): Promise<Set<string>> {
  guard();
  const { data, error } = await supabase
    .from('forum_likes')
    .select('post_id')
    .eq('user_id', userId)
    .not('post_id', 'is', null);
  if (error) throw new Error(error.message);
  return new Set((data || []).flatMap(item => item.post_id ? [item.post_id] : []));
}

export async function reportForumContent(params: {
  reporterId: string;
  reason: string;
  postId?: string;
  commentId?: string;
}) {
  guard();
  if (!params.postId && !params.commentId) throw new Error('المحتوى غير محدد');
  const { error } = await supabase.from('forum_reports').insert({
    reporter_id: params.reporterId,
    post_id: params.postId || null,
    comment_id: params.commentId || null,
    reason: params.reason,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
}

export async function getActiveCompetitions() {
  guard();
  const { data, error } = await supabase
    .from('competitions')
    .select('*, competition_entries(count)')
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .gte('ends_at', new Date().toISOString())
    .order('ends_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function enterCompetition(
  competitionId: string,
  userId: string,
  forumPostId?: string
) {
  guard();
  const { data, error } = await supabase
    .from('competition_entries')
    .insert({
      competition_id: competitionId,
      user_id: userId,
      forum_post_id: forumPostId || null,
      status: 'entered',
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('أنت مشارك بالفعل في هذه المسابقة');
    throw new Error(error.message);
  }
  return data;
}

/* ========== REAL-TIME ========== */

export function subscribeToTable(table: string, callback: (payload: Record<string, unknown>) => void) {
  guard();
  return supabase.channel(`${table}-changes`).on(
    'postgres_changes' as never,
    { event: '*', schema: 'public', table },
    callback
  ).subscribe();
}

export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  guard();
  return supabase.channel(`user-notifications-${userId}`).on(
    'postgres_changes' as never,
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload: { new: Notification }) => callback(payload.new)
  ).subscribe();
}

export function subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void) {
  guard();
  return supabase.channel(`conv-${conversationId}`).on(
    'postgres_changes' as never,
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    () => { getConversationMessages(conversationId).then(callback); }
  ).subscribe();
}

/* ========== ADMIN (requires admin RLS / is_admin()) ========== */
type UserRole = Database['public']['Enums']['user_role'];
type UserStatus = Database['public']['Enums']['user_status'];

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  user_role: string | null;
  user_status: string | null;
  city: string | null;
  updated_at: string | null;
}

export async function adminListProfiles(limit = 100): Promise<AdminUserRow[]> {
  guard();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, user_role, user_status, city, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as AdminUserRow[];
}

export async function adminUpdateUserRole(userId: string, role: string) {
  guard();
  const { error } = await supabase
    .from('profiles')
    .update({ user_role: role as unknown as UserRole, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function adminUpdateUserStatus(userId: string, status: string) {
  guard();
  const { error } = await supabase
    .from('profiles')
    .update({ user_status: status as unknown as UserStatus, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export interface AdminReviewRow {
  id: string;
  rating: number | null;
  comment: string | null;
  moderation_status: string | null;
  created_at: string | null;
  professional_id: string | null;
}

export async function adminListPendingReviews(): Promise<AdminReviewRow[]> {
  guard();
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, moderation_status, created_at, professional_id')
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []) as AdminReviewRow[];
}

export async function adminModerateReview(reviewId: string, approved: boolean) {
  guard();
  const status = approved ? 'approved' : 'rejected';
  const { error } = await supabase
    .from('reviews')
    .update({
      moderation_status: status as unknown as Database['public']['Enums']['moderation_status'],
      is_public: approved,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);
  if (error) throw new Error(error.message);
}

export async function adminListPendingPayments() {
  guard();
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'processing')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminListBookings(limit = 100) {
  guard();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles!bookings_client_id_fkey(full_name), professionals(business_name, profiles(full_name)), services!bookings_service_id_fkey(name), booking_services(*, services!booking_services_service_id_fkey(name))')
    .order('booking_start_time', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminListPendingIdVerifications() {
  guard();
  const { data, error } = await supabase
    .from('id_verification_requests')
    .select('*, profiles(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminReviewIdVerification(
  requestId: string,
  approved: boolean,
  reason?: string
) {
  guard();
  const { error } = await supabase.rpc('review_id_verification', {
    request_id: requestId,
    approve: approved,
    reason: reason || undefined,
  });
  if (error) throw new Error(error.message);
}

export async function adminListPendingSubscriptions() {
  guard();
  const { data, error } = await supabase
    .from('subscription_requests')
    .select('*, profiles(full_name), subscription_plans(name_ar, price_dzd)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminReviewSubscription(
  requestId: string,
  approved: boolean,
  reason?: string
) {
  guard();
  const { error } = await supabase.rpc('review_subscription_request', {
    request_id: requestId,
    approve: approved,
    reason: reason || undefined,
  });
  if (error) throw new Error(error.message);
}

export async function adminListPendingReports() {
  guard();
  const [forum, professionals] = await Promise.all([
    supabase
      .from('forum_reports')
      .select('*, profiles!forum_reports_reporter_id_fkey(full_name), forum_posts(title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('professional_reports')
      .select('*, profiles!professional_reports_reporter_id_fkey(full_name), professionals(business_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ]);
  if (forum.error) throw new Error(forum.error.message);
  if (professionals.error) throw new Error(professionals.error.message);
  return { forum: forum.data || [], professionals: professionals.data || [] };
}

export async function adminResolveReport(
  reportType: 'forum' | 'professional',
  reportId: string,
  accepted: boolean
) {
  guard();
  const status = accepted ? 'reviewed' : 'dismissed';
  const { error } = reportType === 'forum'
    ? await supabase.from('forum_reports').update({ status }).eq('id', reportId)
    : await supabase.from('professional_reports').update({
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', reportId);
  if (error) throw new Error(error.message);
}
