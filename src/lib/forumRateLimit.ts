/**
 * Soft rate limits for forum UGC (client + localStorage).
 * Server should eventually mirror these; this stops spam at the UI layer.
 */

const POST_KEY = 'hallaqi-forum-post-day';
const COMMENT_KEY = 'hallaqi-forum-comment-day';

function dayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCount(key: string, userId: string): { day: string; count: number } {
  try {
    const raw = localStorage.getItem(`${key}:${userId}`);
    if (!raw) return { day: dayStamp(), count: 0 };
    const parsed = JSON.parse(raw) as { day?: string; count?: number };
    if (parsed.day !== dayStamp()) return { day: dayStamp(), count: 0 };
    return { day: parsed.day, count: Number(parsed.count) || 0 };
  } catch {
    return { day: dayStamp(), count: 0 };
  }
}

function writeCount(key: string, userId: string, count: number): void {
  try {
    localStorage.setItem(`${key}:${userId}`, JSON.stringify({ day: dayStamp(), count }));
  } catch { /* ignore */ }
}

/** Soft launch: 1 forum post per user per day. */
export const FORUM_POST_DAILY_LIMIT = 1;
/** Soft launch: 10 comments/replies per user per day. */
export const FORUM_COMMENT_DAILY_LIMIT = 10;

export function canCreateForumPost(userId: string): { ok: boolean; remaining: number; message?: string } {
  const { count } = readCount(POST_KEY, userId);
  const remaining = Math.max(0, FORUM_POST_DAILY_LIMIT - count);
  if (remaining <= 0) {
    return {
      ok: false,
      remaining: 0,
      message: 'حد النشر اليومي: منشور واحد. يمكنك المحاولة غداً.',
    };
  }
  return { ok: true, remaining };
}

export function recordForumPost(userId: string): void {
  const { count } = readCount(POST_KEY, userId);
  writeCount(POST_KEY, userId, count + 1);
}

export function canCreateForumComment(userId: string): { ok: boolean; remaining: number; message?: string } {
  const { count } = readCount(COMMENT_KEY, userId);
  const remaining = Math.max(0, FORUM_COMMENT_DAILY_LIMIT - count);
  if (remaining <= 0) {
    return {
      ok: false,
      remaining: 0,
      message: 'وصلت لحد الردود اليومي (10). يمكنك المحاولة غداً.',
    };
  }
  return { ok: true, remaining };
}

export function recordForumComment(userId: string): void {
  const { count } = readCount(COMMENT_KEY, userId);
  writeCount(COMMENT_KEY, userId, count + 1);
}
