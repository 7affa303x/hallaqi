import { GROWTH_PROGRESS_MOCK } from '@/data/growthMock';
import { useGrowth } from '@/hooks/useGrowth';
import { useApp } from '@/contexts/useApp';

/** XP / Level / Streak card — values from Progression Engine only. */
export default function ProgressCard() {
  const { themeConfig } = useApp();
  const { snapshot } = useGrowth();
  const level = snapshot.level || GROWTH_PROGRESS_MOCK.level;
  const xp = snapshot.xp;
  const xpToNext = snapshot.xpToNext;
  const xpInto = snapshot.xpIntoLevel;
  const streakDays = snapshot.streakDays;
  const bestStreak = snapshot.bestStreak;
  const badgeCount = snapshot.badgeCount;
  const pct = Math.min(100, Math.round((xpInto / Math.max(xpToNext, 1)) * 100));
  const accent = themeConfig.colors.primary;

  return (
    <section
      className="rounded-3xl p-4 overflow-hidden relative"
      style={{
        background: 'linear-gradient(145deg, #0B1220 0%, #111827 55%, #0F172A 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 12px 40px ${accent}22`,
      }}
      aria-label="بطاقة التقدم"
      dir="rtl"
    >
      <div
        className="pointer-events-none absolute -top-10 -left-8 w-40 h-40 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-wide text-white/50 mb-1">HALLAQI PROGRESS</p>
          <h2 className="text-2xl font-black text-white">Level {level}</h2>
          <p className="text-sm font-semibold mt-1" style={{ color: accent }}>{xp} XP</p>
        </div>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white"
          style={{ background: `linear-gradient(145deg, ${accent}, ${themeConfig.colors.accent})` }}
        >
          {level}
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-2xl px-3 py-2.5 bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/50 font-medium">Streak</p>
          <p className="text-sm font-bold text-white mt-0.5">🔥 {streakDays} يوم</p>
          <p className="text-[9px] text-white/40 mt-0.5">أفضل: {bestStreak}</p>
        </div>
        <div className="rounded-2xl px-3 py-2.5 bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/50 font-medium">Badges</p>
          <p className="text-sm font-bold text-white mt-0.5">🏅 {badgeCount} شارة</p>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-white/50">التقدم للمستوى التالي</span>
          <span className="text-[10px] font-bold text-white/70">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(pct, xp > 0 ? 4 : 0)}%`,
              background: `linear-gradient(90deg, ${accent}, ${themeConfig.colors.accent})`,
            }}
          />
        </div>
        <p className="text-[10px] text-white/40 mt-1.5">{xpInto} / {xpToNext} XP لهذا المستوى</p>
      </div>
    </section>
  );
}
