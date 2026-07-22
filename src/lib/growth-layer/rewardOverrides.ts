import type { RewardStoreItem } from '@/lib/growth-layer/types';

/** Max service price covered by a free-haircut reward (DZD). Above this → partial discount only. */
export const FREE_HAIRCUT_MAX_DZD = 50_000;

const OVERRIDES: Record<string, Partial<RewardStoreItem> & { title: string; description: string }> = {
  pro_month: {
    title: 'شهر Pro مجاني',
    description: 'اشتراك احترافي لمدة شهر واحد',
    coinCost: 2000,
    category: 'pro',
    imageEmoji: '👑',
  },
  promo_credit: {
    title: 'رصيد ترويج',
    description: 'رصيد إعلاني للحلاقين داخل المنصة',
    coinCost: 150,
    category: 'credit',
    imageEmoji: '📣',
  },
  gift_card: {
    title: 'حلاقة مجانية',
    description: `حلاقة مجانية حتى ${FREE_HAIRCUT_MAX_DZD.toLocaleString('ar-DZ')} دج — فوق ذلك يُطبَّق تخفيض`,
    coinCost: 400,
    category: 'gift_card',
    imageEmoji: '💈',
  },
};

/** Client-side reward catalog corrections (DB seed may lag migrations). */
export function applyRewardStoreOverrides(items: RewardStoreItem[]): RewardStoreItem[] {
  const hidden = new Set(['product_sample', 'coupon_10']);
  return items
    .filter(item => !hidden.has(item.id))
    .map(item => {
      const patch = OVERRIDES[item.id];
      if (!patch) return item;
      return { ...item, ...patch };
    });
}
