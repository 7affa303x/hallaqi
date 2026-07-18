import { describe, expect, it } from 'vitest';
import { absoluteUrl, getSiteUrl } from '@/lib/siteUrl';

describe('siteUrl', () => {
  it('defaults to hallaqi.app custom domain', () => {
    expect(getSiteUrl()).toBe('https://hallaqi.app');
    expect(absoluteUrl('/sitemap.xml')).toBe('https://hallaqi.app/sitemap.xml');
  });
});
