/**
 * Community data access — Supabase repository.
 */
import { supabase, isSupabaseConfigured } from '@/supabase/client';
import type {
  CommunityStats,
  CommunityTag,
  CreateTransformationInput,
  LeaderboardEntry,
  LeaderboardSnapshot,
  ShareCard,
  Transformation,
} from '@/lib/community/types';
import type { RankingMetric, RankingPeriod, RankingScope } from '@/lib/community/config';
import { sendNotification } from '@/supabase/database';

type LooseQuery = {
  eq: (col: string, val: unknown) => LooseQuery;
  or: (filter: string) => LooseQuery;
  order: (col: string, opts?: { ascending?: boolean }) => LooseQuery;
  limit: (n: number) => LooseQuery;
  select: (cols?: string) => LooseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  single: () => Promise<{ data: unknown; error: { message: string } | null }>;
} & PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }>;

type UpdateBuilder = {
  eq: (col: string, val: unknown) => UpdateBuilder & PromiseLike<{ error: { message: string } | null }>;
};

type LooseClient = {
  from: (table: string) => {
    select: (cols?: string, opts?: { count?: 'exact'; head?: boolean }) => LooseQuery;
    insert: (vals: Record<string, unknown>) => LooseQuery;
    update: (vals: Record<string, unknown>) => UpdateBuilder;
    upsert: (vals: Record<string, unknown>, opts?: { onConflict?: string }) => LooseQuery;
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function db(): LooseClient {
  return supabase as unknown as LooseClient;
}

function guard() {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
}

function mapTransformation(row: Record<string, unknown>): Transformation {
  const barber = row.barber as { full_name?: string; avatar_url?: string | null } | null;
  const customer = row.customer as { full_name?: string; avatar_url?: string | null } | null;
  return {
    id: String(row.id),
    barberId: String(row.barber_id),
    customerId: String(row.customer_id),
    beforeImageUrl: String(row.before_image_url),
    afterImageUrl: String(row.after_image_url),
    caption: (row.caption as string) || null,
    status: row.status as Transformation['status'],
    contestId: (row.contest_id as string) || null,
    forumPostId: (row.forum_post_id as string) || null,
    likesCount: Number(row.likes_count || 0),
    commentsCount: Number(row.comments_count || 0),
    sharesCount: Number(row.shares_count || 0),
    pinnedByBarber: Boolean(row.pinned_by_barber),
    pinnedByCustomer: Boolean(row.pinned_by_customer),
    createdAt: String(row.created_at),
    publishedAt: (row.published_at as string) || null,
    barberName: barber?.full_name || undefined,
    barberAvatar: barber?.avatar_url ?? null,
    customerName: customer?.full_name || undefined,
    customerAvatar: customer?.avatar_url ?? null,
  };
}

function mapTag(row: Record<string, unknown>): CommunityTag {
  const tagger = row.tagger as { full_name?: string } | null;
  const tagged = row.tagged as { full_name?: string } | null;
  return {
    id: String(row.id),
    resourceType: row.resource_type as CommunityTag['resourceType'],
    resourceId: String(row.resource_id),
    taggerId: String(row.tagger_id),
    taggedUserId: String(row.tagged_user_id),
    status: row.status as CommunityTag['status'],
    createdAt: String(row.created_at),
    respondedAt: (row.responded_at as string) || null,
    taggerName: tagger?.full_name,
    taggedName: tagged?.full_name,
  };
}

export async function createTransformation(input: CreateTransformationInput): Promise<Transformation> {
  guard();
  const { data, error } = await db()
    .from('transformations')
    .insert({
      barber_id: input.barberId,
      customer_id: input.customerId,
      before_image_url: input.beforeImageUrl,
      after_image_url: input.afterImageUrl,
      caption: input.caption || null,
      contest_id: input.contestId || null,
      status: 'pending_customer',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown>;
  await sendNotification({
    userId: input.customerId,
    title: 'طلب موافقة على تحول',
    message: 'يريد حلاقك نشر تحول قبل/بعد — راجع ووافق',
    type: 'forum',
    metadata: { transformation_id: row.id as string, event: 'transformation_pending' },
  });

  return mapTransformation(row);
}

export async function respondTransformation(transformationId: string, accept: boolean) {
  guard();
  const { data, error } = await db().rpc('respond_transformation_collaboration', {
    p_transformation_id: transformationId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; status?: string; reason?: string };
}

export async function getUserTransformations(userId: string): Promise<Transformation[]> {
  guard();
  const { data, error } = await db()
    .from('transformations')
    .select('*, barber:profiles!transformations_barber_id_fkey(full_name, avatar_url), customer:profiles!transformations_customer_id_fkey(full_name, avatar_url)')
    .or(`barber_id.eq.${userId},customer_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return ((data || []) as Record<string, unknown>[]).map(mapTransformation);
}

export async function getPublishedTransformations(limit = 20): Promise<Transformation[]> {
  guard();
  const { data, error } = await db()
    .from('transformations')
    .select('*, barber:profiles!transformations_barber_id_fkey(full_name, avatar_url), customer:profiles!transformations_customer_id_fkey(full_name, avatar_url)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data || []) as Record<string, unknown>[]).map(mapTransformation);
}

export async function setTransformationPin(
  transformationId: string,
  userId: string,
  role: 'barber' | 'customer',
  pinned: boolean,
) {
  guard();
  const field = role === 'barber' ? 'pinned_by_barber' : 'pinned_by_customer';
  const { error } = await db()
    .from('transformations')
    .update({ [field]: pinned })
    .eq('id', transformationId)
    .eq(role === 'barber' ? 'barber_id' : 'customer_id', userId);
  if (error) throw new Error(error.message);
}

export async function createCommunityTag(input: {
  resourceType: 'transformation' | 'forum_post';
  resourceId: string;
  taggerId: string;
  taggedUserId: string;
}): Promise<CommunityTag> {
  guard();
  const { data, error } = await db()
    .from('community_tags')
    .insert({
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      tagger_id: input.taggerId,
      tagged_user_id: input.taggedUserId,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown>;
  await sendNotification({
    userId: input.taggedUserId,
    title: 'تمت الإشارة إليك',
    message: 'يريد شخص ما الإشارة إليك في منشور',
    type: 'forum',
    metadata: {
      tag_id: row.id as string,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
    },
  });

  return mapTag(row);
}

export async function respondCommunityTag(tagId: string, accept: boolean) {
  guard();
  const { data, error } = await db().rpc('respond_community_tag', {
    p_tag_id: tagId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; status?: string };
}

export async function getPendingTagsForUser(userId: string): Promise<CommunityTag[]> {
  guard();
  const { data, error } = await db()
    .from('community_tags')
    .select('*, tagger:profiles!community_tags_tagger_id_fkey(full_name), tagged:profiles!community_tags_tagged_user_id_fkey(full_name)')
    .eq('tagged_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as Record<string, unknown>[]).map(mapTag);
}

export async function getLeaderboardFromCache(
  scopeType: RankingScope,
  scopeValue: string,
  metric: RankingMetric,
  period: RankingPeriod,
): Promise<LeaderboardSnapshot | null> {
  guard();
  const { data, error } = await db()
    .from('leaderboard_cache')
    .select('*')
    .eq('scope_type', scopeType)
    .eq('scope_value', scopeValue)
    .eq('metric', metric)
    .eq('period', period)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    scopeType: row.scope_type as RankingScope,
    scopeValue: String(row.scope_value),
    metric: row.metric as RankingMetric,
    period: row.period as RankingPeriod,
    entries: (row.entries as LeaderboardEntry[]) || [],
    computedAt: String(row.computed_at),
  };
}

export async function upsertLeaderboardCache(snapshot: LeaderboardSnapshot) {
  guard();
  const { error } = await db().from('leaderboard_cache').upsert({
    scope_type: snapshot.scopeType,
    scope_value: snapshot.scopeValue,
    metric: snapshot.metric,
    period: snapshot.period,
    entries: snapshot.entries,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'scope_type,scope_value,metric,period' });
  if (error) throw new Error(error.message);
}

export async function createShareCard(input: {
  userId: string;
  bookingId?: string;
  barberName: string;
  serviceName?: string;
  rating?: number;
  shareChannel?: string;
  xpAwarded: number;
}): Promise<ShareCard> {
  guard();
  const { data, error } = await db().from('share_cards').insert({
    user_id: input.userId,
    booking_id: input.bookingId || null,
    barber_name: input.barberName,
    service_name: input.serviceName || null,
    rating: input.rating ?? null,
    share_channel: input.shareChannel || null,
    xp_awarded: input.xpAwarded,
  }).select().single();
  if (error) throw new Error(error.message);
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    bookingId: (row.booking_id as string) || null,
    barberName: String(row.barber_name),
    serviceName: (row.service_name as string) || null,
    rating: (row.rating as number) ?? null,
    shareChannel: (row.share_channel as string) || null,
    xpAwarded: Number(row.xp_awarded || 0),
    createdAt: String(row.created_at),
  };
}

export async function getUserShareCount(userId: string): Promise<number> {
  guard();
  const { count, error } = await db()
    .from('share_cards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getCommunityStats(userId: string): Promise<CommunityStats> {
  guard();
  const [transformations, tagsReceived, tagsGiven, shares, contests] = await Promise.all([
    db().from('transformations').select('id', { count: 'exact', head: true })
      .or(`barber_id.eq.${userId},customer_id.eq.${userId}`).eq('status', 'published'),
    db().from('community_tags').select('id', { count: 'exact', head: true }).eq('tagged_user_id', userId).eq('status', 'accepted'),
    db().from('community_tags').select('id', { count: 'exact', head: true }).eq('tagger_id', userId),
    db().from('share_cards').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('competition_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  return {
    transformationsPublished: transformations.count || 0,
    tagsReceived: tagsReceived.count || 0,
    tagsGiven: tagsGiven.count || 0,
    sharesCount: shares.count || 0,
    contestEntries: contests.count || 0,
  };
}

export async function addMemeComment(input: {
  postId: string;
  authorId: string;
  mediaUrl: string;
  memePackId: string;
  parentId?: string;
}) {
  guard();
  const { data: post } = await supabase.from('forum_posts').select('allow_meme_comments').eq('id', input.postId).single();
  if (!(post as { allow_meme_comments?: boolean } | null)?.allow_meme_comments) {
    throw new Error('التعليقات الميم معطّلة على هذا المنشور');
  }

  const { data, error } = await supabase.from('forum_comments').insert({
    post_id: input.postId,
    author_id: input.authorId,
    content: '',
    parent_id: input.parentId || null,
    comment_type: 'meme',
    media_url: input.mediaUrl,
    meme_pack_id: input.memePackId,
  } as never).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setPostMemeCommentsEnabled(postId: string, authorId: string, enabled: boolean) {
  guard();
  const { error } = await supabase
    .from('forum_posts')
    .update({ allow_meme_comments: enabled } as never)
    .eq('id', postId)
    .eq('author_id', authorId);
  if (error) throw new Error(error.message);
}

export async function addReviewImage(reviewId: string, imageUrl: string, sortOrder = 0) {
  guard();
  const { error } = await db().from('review_images').insert({
    review_id: reviewId,
    image_url: imageUrl,
    sort_order: sortOrder,
  });
  if (error) throw new Error(error.message);
}

export async function notifyRankingChange(
  userId: string,
  scopeValue: string,
  metric: RankingMetric,
  newRank: number,
  previousRank?: number,
) {
  if (!previousRank || newRank >= previousRank) return;
  await sendNotification({
    userId,
    title: 'تحسّن ترتيبك المحلي',
    message: `ارتقيت إلى المركز #${newRank} في ${scopeValue}`,
    type: 'forum',
    metadata: { event: 'ranking_changed', rank: newRank, previousRank, metric },
  });
}
