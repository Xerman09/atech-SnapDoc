export interface AppPalette {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  heroBg: string;
  heroBorder: string;
  heroText: string;
  heroSubtext: string;
  border: string;
  borderSubtle: string;
  success: string;
  warning: string;
  danger: string;
}

/**
 * Architectural Paper (Light) & Obsidian Studio (Dark) palettes.
 * All text/background pairs maintain >= 4.5:1 WCAG AA contrast.
 */
export const lightPalette: AppPalette = {
  background: '#F5F4F0',
  surface: '#FFFFFF',
  surfaceElevated: '#EFEDE7',
  textPrimary: '#111318',
  textSecondary: '#4A505C',
  textMuted: '#68707E',
  primary: '#111318',
  primaryText: '#FFFFFF',
  accent: '#1546B8',
  accentSoft: '#EBF1FC',
  heroBg: '#1546B8',
  heroBorder: '#123B9C',
  heroText: '#FFFFFF',
  heroSubtext: '#DCE7FE',
  border: '#DFDDD5',
  borderSubtle: '#ECEAE3',
  success: '#157A3D',
  warning: '#A85208',
  danger: '#B42318',
};

export const darkPalette: AppPalette = {
  background: '#090A0D',
  surface: '#12141A',
  surfaceElevated: '#1B1E27',
  textPrimary: '#F4F5F7',
  textSecondary: '#A3AAB8',
  textMuted: '#7C8494',
  primary: '#F4F5F7',
  primaryText: '#090A0D',
  accent: '#6EA8FE',
  accentSoft: '#162238',
  heroBg: '#1D4ED8',
  heroBorder: '#3B82F6',
  heroText: '#FFFFFF',
  heroSubtext: '#DBEAFE',
  border: '#272B36',
  borderSubtle: '#1D202A',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
};
