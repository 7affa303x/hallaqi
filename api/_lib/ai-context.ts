import type { AuthenticatedUser } from './auth.js';
import {
  HALLAQI_AI_RULES,
  HALLAQI_FAQ,
  HALLAQI_FEATURES,
  HALLAQI_IDENTITY,
  HALLAQI_PAUSED_AT_LAUNCH,
  MARKETPLACE_CATEGORY_SAMPLES,
  SERVICE_CATEGORY_LABELS,
} from './ai-identity.js';
import {
  fetchCatalogProfessionals,
  fetchMarketplaceSnapshot,
  fetchUserProfile,
  type CatalogProfessional,
  type MarketplaceSnapshot,
} from './supabase-server.js';

export interface ClientBarberHint {
  id: string;
  name: string;
  city?: string;
  rating?: number;
  services?: string[];
  reasons?: string[];
}

export interface ClientSiteContext {
  wilaya?: string;
  preferredCategory?: string;
  topBarbers?: ClientBarberHint[];
  recentBarberNames?: string[];
}

export interface HallaqiAiContext {
  identity: typeof HALLAQI_IDENTITY;
  user?: {
    id: string;
    displayName?: string;
    city?: string;
    role?: string;
  };
  discoveryWilaya?: string;
  catalog: CatalogProfessional[];
  marketplace?: MarketplaceSnapshot | null;
  clientHints?: ClientSiteContext;
}

export async function buildHallaqiAiContext(
  user: AuthenticatedUser,
  clientHints?: ClientSiteContext,
): Promise<HallaqiAiContext> {
  const [profile, marketplace] = await Promise.all([
    fetchUserProfile(user.accessToken),
    fetchMarketplaceSnapshot(),
  ]);

  const discoveryWilaya = clientHints?.wilaya?.trim()
    || profile?.city?.trim()
    || undefined;

  const catalog = await fetchCatalogProfessionals({
    city: discoveryWilaya,
    limit: discoveryWilaya ? 8 : 10,
  });

  return {
    identity: HALLAQI_IDENTITY,
    user: profile
      ? {
          id: profile.id,
          displayName: profile.fullName,
          city: profile.city,
          role: profile.role,
        }
      : { id: user.id },
    discoveryWilaya,
    catalog,
    marketplace,
    clientHints,
  };
}

function formatBarberLine(barber: CatalogProfessional | ClientBarberHint, source: 'catalog' | 'client'): string {
  if ('services' in barber && Array.isArray(barber.services) && barber.services.length > 0 && typeof barber.services[0] === 'object') {
    const pro = barber as CatalogProfessional;
    const svc = pro.services.slice(0, 3).map(s => `${s.name} (${s.priceDzd} دج)`).join('، ');
    return `- ${pro.name} | ${pro.city} | تقييم ${pro.rating.toFixed(1)} | ${pro.isMobile ? 'متنقل' : 'صالون'} | خدمات: ${svc} | id:${pro.id}`;
  }
  const hint = barber as ClientBarberHint;
  const svc = (hint.services || []).slice(0, 3).join('، ');
  const reasons = (hint.reasons || []).join('؛ ');
  return `- ${hint.name}${hint.city ? ` | ${hint.city}` : ''}${hint.rating ? ` | تقييم ${hint.rating}` : ''}${svc ? ` | خدمات: ${svc}` : ''}${reasons ? ` | (${reasons})` : ''}${hint.id ? ` | id:${hint.id}` : ''} [${source}]`;
}

export function toHallaqiSystemPrompt(ctx: HallaqiAiContext, mode: 'advice' | 'barber-assist' = 'advice'): string {
  const lines: string[] = [
    `=== هوية Hallaqi ===`,
    `${HALLAQI_IDENTITY.nameAr} (${HALLAQI_IDENTITY.nameEn}) — ${HALLAQI_IDENTITY.taglineAr}`,
    `الموقع: ${HALLAQI_IDENTITY.siteUrl} | الدعم: ${HALLAQI_IDENTITY.supportEmail} | الإصدار ${HALLAQI_IDENTITY.version}`,
    '',
    'قواعد المساعد:',
    ...HALLAQI_AI_RULES.map(rule => `• ${rule}`),
    '',
    'ميزات المنصة:',
    ...HALLAQI_FEATURES.map(f => `• ${f}`),
    '',
    'متوقف عند الإطلاق (لا تعد به):',
    ...HALLAQI_PAUSED_AT_LAUNCH.map(f => `• ${f}`),
    '',
    'أسئلة شائعة:',
    ...HALLAQI_FAQ.map(item => `• ${item.q} → ${item.a}`),
  ];

  if (ctx.user?.displayName || ctx.user?.city || ctx.user?.role) {
    lines.push('', '=== المستخدم الحالي ===');
    if (ctx.user.displayName) lines.push(`الاسم: ${ctx.user.displayName}`);
    if (ctx.user.city) lines.push(`المدينة/الولاية: ${ctx.user.city}`);
    if (ctx.user.role) lines.push(`الدور: ${ctx.user.role}`);
  }

  if (ctx.discoveryWilaya) {
    lines.push('', `منطقة الاكتشاف: ${ctx.discoveryWilaya}`);
  }

  if (ctx.clientHints?.preferredCategory) {
    const label = SERVICE_CATEGORY_LABELS[ctx.clientHints.preferredCategory] || ctx.clientHints.preferredCategory;
    lines.push(`اهتمام الخدمة: ${label}`);
  }

  if (ctx.clientHints?.recentBarberNames?.length) {
    lines.push(`حلاقون سابقون: ${ctx.clientHints.recentBarberNames.slice(0, 4).join('، ')}`);
  }

  const clientBarbers = ctx.clientHints?.topBarbers || [];
  if (clientBarbers.length > 0) {
    lines.push('', '=== حلاقون مقترحون (من تطبيق المستخدم) ===');
    clientBarbers.slice(0, 5).forEach(b => lines.push(formatBarberLine(b, 'client')));
  }

  if (ctx.catalog.length > 0) {
    lines.push('', '=== حلاقون نشطون على Hallaqi (بيانات حقيقية) ===');
    ctx.catalog.slice(0, 8).forEach(b => lines.push(formatBarberLine(b, 'catalog')));
    lines.push('عند اقتراح حجز، اذكر اسماً من القائمة أعلاه إن وُجد مناسباً.');
  }

  const m = ctx.marketplace;
  if (m && (m.approvedSellers > 0 || m.activeProducts > 0)) {
    const cats = m.sampleCategories.length > 0 ? m.sampleCategories : [...MARKETPLACE_CATEGORY_SAMPLES];
    lines.push(
      '',
      '=== السوق ===',
      `بائعون معتمدون: ~${m.approvedSellers} | منتجات نشطة: ~${m.activeProducts}`,
      `فئات: ${cats.slice(0, 8).join('، ')}`,
      'الشراء عبر Visit Store — ليس داخل التطبيق عند الإطلاق.',
    );
  }

  if (mode === 'barber-assist') {
    lines.push('', 'أنت تساعد حلاقاً/صالوناً على Hallaqi — ركّز على التشغيل والعملاء والردود المهنية.');
  } else {
    lines.push(
      '',
      'أجب كمساعد Hallaqi للعميل — اربط النصيحة بالمنصة عندما يكون ذلك مفيداً (حجز، حلاق، سوق).',
      'الأسئلة خارج العناية: أجب بذكاء ومرح بأسلوب حلاقي دون رفض؛ اجعل الإجابة الحقيقية واضحة.',
    );
  }

  return lines.join('\n');
}
