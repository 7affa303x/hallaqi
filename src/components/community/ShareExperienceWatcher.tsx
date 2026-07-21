import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { TransformationService } from '@/lib/community';
import type { Transformation } from '@/lib/community/types';
import ShareExperienceModal from '@/components/community/ShareExperienceModal';
import type { Booking } from '@/types';

/** Shows share-experience popup after first completed booking — does not alter booking logic. */
export default function ShareExperienceWatcher() {
  const { appUser } = useAuth();
  const { bookings } = useApp();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isFirst, setIsFirst] = useState(false);

  const completed = useMemo(
    () => bookings.filter(b => b.status === 'completed'),
    [bookings],
  );

  useEffect(() => {
    if (!appUser || completed.length === 0) return;
    const key = `hallaqi-share-prompt:${appUser.id}:${completed[0].id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    setIsFirst(completed.length === 1);
    setBooking(completed[0]);
  }, [appUser, completed]);

  if (!booking) return null;

  return (
    <ShareExperienceModal
      booking={booking}
      isFirst={isFirst}
      onClose={() => setBooking(null)}
    />
  );
}

export function TransformationPendingBanner() {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [pending, setPending] = useState<Transformation[]>([]);

  useEffect(() => {
    if (!appUser) return;
    TransformationService.forUser(appUser.id)
      .then(rows => setPending(rows.filter(t => t.status === 'pending_customer' && t.customerId === appUser.id)))
      .catch(() => setPending([]));
  }, [appUser]);

  if (pending.length === 0) return null;
  const t = pending[0];

  const respond = async (accept: boolean) => {
    await TransformationService.respond(t.id, appUser!.id, accept, t);
    setPending(p => p.filter(x => x.id !== t.id));
  };

  return (
    <section
      className="rounded-2xl border p-3 mx-4 mt-3"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      dir="rtl"
    >
      <p className="text-xs font-bold mb-1" style={{ color: themeConfig.colors.text }}>تحول قبل/بعد</p>
      <p className="text-[11px] mb-2" style={{ color: themeConfig.colors.textMuted }}>
        {t.barberName || 'حلاقك'} يطلب موافقتك على نشر التحول
      </p>
      <div className="grid grid-cols-2 gap-1 mb-2">
        <img src={t.beforeImageUrl} alt="قبل" className="rounded-lg aspect-square object-cover" />
        <img src={t.afterImageUrl} alt="بعد" className="rounded-lg aspect-square object-cover" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void respond(true)} className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>موافقة</button>
        <button type="button" onClick={() => void respond(false)} className="flex-1 h-9 rounded-xl text-xs font-bold border" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>رفض</button>
      </div>
    </section>
  );
}
