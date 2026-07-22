/**
 * Growth layer repository — referrals, coins, mini sites, analytics.
 */
import { supabase, isSupabaseConfigured } from '@/supabase/client';
import type {
  AmbassadorStatus,
  CoinsBalance,
  MiniSite,
  ReferralStats,
  RewardStoreItem,
} from '@/lib/growth-layer/types';

type LooseQuery = {
  eq: (col: string, val: unknown) => LooseQuery;
  order: (col: string, opts?: { ascending?: boolean }) => LooseQuery;
  select: (cols?: string) => LooseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  single: () => Promise<{ data: unknown; error: { message: string } | null }>;
} & PromiseLike<{ data: unknown; error: { message: string } | null }>;

type LooseClient = {
  from: (table: string) => {
    select: (cols?: string) => LooseQuery;
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

export async function ensureReferralCode(): Promise<{ code: string; referralType: string } | null> {
  guard();
  const { data, error } = await db().rpc('ensure_referral_code');
  if (error) return null;
  const row = data as { ok?: boolean; code?: string; referral_type?: string };
  if (!row?.code) return null;
  return { code: row.code, referralType: row.referral_type || 'customer' };
}

export async function getReferralStats(): Promise<ReferralStats | null> {
  guard();
  const { data, error } = await db().rpc('get_referral_stats');
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    code: String(row.code || ''),
    referralType: (row.referral_type as ReferralStats['referralType']) || 'customer',
    referralLink: String(row.referral_link || ''),
    invitedUsers: Number(row.invited_users || 0),
    successfulReferrals: Number(row.successful_referrals || 0),
    pendingReferrals: Number(row.pending_referrals || 0),
    totalXpEarned: Number(row.total_xp_earned || 0),
    invitesSent: Number(row.invites_sent || 0),
  };
}

export async function attributeReferral(code: string, referredId?: string) {
  guard();
  const { data, error } = await db().rpc('attribute_referral', {
    p_code: code,
    p_referred_id: referredId || null,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; reason?: string; referrer_id?: string };
}

export async function recordInviteSent() {
  guard();
  await db().rpc('record_growth_analytics', {
    p_event_type: 'invite_sent',
    p_metadata: { at: new Date().toISOString() },
  });
}

export async function getCoinsBalance(userId: string): Promise<CoinsBalance> {
  guard();
  const { data, error } = await db().from('user_coins').select('balance').eq('user_id', userId).maybeSingle();
  if (error || !data) return { balance: 0 };
  return { balance: Number((data as { balance?: number }).balance || 0) };
}

export async function getRewardStoreItems(): Promise<RewardStoreItem[]> {
  guard();
  const { data, error } = await db()
    .from('reward_store_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return [];
  const { applyRewardStoreOverrides } = await import('@/lib/growth-layer/rewardOverrides');
  const rows = ((data || []) as Record<string, unknown>[]).map(row => ({
    id: String(row.id),
    title: String(row.title),
    description: (row.description as string) || null,
    category: row.category as RewardStoreItem['category'],
    coinCost: Number(row.coin_cost || 0),
    imageEmoji: String(row.image_emoji || '🎁'),
    comingSoon: Boolean(row.coming_soon ?? true),
  }));
  return applyRewardStoreOverrides(rows);
}

export async function getMiniSiteBySlug(slug: string): Promise<MiniSite | null> {
  guard();
  const { data, error } = await db()
    .from('mini_sites')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .eq('is_published', true)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    slug: String(row.slug),
    theme: String(row.theme || 'default'),
    seoTitle: (row.seo_title as string) || null,
    seoDescription: (row.seo_description as string) || null,
    isPublished: Boolean(row.is_published),
  };
}

export async function getMiniSiteForUser(userId: string): Promise<MiniSite | null> {
  guard();
  const { data, error } = await db().from('mini_sites').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    slug: String(row.slug),
    theme: String(row.theme || 'default'),
    seoTitle: (row.seo_title as string) || null,
    seoDescription: (row.seo_description as string) || null,
    isPublished: Boolean(row.is_published),
  };
}

export async function upsertMiniSite(input: {
  userId: string;
  slug: string;
  theme?: string;
  seoTitle?: string;
  seoDescription?: string;
  isPublished?: boolean;
}) {
  guard();
  const { data, error } = await db().from('mini_sites').upsert({
    user_id: input.userId,
    slug: input.slug.toLowerCase(),
    theme: input.theme || 'default',
    seo_title: input.seoTitle || null,
    seo_description: input.seoDescription || null,
    is_published: input.isPublished ?? false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function evaluateAmbassador(userId?: string): Promise<AmbassadorStatus> {
  guard();
  const { data, error } = await db().rpc('evaluate_ambassador_status', {
    p_user_id: userId || null,
  });
  if (error) return { unlocked: false };
  const row = data as { unlocked?: boolean };
  return { unlocked: Boolean(row?.unlocked) };
}

export async function recordGrowthAnalytics(eventType: string, metadata?: Record<string, unknown>) {
  guard();
  await db().rpc('record_growth_analytics', {
    p_event_type: eventType,
    p_metadata: metadata || {},
  });
}

// Admin
export async function adminGrantXp(userId: string, amount: number, reason?: string) {
  guard();
  const { data, error } = await db().rpc('admin_grant_xp', { p_user_id: userId, p_amount: amount, p_reason: reason || 'admin' });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminGrantCoins(userId: string, amount: number, reason?: string) {
  guard();
  const { data, error } = await db().rpc('admin_grant_coins', { p_user_id: userId, p_amount: amount, p_reason: reason || 'admin' });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminBanReferral(referralId: string) {
  guard();
  const { data, error } = await db().rpc('admin_ban_referral', { p_referral_id: referralId });
  if (error) throw new Error(error.message);
  return data;
}
