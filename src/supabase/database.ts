import { supabase, isSupabaseConfigured } from './client';
import type { Database } from '../types/supabase';

import type {
  Profile, Professional, Service, Booking, Review, Favorite,
  AvailabilitySchedule, AvailabilityException, PortfolioItem,
  Message, Notification,
  ForumPost, ForumComment, ForumCategory
} from '@/types/supabase';
import type { BookingStatus } from '@/types'; // Import app-level BookingStatus

function guard(): void {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');
}

/* ========== PROFILES ========== */

export async function getProfile(userId: string): Promise<Profile | null> {
  guard();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  guard();
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ========== PROFESSIONALS ========== */

export async function getProfessionals(filters?: { city?: string; search?: string; category?: string }) {
  guard();
  let query = supabase
    .from('professionals')
    .select('*, profiles(full_name, avatar_url, city, user_role), services(*)')
    .order('average_rating', { ascending: false });

  if (filters?.city) {
    query = query.filter('profiles.city', 'eq', filters.city);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as (Professional & { profiles?: Profile; services?: Service[] })[];
}

export async function getProfessionalById(id: string) {
  guard();
  const { data, error } = await supabase
    .from('professionals')
    .select('*, profiles(*), services(*), portfolio_items(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Professional & { profiles?: Profile; services?: Service[]; portfolio_items?: PortfolioItem[] };
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
  const { error } = await supabase.from('services').delete().eq('id', serviceId);
  if (error) throw new Error(error.message);
}

/* ========== BOOKINGS ========== */

export async function getClientBookings(clientId: string, statusFilter?: (Database["public"]["Enums"]["booking_status"])[] | null) {
  guard();
  let query = supabase
    .from('bookings')
    .select('*, professionals(*, profiles(full_name, avatar_url)), services(*)')
    .eq('client_id', clientId)
    .order('booking_start_time', { ascending: false });
  if (statusFilter?.length) query = query.in('status', statusFilter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as (Booking & { professionals?: Professional & { profiles?: Profile }; services?: Service })[];
}

export async function getProfessionalBookings(proId: string, statusFilter?: (Database["public"]["Enums"]["booking_status"])[] | null) {
  guard();
  let query = supabase
    .from('bookings')
    .select('*, profiles(*), services(*)')
    .eq('professional_id', proId)
    .order('booking_start_time', { ascending: false });
  if (statusFilter?.length) query = query.in('status', statusFilter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as (Booking & { profiles?: Profile; services?: Service; status: BookingStatus })[];
}

export async function createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) {
  guard();
  const { data, error } = await supabase.from('bookings').insert(booking).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateBookingStatus(bookingId: string, status: Database["public"]["Enums"]["booking_status"]) {
  guard();
  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) throw new Error(error.message);
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

export async function getUserConversations(userId: string) {
  guard();
  const { data, error } = await supabase
    .from('conversation_members')
    .select('conversation_id, conversations(*, messages(content, created_at, sender_id))')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data || [];
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

export async function markNotificationRead(notificationId: string) {
  guard();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw new Error(error.message);
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
    .select('*, profiles(full_name, avatar_url, user_role), forum_categories(name, slug)')
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
    .select('*, profiles(full_name, avatar_url)')
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

/* ========== REAL-TIME ========== */

export function subscribeToTable(table: string, callback: (payload: Record<string, unknown>) => void) {
  guard();
  return supabase.channel(`${table}-changes`).on(
    'postgres_changes' as never,
    { event: '*', schema: 'public', table },
    callback
  ).subscribe();
}

export function subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  guard();
  return supabase.channel('user-notifications').on(
    'postgres_changes' as never,
    { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    () => { getUserNotifications(userId).then(callback); }
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
