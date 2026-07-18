import { afterEach, describe, expect, it } from 'vitest';
import {
  getForumBookmarkIds,
  getMarketplaceSavedIds,
  isForumBookmarked,
  isMarketplaceSaved,
  toggleForumBookmark,
  toggleMarketplaceSave,
} from '@/lib/deviceStorage';

afterEach(() => {
  localStorage.clear();
});

describe('deviceStorage marketplace saves', () => {
  it('toggles save on and off', () => {
    expect(isMarketplaceSaved('p1')).toBe(false);
    expect(toggleMarketplaceSave('p1')).toBe(true);
    expect(getMarketplaceSavedIds()).toEqual(['p1']);
    expect(toggleMarketplaceSave('p1')).toBe(false);
    expect(getMarketplaceSavedIds()).toEqual([]);
  });

  it('ignores corrupt localStorage JSON', () => {
    localStorage.setItem('hallaqi-marketplace-saves', '{not-json');
    expect(getMarketplaceSavedIds()).toEqual([]);
  });
});

describe('deviceStorage forum bookmarks', () => {
  it('toggles bookmarks idempotently per id', () => {
    expect(toggleForumBookmark('post-a')).toBe(true);
    expect(toggleForumBookmark('post-b')).toBe(true);
    expect(getForumBookmarkIds().sort()).toEqual(['post-a', 'post-b']);
    expect(isForumBookmarked('post-a')).toBe(true);
    expect(toggleForumBookmark('post-a')).toBe(false);
    expect(getForumBookmarkIds()).toEqual(['post-b']);
  });
});
