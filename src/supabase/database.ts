import { supabase, isSupabaseConfigured } from './client';

function guard(): void {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');
}

/* ========== BARBERS ========== */
export async function getBarbers(filters?: { tag?: string; wilaya?: string; search?: string }) {
  guard();
  let query = supabase.from('barbers').select('*').order('rating', { ascending: false });
  if (filters?.wilaya) query = query.eq('wilaya', filters.wilaya);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let barbers = (data || []) as Record<string, unknown>[];
  if (filters?.tag) {
    barbers = barbers.filter(b => ((b.tags as string[]) || []).includes(filters.tag!));
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    barbers = barbers.filter(b =>
      ((b.name as string) || '').toLowerCase().includes(s) ||
      ((b.location as string) || '').toLowerCase().includes(s)
    );
  }
  return barbers;
}

export async function getBarberById(id: string) {
  guard();
  const { data, error } = await supabase.from('barbers').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

export async function updateBarberProfile(barberId: string, updates: Record<string, unknown>) {
  guard();
  const { data, error } = await supabase
    .from('barbers')
    .update({ ...updates, updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', barberId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ========== BOOKINGS ========== */
export async function getUserBookings(userId: string, statusFilter?: string[]) {
  guard();
  let query = supabase.from('bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (statusFilter?.length) query = query.in('status', statusFilter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Record<string, unknown>[];
}

export async function createBooking(booking: Record<string, unknown>) {
  guard();
  const { data, error } = await supabase.from('bookings').insert(booking as Record<string, unknown>).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateBookingStatus(bookingId: string, status: string) {
  guard();
  const { error } = await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() } as Record<string, unknown>).eq('id', bookingId);
  if (error) throw new Error(error.message);
}

/* ========== FAVORITES ========== */
export async function toggleFavorite(userId: string, barberId: string, isFav: boolean) {
  guard();
  if (isFav) {
    const { error } = await supabase.from('favorites').insert({ user_id: userId, barber_id: barberId } as Record<string, unknown>);
    if (error && !error.message.includes('duplicate')) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('barber_id', barberId);
    if (error) throw new Error(error.message);
  }
}

export async function getFavorites(userId: string) {
  guard();
  const { data, error } = await supabase.from('favorites').select('*').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data || []) as Record<string, unknown>[];
}

/* ========== FORUM ========== */
export async function getForumPosts(category?: string) {
  guard();
  let query = supabase.from('forum_posts').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Record<string, unknown>[];
}

export async function getPostComments(postId: string) {
  guard();
  const { data, error } = await supabase.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Record<string, unknown>[];
}

export async function addComment(comment: Record<string, unknown>) {
  guard();
  const { data, error } = await supabase.from('forum_comments').insert(comment as Record<string, unknown>).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function togglePostLike(postId: string, userId: string) {
  guard();
  const { data } = await supabase.from('forum_posts').select('liked_by, likes').eq('id', postId).single();
  if (!data) return;

  const row = data as Record<string, unknown>;
  const likedBy = (row.liked_by as string[]) || [];
  const isLiked = likedBy.includes(userId);

  const newLikedBy = isLiked ? likedBy.filter((id: string) => id !== userId) : [...likedBy, userId];
  const newLikes = isLiked ? Math.max(0, (row.likes as number || 1) - 1) : ((row.likes as number) || 0) + 1;

  await supabase.from('forum_posts').update({ liked_by: newLikedBy, likes: newLikes } as Record<string, unknown>).eq('id', postId);
}

/* ========== NOTIFICATIONS ========== */
export async function getUserNotifications(userId: string, limit = 50) {
  guard();
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as Record<string, unknown>[];
}

export async function markNotificationRead(notificationId: string) {
  guard();
  const { error } = await supabase.from('notifications').update({ read: true } as Record<string, unknown>).eq('id', notificationId);
  if (error) throw new Error(error.message);
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

export function subscribeToNotifications(userId: string, callback: (notifications: Record<string, unknown>[]) => void) {
  guard();
  return supabase.channel('user-notifications').on(
    'postgres_changes' as never,
    { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    () => { getUserNotifications(userId).then(callback); }
  ).subscribe();
}
