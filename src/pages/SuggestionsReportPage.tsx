import { useMemo } from 'react';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { translate } from '@/lib/i18n';
import {
  SUGGESTIONS_200_NOTE,
  SUGGESTIONS_200_SECTIONS,
  type SuggestionPriority,
} from '@/data/suggestions200';

const PRIORITY_META: Record<SuggestionPriority, { emoji: string; labelAr: string; labelEn: string; labelFr: string; colorKey: 'error' | 'warning' | 'success' }> = {
  critical: { emoji: '🔴', labelAr: 'حرج', labelEn: 'Critical', labelFr: 'Critique', colorKey: 'error' },
  important: { emoji: '🟡', labelAr: 'مهم', labelEn: 'Important', labelFr: 'Important', colorKey: 'warning' },
  nice: { emoji: '🟢', labelAr: 'تحسين', labelEn: 'Nice to have', labelFr: 'Amélioration', colorKey: 'success' },
};

function priorityLabel(priority: SuggestionPriority, language: 'ar' | 'fr' | 'en') {
  const meta = PRIORITY_META[priority];
  if (language === 'fr') return meta.labelFr;
  if (language === 'en') return meta.labelEn;
  return meta.labelAr;
}

export default function SuggestionsReportPage({ onBack }: { onBack: () => void }) {
  const { themeConfig, settings } = useApp();
  const lang = settings.language;

  const rows = useMemo(
    () => SUGGESTIONS_200_SECTIONS.flatMap(section =>
      section.items.map(item => ({
        ...item,
        section: section.title,
      }))
    ),
    []
  );

  const counts = useMemo(() => ({
    total: rows.length,
    critical: rows.filter(item => item.priority === 'critical').length,
    important: rows.filter(item => item.priority === 'important').length,
    nice: rows.filter(item => item.priority === 'nice').length,
  }), [rows]);

  const title =
    lang === 'en'
      ? '200 Development Suggestions'
      : lang === 'fr'
        ? '200 suggestions de développement'
        : 'تقرير 200 اقتراح تطوير';

  const headers = {
    number: lang === 'en' ? '#' : lang === 'fr' ? 'N°' : 'رقم',
    section: lang === 'en' ? 'Section' : lang === 'fr' ? 'Section' : 'القسم',
    priority: lang === 'en' ? 'Priority' : lang === 'fr' ? 'Priorité' : 'الأولوية',
    suggestion: lang === 'en' ? 'Suggestion' : lang === 'fr' ? 'Suggestion' : 'الاقتراح',
  };

  return (
    <div className="pb-20">
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b"
        style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={translate(lang, 'back')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
        >
          <ArrowLeft size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold truncate" style={{ color: themeConfig.colors.text }}>{title}</h2>
          <p className="text-[10px] truncate" style={{ color: themeConfig.colors.textMuted }}>
            Hallaqi · {counts.total} {lang === 'en' ? 'rows' : lang === 'fr' ? 'lignes' : 'صفاً'}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: themeConfig.colors.primary + '12' }}
        >
          <Lightbulb size={18} style={{ color: themeConfig.colors.primary }} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['critical', 'important', 'nice'] as SuggestionPriority[]).map(priority => (
            <span
              key={priority}
              className="text-[10px] px-2.5 py-1 rounded-full font-medium"
              style={{
                backgroundColor: themeConfig.colors[PRIORITY_META[priority].colorKey] + '15',
                color: themeConfig.colors[PRIORITY_META[priority].colorKey],
              }}
            >
              {PRIORITY_META[priority].emoji} {priorityLabel(priority, lang)} · {counts[priority]}
            </span>
          ))}
        </div>

        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-right">
              <thead>
                <tr style={{ backgroundColor: themeConfig.colors.primary + '10' }}>
                  <th className="px-3 py-2.5 text-[11px] font-bold whitespace-nowrap border-b w-12" style={{ color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}>
                    {headers.number}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-bold whitespace-nowrap border-b w-44" style={{ color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}>
                    {headers.section}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-bold whitespace-nowrap border-b w-24" style={{ color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}>
                    {headers.priority}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-bold border-b" style={{ color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}>
                    {headers.suggestion}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const meta = PRIORITY_META[row.priority];
                  return (
                    <tr
                      key={row.number}
                      style={{
                        backgroundColor: index % 2 === 0 ? themeConfig.colors.surface : themeConfig.colors.background,
                      }}
                    >
                      <td
                        className="px-3 py-2.5 text-[11px] font-bold align-top border-b whitespace-nowrap"
                        style={{ color: themeConfig.colors.primary, borderColor: themeConfig.colors.border + '70' }}
                      >
                        {row.number}
                      </td>
                      <td
                        className="px-3 py-2.5 text-[10px] align-top border-b leading-relaxed"
                        style={{ color: themeConfig.colors.textMuted, borderColor: themeConfig.colors.border + '70' }}
                      >
                        {row.section}
                      </td>
                      <td
                        className="px-3 py-2.5 text-[10px] align-top border-b whitespace-nowrap"
                        style={{ borderColor: themeConfig.colors.border + '70' }}
                      >
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: themeConfig.colors[meta.colorKey] + '12',
                            color: themeConfig.colors[meta.colorKey],
                          }}
                        >
                          <span aria-hidden="true">{meta.emoji}</span>
                          {priorityLabel(row.priority, lang)}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2.5 text-xs align-top border-b leading-relaxed"
                        style={{ color: themeConfig.colors.text, borderColor: themeConfig.colors.border + '70' }}
                      >
                        {row.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-center px-2" style={{ color: themeConfig.colors.textMuted }}>
          {SUGGESTIONS_200_NOTE}
        </p>
      </div>
    </div>
  );
}
