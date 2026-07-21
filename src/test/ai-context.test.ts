import { describe, expect, it } from 'vitest';
import { toHallaqiSystemPrompt, type HallaqiAiContext } from '../../api/_lib/ai-context';
import { HALLAQI_IDENTITY } from '../../api/_lib/ai-identity';

const baseContext: HallaqiAiContext = {
  identity: HALLAQI_IDENTITY,
  catalog: [],
  user: { id: 'u1', displayName: 'أحمد', city: 'الجزائر العاصمة', role: 'client' },
  discoveryWilaya: 'الجزائر العاصمة',
};

describe('toHallaqiSystemPrompt', () => {
  it('includes Hallaqi identity and user city', () => {
    const prompt = toHallaqiSystemPrompt(baseContext, 'advice');
    expect(prompt).toContain('Hallaqi');
    expect(prompt).toContain('حلاقي');
    expect(prompt).toContain('الجزائر العاصمة');
    expect(prompt).toContain('support@hallaqi.app');
    expect(prompt).toContain('الإلغاء مجاني قبل ساعتين');
    expect(prompt).toContain('لا ترفضه');
    expect(prompt).toContain('تشبيه/نكتة حلاقة');
    expect(prompt).toContain('فكاهة مرتبطة بعالم الحلاقة');
  });

  it('embeds catalog barbers when present', () => {
    const prompt = toHallaqiSystemPrompt({
      ...baseContext,
      catalog: [{
        id: 'b1',
        name: 'سمير الحلاق',
        city: 'الجزائر العاصمة',
        rating: 4.8,
        reviewCount: 10,
        isMobile: false,
        isVerified: true,
        services: [{ name: 'قص شعر', priceDzd: 300, category: 'haircut' }],
      }],
    }, 'advice');
    expect(prompt).toContain('سمير الحلاق');
    expect(prompt).toContain('id:b1');
    expect(prompt).toContain('300 دج');
  });

  it('includes client recommendation hints', () => {
    const prompt = toHallaqiSystemPrompt({
      ...baseContext,
      clientHints: {
        topBarbers: [{
          id: 'x1',
          name: 'عمر',
          city: 'وهران',
          rating: 4.9,
          services: ['قص عصري'],
          reasons: ['في منطقتك'],
        }],
      },
    }, 'advice');
    expect(prompt).toContain('عمر');
    expect(prompt).toContain('في منطقتك');
  });

  it('switches tone for barber-assist mode', () => {
    const prompt = toHallaqiSystemPrompt(baseContext, 'barber-assist');
    expect(prompt).toContain('حلاقاً/صالوناً');
  });
});
