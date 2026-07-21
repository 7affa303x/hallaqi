import { useApp } from '@/contexts/useApp';
import { useCommunity } from '@/hooks/useCommunity';
import { RANKING_METRIC_LABELS } from '@/lib/community';

export default function LocalRankCard() {
  const { themeConfig, navigate } = useApp();
  const { localRank } = useCommunity();

  if (!localRank || localRank.entries.length === 0) return null;

  const top = localRank.entries[0];
  const myRank = localRank.userRank;

  return (
    <button
      type="button"
      onClick={() => navigate('leaderboard')}
      className="w-full text-right rounded-3xl border p-4"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      dir="rtl"
    >
      <h3 className="text-sm font-bold mb-1" style={{ color: themeConfig.colors.text }}>الترتيب المحلي</h3>
      <p className="text-[10px] mb-3" style={{ color: themeConfig.colors.textMuted }}>
        {localRank.scopeValue} · {RANKING_METRIC_LABELS[localRank.metric]}
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white"
          style={{ background: `linear-gradient(145deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})` }}
        >
          {myRank ? `#${myRank}` : '—'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: themeConfig.colors.text }}>
            المتصدر: {top.displayName}
          </p>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            {top.value} {RANKING_METRIC_LABELS[localRank.metric]}
          </p>
        </div>
      </div>
    </button>
  );
}
