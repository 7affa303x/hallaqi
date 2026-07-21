import { useEffect, useState } from 'react';
import GrowthPageShell from '@/components/growth/GrowthPageShell';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  GROWTH_RANKING_METRICS,
  GROWTH_RANKING_METRIC_LABELS,
  GrowthLeaderboardService,
  GrowthAnalyticsService,
  type GrowthRankingMetric,
} from '@/lib/growth-layer';
import type { LeaderboardSnapshot } from '@/lib/community/types';
import { RANKING_SCOPE_LABELS, type RankingScope } from '@/lib/community/config';

export default function LeaderboardPage() {
  const { themeConfig } = useApp();
  const { appUser } = useAuth();
  const [metric, setMetric] = useState<GrowthRankingMetric>('xp');
  const [scope, setScope] = useState<{ type: RankingScope; value: string }>({ type: 'city', value: appUser?.city || 'Algeria' });
  const [board, setBoard] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const scopes = GrowthLeaderboardService.defaultScopes(appUser?.city, appUser?.country);
    if (scopes[0]) setScope(scopes[0]);
  }, [appUser?.city, appUser?.country]);

  useEffect(() => {
    setLoading(true);
    GrowthLeaderboardService.get(scope.type, scope.value, metric, 'monthly', appUser?.id)
      .then(setBoard)
      .finally(() => setLoading(false));
    void GrowthAnalyticsService.track('leaderboard_viewed', { metric, scope: scope.type });
  }, [scope, metric, appUser?.id]);

  return (
    <GrowthPageShell title="الترتيب المحلي" subtitle={`${RANKING_SCOPE_LABELS[scope.type]}: ${scope.value}`} badge="نمو">
      <div className="flex gap-1 p-1 rounded-2xl border mb-3 overflow-x-auto no-scrollbar" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        {GROWTH_RANKING_METRICS.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className="shrink-0 px-3 h-9 rounded-xl text-[10px] font-bold"
            style={{
              backgroundColor: metric === m ? themeConfig.colors.primary : 'transparent',
              color: metric === m ? '#fff' : themeConfig.colors.textMuted,
            }}
          >
            {GROWTH_RANKING_METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
        {GrowthLeaderboardService.defaultScopes(appUser?.city, appUser?.country).map(s => (
          <button
            key={`${s.type}-${s.value}`}
            type="button"
            onClick={() => setScope(s)}
            className="shrink-0 px-3 h-8 rounded-full text-[10px] font-bold border"
            style={{
              borderColor: scope.value === s.value && scope.type === s.type ? themeConfig.colors.primary : themeConfig.colors.border,
              color: scope.value === s.value && scope.type === s.type ? themeConfig.colors.primary : themeConfig.colors.textMuted,
            }}
          >
            {RANKING_SCOPE_LABELS[s.type]}: {s.value}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-sm py-8" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل…</p>}

      {!loading && board && (
        <div className="space-y-2">
          {board.entries.map(entry => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 p-3 rounded-2xl border"
              style={{
                backgroundColor: entry.userId === appUser?.id ? themeConfig.colors.primary + '10' : themeConfig.colors.surface,
                borderColor: themeConfig.colors.border,
              }}
            >
              <span className="w-8 text-center font-black text-sm" style={{ color: themeConfig.colors.primary }}>#{entry.rank}</span>
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5">
                {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: themeConfig.colors.text }}>{entry.displayName}</p>
                <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{entry.value} {GROWTH_RANKING_METRIC_LABELS[metric]}</p>
              </div>
            </div>
          ))}
          {board.entries.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: themeConfig.colors.textMuted }}>لا يوجد ترتيب بعد في هذه المنطقة</p>
          )}
        </div>
      )}
    </GrowthPageShell>
  );
}
