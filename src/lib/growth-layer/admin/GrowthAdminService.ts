import { adminBanReferral, adminGrantCoins, adminGrantXp } from '@/supabase/growth';
import { ProgressionService } from '@/lib/progression';

export const GrowthAdminService = {
  grantXp: (userId: string, amount: number, reason?: string) => adminGrantXp(userId, amount, reason),
  grantCoins: (userId: string, amount: number, reason?: string) => adminGrantCoins(userId, amount, reason),
  banReferral: (referralId: string) => adminBanReferral(referralId),
  resetMissions: (userId: string) => ProgressionService.load(userId),
  // Badge grants use existing ProgressionService sync paths
  grantBadge: (userId: string, badgeId: string) =>
    ProgressionService.unlockBadge(userId, badgeId),
};
