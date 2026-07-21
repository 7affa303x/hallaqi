/**
 * Level unlock definitions — placeholders only.
 * DO NOT implement feature gating here; wire later from unlock_key.
 */

export interface LevelUnlockDef {
  id: string;
  minLevel: number;
  unlockKey: string;
  titleAr: string;
  descriptionAr: string;
  isPlaceholder: true;
}

export const LEVEL_UNLOCKS: readonly LevelUnlockDef[] = [
  {
    id: 'unlock_gallery_slots',
    minLevel: 3,
    unlockKey: 'extra_gallery_slots',
    titleAr: 'مساحات معرض إضافية',
    descriptionAr: 'فتح مساحات إضافية للمعرض (قريباً)',
    isPlaceholder: true,
  },
  {
    id: 'unlock_extra_badges',
    minLevel: 5,
    unlockKey: 'extra_badges',
    titleAr: 'شارات إضافية',
    descriptionAr: 'عرض شارات أكثر على الملف (قريباً)',
    isPlaceholder: true,
  },
  {
    id: 'unlock_mini_website',
    minLevel: 8,
    unlockKey: 'mini_website',
    titleAr: 'موقع مصغّر',
    descriptionAr: 'صفحة عامة احترافية (قريباً)',
    isPlaceholder: true,
  },
  {
    id: 'unlock_premium_profile',
    minLevel: 10,
    unlockKey: 'premium_profile',
    titleAr: 'ملف مميّز',
    descriptionAr: 'مظهر ملف احترافي (قريباً)',
    isPlaceholder: true,
  },
  {
    id: 'unlock_special_themes',
    minLevel: 12,
    unlockKey: 'special_themes',
    titleAr: 'سمات خاصة',
    descriptionAr: 'سمات حصرية للمستويات العليا (قريباً)',
    isPlaceholder: true,
  },
] as const;

export function unlocksForLevel(level: number): LevelUnlockDef[] {
  return LEVEL_UNLOCKS.filter(u => u.minLevel <= level);
}

export function nextUnlock(level: number): LevelUnlockDef | null {
  return LEVEL_UNLOCKS.find(u => u.minLevel > level) ?? null;
}
