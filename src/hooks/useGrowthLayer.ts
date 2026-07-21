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

  const load = useCallback(async (cancelled?: () => boolean) => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const [stats, balance, amb] = await Promise.all([
        ReferralService.stats(),
        CoinsService.balance(appUser.id),
        AmbassadorService.evaluate(appUser.id),
      ]);
      if (cancelled?.()) return;
      setReferralStats(stats);
      setCoins(balance);
      setAmbassador(amb);
    } catch {
      /* offline */
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, [appUser?.id]);

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { referralStats, coins, ambassador, loading, refresh };
}
