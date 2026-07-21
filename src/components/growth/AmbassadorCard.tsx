import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { AmbassadorService } from '@/lib/growth-layer';

export default function AmbassadorCard() {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    AmbassadorService.evaluate(appUser.id).then(s => setUnlocked(s.unlocked)).catch(() => setUnlocked(false));
  }, [appUser]);

  if (!appUser || !unlocked) return null;

  return (
    <section
      className="rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.primary + '12', borderColor: themeConfig.colors.primary + '40' }}
      dir="rtl"
    >
      <div className="flex items-center gap-2 mb-1">
        <Crown size={16} style={{ color: themeConfig.colors.primary }} />
        <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>سفير حلاقي</h3>
      </div>
      <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
        شارة سفير · مكافأة دعوة · ثيم حصري · دعم أولوية
      </p>
    </section>
  );
}
