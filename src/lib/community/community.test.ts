import { describe, expect, it } from 'vitest';
import { COMMUNITY_XP, MEME_PACKS, RANKING_METRICS } from '@/lib/community/config';
import { RankingService } from '@/lib/community/services/RankingService';
import { ShareExperienceService } from '@/lib/community/services/ShareExperienceService';

describe('community config', () => {
  it('defines share XP amounts', () => {
    expect(COMMUNITY_XP.firstShareExperience).toBe(50);
    expect(COMMUNITY_XP.shareExperience).toBe(10);
  });

  it('has meme packs ready for extension', () => {
    expect(MEME_PACKS.length).toBeGreaterThanOrEqual(2);
    expect(MEME_PACKS[0].stickers.length).toBeGreaterThan(0);
  });

  it('supports multiple ranking metrics', () => {
    expect(RANKING_METRICS).toContain('xp');
    expect(RANKING_METRICS).toContain('bookings');
  });
});

describe('RankingService scopes', () => {
  it('never returns empty scopes — always geo-scoped', () => {
    const scopes = RankingService.defaultScopesForProfile('الجزائر', 'Algeria');
    expect(scopes.length).toBeGreaterThan(0);
    expect(scopes.some(s => s.type === 'city' || s.type === 'country')).toBe(true);
  });
});

describe('ShareExperienceService', () => {
  it('builds share text', () => {
    const text = ShareExperienceService.shareText({
      barberName: 'أحمد',
      serviceName: 'قص شعر',
      rating: 5,
    });
    expect(text).toContain('أحمد');
    expect(text).toContain('حلاقي');
  });
});
