import { COIN_RULES } from '@/lib/growth-layer/config';
import type { CoinsBalance, RewardStoreItem } from '@/lib/growth-layer/types';
import { getCoinsBalance, getRewardStoreItems } from '@/supabase/growth';

/** Coins are isolated from XP — never affect level or reputation. */
export const CoinsService = {
  rules: COIN_RULES,

  async balance(userId: string): Promise<CoinsBalance> {
    return getCoinsBalance(userId);
  },

  async storeItems(): Promise<RewardStoreItem[]> {
    return getRewardStoreItems();
  },

  /** Placeholder — store purchase cashback (not wired to checkout yet). */
  placeholderCashbackFromPurchase(amount: number): number {
    return Math.floor(amount * (COIN_RULES.storePurchaseCashbackPercent / 100));
  },
};
