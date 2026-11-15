export interface AppPalette {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primaryText: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

/**
 * Light & Dark palettes designed for WCAG AA (>= 4.5:1) text contrast.
 */
export const lightPalette: AppPalette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  primary: '#1D4ED8',
  primaryText: '#FFFFFF',
  border: '#CBD5E1',
  success: '#15803D',
  warning: '#B45309',
  danger: '#B91C1C',
};

export const darkPalette: AppPalette = {
  background: '#0B1120',
  surface: '#111827',
  surfaceElevated: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#60A5FA',
  primaryText: '#0B1120',
  border: '#334155',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
};
