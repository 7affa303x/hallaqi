import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  AmbassadorService,
  CoinsService,
  ReferralService,
  type AmbassadorStatus,
  type CoinsBalance,
  type ReferralStats,
} from '@/lib/growth-layer';

export function useGrowthLayer() {
  const { appUser } = useAuth();
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [coins, setCoins] = useState<CoinsBalance>({ balance: 0 });
  const [ambassador, setAmbassador] = useState<AmbassadorStatus>({ unlocked: false });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const [stats, balance, amb] = await Promise.all([
        ReferralService.stats(),
        CoinsService.balance(appUser.id),
        AmbassadorService.evaluate(appUser.id),
      ]);
      setReferralStats(stats);
      setCoins(balance);
      setAmbassador(amb);
    } catch {
      /* offline */
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { referralStats, coins, ambassador, loading, refresh };
}
