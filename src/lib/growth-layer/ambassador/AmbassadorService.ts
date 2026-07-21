import { AMBASSADOR_REQUIREMENTS } from '@/lib/growth-layer/config';
import type { AmbassadorStatus } from '@/lib/growth-layer/types';
import { evaluateAmbassador } from '@/supabase/growth';

export const AmbassadorService = {
  requirements: AMBASSADOR_REQUIREMENTS,

  async evaluate(userId?: string): Promise<AmbassadorStatus> {
    return evaluateAmbassador(userId);
  },

  benefits() {
    return [
      { id: 'badge', label: 'شارة سفير', available: true },
      { id: 'referral_bonus', label: 'مكافأة دعوة إضافية', available: true },
      { id: 'theme', label: 'ثيم حصري', available: true },
      { id: 'support', label: 'دعم أولوية', available: true },
      { id: 'future', label: 'مكافآت مستقبلية', available: false },
    ];
  },
};
