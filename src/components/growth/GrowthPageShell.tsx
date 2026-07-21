import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '@/contexts/useApp';

interface GrowthPageShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
}

/** Shared RTL sticky header for MVP Plus growth placeholder pages. */
export default function GrowthPageShell({ title, subtitle, badge, children }: GrowthPageShellProps) {
  const { themeConfig, goBack } = useApp();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: themeConfig.colors.background }} dir="rtl">
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}
      >
        <button
          type="button"
          onClick={goBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          aria-label="رجوع"
          style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}
        >
          <ArrowRight size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <div className="flex-1 min-w-0 text-right">
          <h1 className="text-base font-bold truncate" style={{ color: themeConfig.colors.text }}>{title}</h1>
          {subtitle && (
            <p className="text-[11px] truncate" style={{ color: themeConfig.colors.textMuted }}>{subtitle}</p>
          )}
        </div>
        {badge && (
          <span
            className="text-[10px] font-black px-2 py-1 rounded-full shrink-0"
            style={{ backgroundColor: `${themeConfig.colors.primary}18`, color: themeConfig.colors.primary }}
          >
            {badge}
          </span>
        )}
      </header>
      <div className="flex-1 px-4 py-4 pb-24">{children}</div>
    </div>
  );
}
