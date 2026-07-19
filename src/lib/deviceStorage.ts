/**
 * Client-side persistence helpers for bookmarks/saves.
 * Server sync is deferred; data stays on-device until a sync table ships.
 */

const MARKETPLACE_SAVES_KEY = 'hallaqi-marketplace-saves';
const FORUM_BOOKMARKS_KEY = 'hallaqi-forum-bookmarks';

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
}

export function getMarketplaceSavedIds(): string[] {
  return readIds(MARKETPLACE_SAVES_KEY);
}

export function toggleMarketplaceSave(productId: string): boolean {
  const ids = new Set(getMarketplaceSavedIds());
  if (ids.has(productId)) ids.delete(productId);
  else ids.add(productId);
  writeIds(MARKETPLACE_SAVES_KEY, [...ids]);
  return ids.has(productId);
}

export function isMarketplaceSaved(productId: string): boolean {
  return getMarketplaceSavedIds().includes(productId);
}

export function getForumBookmarkIds(): string[] {
  return readIds(FORUM_BOOKMARKS_KEY);
}

export function toggleForumBookmark(postId: string): boolean {
  const ids = new Set(getForumBookmarkIds());
  if (ids.has(postId)) ids.delete(postId);
  else ids.add(postId);
  writeIds(FORUM_BOOKMARKS_KEY, [...ids]);
  return ids.has(postId);
}

export function isForumBookmarked(postId: string): boolean {
  return getForumBookmarkIds().includes(postId);
}

const RECENT_BARBERS_KEY = 'hallaqi-recent-barbers';
const RECENT_BARBERS_CAP = 12;

/** MRU list of visited barber ids (device-only). */
export function getRecentBarberIds(): string[] {
  return readIds(RECENT_BARBERS_KEY);
}

export function pushRecentBarber(barberId: string): void {
  if (!barberId) return;
  const next = [barberId, ...getRecentBarberIds().filter(id => id !== barberId)].slice(0, RECENT_BARBERS_CAP);
  writeIds(RECENT_BARBERS_KEY, next);
}

/** Shown next to local-only saves until server sync exists. */
export const DEVICE_SAVE_HINT = 'محفوظ على هذا الجهاز فقط';
