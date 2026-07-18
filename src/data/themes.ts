import type { ThemeConfig, ThemeName, AnimationStyle } from '@/types';

export const themes: Record<ThemeName, ThemeConfig> = {
  classic: {
    name: 'classic',
    label: 'كلاسيكي',
    colors: {
      primary: '#2D2D2D',
      secondary: '#F5F5F0',
      accent: '#C9A96E',
      background: '#FAFAF5',
      surface: '#FFFFFF',
      text: '#1A1A1A',
      textMuted: '#6B6B6B',
      border: '#E5E5E0',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    animation: 'smooth',
    borderRadius: '0.5rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  modern: {
    name: 'modern',
    label: 'عصري',
    colors: {
      primary: '#1A1A2E',
      secondary: '#E8E8F0',
      accent: '#E94560',
      background: '#F8F9FC',
      surface: '#FFFFFF',
      text: '#16213E',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    animation: 'modern',
    borderRadius: '1rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  digital: {
    name: 'digital',
    label: 'رقمي',
    colors: {
      primary: '#0EA5E9',
      secondary: '#0F172A',
      accent: '#06B6D4',
      background: '#020617',
      surface: '#0F172A',
      text: '#E2E8F0',
      textMuted: '#94A3B8',
      border: '#1E293B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
    },
    animation: 'digital',
    borderRadius: '0.375rem',
    fontFamily: 'monospace',
  },
  red: {
    name: 'red',
    label: 'أحمر',
    colors: {
      primary: '#DC2626',
      secondary: '#FEF2F2',
      accent: '#EF4444',
      background: '#FFFBFB',
      surface: '#FFFFFF',
      text: '#1F1F1F',
      textMuted: '#6B7280',
      border: '#FECACA',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#B91C1C',
      info: '#3B82F6',
    },
    animation: 'bouncy',
    borderRadius: '0.75rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  blue: {
    name: 'blue',
    label: 'أزرق',
    colors: {
      primary: '#1D4ED8',
      secondary: '#EFF6FF',
      accent: '#3B82F6',
      background: '#F8FAFF',
      surface: '#FFFFFF',
      text: '#1E3A5F',
      textMuted: '#6B7280',
      border: '#BFDBFE',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#60A5FA',
    },
    animation: 'smooth',
    borderRadius: '0.75rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  gradient: {
    name: 'gradient',
    label: 'متدرج',
    colors: {
      primary: '#7C3AED',
      secondary: '#F3E8FF',
      accent: '#EC4899',
      background: '#FAF5FF',
      surface: '#FFFFFF',
      text: '#1F1F1F',
      textMuted: '#6B7280',
      border: '#E9D5FF',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#8B5CF6',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
    },
    animation: 'modern',
    borderRadius: '1rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  dark: {
    name: 'dark',
    label: 'داكن',
    colors: {
      primary: '#E5E5E5',
      secondary: '#27272A',
      accent: '#A1A1AA',
      background: '#09090B',
      surface: '#18181B',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      border: '#27272A',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    animation: 'minimal',
    borderRadius: '0.5rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  gold: {
    name: 'gold',
    label: 'ذهبي',
    colors: {
      primary: '#B45309',
      secondary: '#FFFBEB',
      accent: '#D97706',
      background: '#FFFCF5',
      surface: '#FFFFFF',
      text: '#292524',
      textMuted: '#78716C',
      border: '#FDE68A',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    animation: 'smooth',
    borderRadius: '0.75rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  neon: {
    name: 'neon',
    label: 'نيون',
    colors: {
      primary: '#00FF88',
      secondary: '#0D1117',
      accent: '#FF00FF',
      background: '#010409',
      surface: '#0D1117',
      text: '#E6EDF3',
      textMuted: '#8B949E',
      border: '#30363D',
      success: '#00FF88',
      warning: '#FFA500',
      error: '#FF4444',
      info: '#00CCFF',
    },
    animation: 'digital',
    borderRadius: '0.375rem',
    fontFamily: 'monospace',
  },
  hallaqi: {
    name: 'hallaqi',
    label: 'حلاقي',
    colors: {
      primary: '#0F766E',
      secondary: '#164E63',
      accent: '#F59E0B',
      background: '#F0FDFA',
      surface: '#FFFFFF',
      text: '#134E4A',
      textMuted: '#5E7C7A',
      border: '#CCFBF1',
      success: '#0D9488',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      gradient: 'linear-gradient(135deg, #0F766E 0%, #164E63 100%)',
    },
    animation: 'modern',
    borderRadius: '1rem',
    fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
};

export const animationStyles: Record<AnimationStyle, { label: string; description: string }> = {
  smooth: {
    label: 'سلس',
    description: 'انتقالات ناعمة وهادئة',
  },
  modern: {
    label: 'عصري',
    description: 'حركات ديناميكية أنيقة',
  },
  digital: {
    label: 'رقمي',
    description: 'تأثيرات تقنية سريعة',
  },
  bouncy: {
    label: 'مرن',
    description: 'حركات مرنة ونابضة',
  },
  minimal: {
    label: 'بسيط',
    description: 'بدون حركات زائدة',
  },
};

export const getThemeCSS = (theme: ThemeConfig): string => {
  const c = theme.colors;
  return `
    --primary: ${c.primary};
    --secondary: ${c.secondary};
    --accent: ${c.accent};
    --background: ${c.background};
    --surface: ${c.surface};
    --text: ${c.text};
    --text-muted: ${c.textMuted};
    --border: ${c.border};
    --success: ${c.success};
    --warning: ${c.warning};
    --error: ${c.error};
    --info: ${c.info};
    --radius: ${theme.borderRadius};
    --font-family: ${theme.fontFamily};
    ${c.gradient ? `--gradient: ${c.gradient};` : ''}
  `;
};
