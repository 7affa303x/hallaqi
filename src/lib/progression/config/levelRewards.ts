import { LEVEL_THRESHOLDS } from '@/lib/progression/config/levels';
import { LEVEL_UNLOCKS } from '@/lib/progression/config/unlocks';
import type { AchievementAudience } from '@/lib/progression/models/types';

export interface LevelRewardView {
  level: number;
  title: string;
  xpRequired: number;
  perks: string[];
}

const CLIENT_TITLES = [
  'زائر جديد', 'زبون نشط', 'عميل مخلص', 'محب الحلاقة', 'نجم الحي',
  'سفير الأناقة', 'خبير المواعيد', 'أسطورة الحجز', 'ملك المظهر', 'أيقونة حلاقي',
];

const BARBER_TITLES = [
  'حلاق مبتدئ', 'حلاق نشط', 'حلاق محترف', 'ماستر الحلاقة', 'فنان المقص',
  'حلاق مميز', 'خبير الأسلوب', 'أسطورة الصالون', 'ملك الحلاقة', 'أيقونة الحرفة',
];

const STORE_TITLES = [
  'متجر جديد', 'بائع نشط', 'متجر موثوق', 'نجم السوق', 'خبير التجارة',
  'علامة مميزة', 'رائد السوق', 'أسطورة البيع', 'ملك المتاجر', 'أيقونة التجارة',
];

function titlesFor(audience: AchievementAudience): string[] {
  if (audience === 'barber') return BARBER_TITLES;
  if (audience === 'store') return STORE_TITLES;
  return CLIENT_TITLES;
}

const CLIENT_PERKS: Record<number, string[]> = {
  2: ['شارة ملف مكتمل', '+5% نقاط الولاء'],
  3: ['فتح مساحة معرض إضافية'],
  5: ['شارات إضافية على الملف'],
  8: ['موقع مصغّر تجريبي'],
  10: ['ملف مميّز', 'أولوية في الاقتراحات'],
};

const BARBER_PERKS: Record<number, string[]> = {
  2: ['ظهور أفضل في البحث'],
  3: ['مساحة معرض موسّعة'],
  5: ['شارة حلاق نشط'],
  8: ['موقع مصغّر احترافي'],
  10: ['ملف مميّز', 'أولوية في الترتيب المحلي'],
};

const STORE_PERKS: Record<number, string[]> = {
  2: ['ظهور في قسم السوق'],
  3: ['شارة متجر نشط'],
  5: ['رصيد ترويج تجريبي'],
  8: ['تحليلات متجر أساسية'],
  10: ['ملف متجر مميّز', 'أولوية في العروض'],
};

function perksFor(audience: AchievementAudience, level: number): string[] {
  const map = audience === 'barber' ? BARBER_PERKS : audience === 'store' ? STORE_PERKS : CLIENT_PERKS;
  const unlocks = LEVEL_UNLOCKS.filter(u => u.minLevel === level).map(u => u.titleAr);
  return [...(map[level] ?? []), ...unlocks];
}

export function levelRewardsForAudience(
  audience: AchievementAudience,
  currentLevel: number,
  max = 12,
): LevelRewardView[] {
  const titles = titlesFor(audience);
  return Array.from({ length: max }, (_, i) => {
    const level = i + 1;
    const xpRequired = LEVEL_THRESHOLDS[level - 1] ?? level * 100;
    return {
      level,
      title: titles[i] ?? `المستوى ${level}`,
      xpRequired,
      perks: perksFor(audience, level),
    };
  }).map(row => ({
    ...row,
    perks: row.level <= currentLevel
      ? row.perks.length ? row.perks : ['مكافأة مستوى مفتوحة']
      : row.perks.length ? row.perks : ['مكافآت تُفتح عند الوصول'],
  }));
}
