import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { ShareExperienceService } from '@/lib/community';
import ShareExperienceCard from '@/components/community/ShareExperienceCard';
import type { Booking } from '@/types';

export default function ShareExperienceModal({
  booking,
  isFirst,
  onClose,
}: {
  booking: Booking;
  isFirst: boolean;
  onClose: () => void;
}) {
  const { appUser } = useAuth();
  const { themeConfig } = useApp();
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);

  const share = async () => {
    if (!appUser) return;
    setSharing(true);
    try {
      const text = ShareExperienceService.shareText({
        barberName: booking.barberName,
        serviceName: booking.services.map(s => s.name).join('، '),
        rating: booking.rating,
      });
      const canNativeShare = typeof navigator.share === 'function';
      if (canNativeShare) {
        await navigator.share({ title: 'حلاقي', text, url: 'https://hallaqi.app' });
      } else {
        await navigator.clipboard.writeText(`${text}\nhttps://hallaqi.app`);
      }
      await ShareExperienceService.share({
        userId: appUser.id,
        bookingId: booking.id,
        barberName: booking.barberName,
        serviceName: booking.services.map(s => s.name).join('، '),
        rating: booking.rating,
        shareChannel: canNativeShare ? 'native' : 'clipboard',
      });
      setDone(true);
    } catch {
      /* user cancelled */
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/50" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl p-4" style={{ backgroundColor: themeConfig.colors.surface }}>
        <h2 className="text-lg font-bold mb-2" style={{ color: themeConfig.colors.text }}>
          {isFirst ? 'شارك تجربتك الأولى!' : 'شارك تجربتك'}
        </h2>
        <p className="text-[11px] mb-4" style={{ color: themeConfig.colors.textMuted }}>
          {isFirst
            ? 'شارك تجربتك الأولى واكسب 50 XP'
            : 'كل مشاركة لاحقة تمنحك 10 XP'}
        </p>
        <ShareExperienceCard
          barberName={booking.barberName}
          serviceName={booking.services.map(s => s.name).join('، ')}
          rating={booking.rating}
          date={booking.date}
          onShare={() => void share()}
          xpHint={done ? 'تمت المشاركة ✓' : isFirst ? '+50 XP' : '+10 XP'}
        />
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm font-bold py-2" style={{ color: themeConfig.colors.textMuted }}>
          {done ? 'إغلاق' : 'لاحقاً'}
        </button>
        {sharing && <p className="text-center text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>جاري المشاركة…</p>}
      </div>
    </div>
  );
}
