// Design tokens — the single source of truth for the mobile design system.
// Brand hues are ported from the web app (globals.css) so the apps feel related,
// but the mobile palette is rebuilt for a premium, executive SaaS look (Linear /
// Stripe / Mercury) with full light + dark support.

export const palette = {
  // Brand blues (from web --endeavour / --chathams-blue / --port-gore)
  endeavour: '#0366ae',
  chathamsBlue: '#103a7a',
  portGore: '#28264f',

  brand50: '#f8fbff',
  brand100: '#dbeeff',
  brand200: '#b8ddf8',
  brand500: '#0366ae',
  brand600: '#055a9c',
  brand700: '#103a7a',

  // Semantic
  positive: '#16a34a',
  positiveBg: '#dcfce7',
  negative: '#dc2626',
  negativeBg: '#fee2e2',
  warn: '#f59e0b',
  warnBg: '#fffbeb',
  info: '#2563eb',
} as const;

export interface ThemeColors {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  positive: string;
  negative: string;
  warn: string;
  info: string;
}

// Premium light mode — layered cool-gray canvas with white cards (Stripe / Linear /
// Vercel feel). Never flat pure-white; surfaces are stacked with soft shadows.
export const lightColors: ThemeColors = {
  bg: '#f5f6f8',          // calm neutral canvas (not pure white)
  bgElevated: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f0f1f4',  // input / inset fills
  card: '#ffffff',
  border: '#e6e8ed',      // hairline
  borderStrong: '#d5d9e0',
  text: '#111827',        // neutral ink
  textMuted: '#5b6472',
  textFaint: '#98a1b2',
  primary: palette.endeavour,
  primaryText: '#ffffff',
  tabBar: '#ffffff',
  tabActive: palette.endeavour,
  tabInactive: '#9aa4b5',
  positive: '#0f9d58',
  negative: '#dc2626',
  warn: '#e08600',
  info: '#2563eb',
};

// Premium dark mode — deep navy (not pure black), layered surfaces, luminous
// accents (Linear Dark / Raycast / Stripe Dark feel).
export const darkColors: ThemeColors = {
  bg: '#080e1c',          // deep navy canvas
  bgElevated: '#101a2e',
  surface: '#0f1a30',
  surfaceAlt: '#172441',
  card: '#0f1a30',
  border: '#1f2c49',
  borderStrong: '#2c3c5e',
  text: '#eef3fd',
  textMuted: '#a3b3d2',
  textFaint: '#6a7b9c',
  primary: '#56a8ee',
  primaryText: '#04101f',
  tabBar: '#0a1322',
  tabActive: '#69b4f3',
  tabInactive: '#56678a',
  positive: '#34d399',
  negative: '#f87171',
  warn: '#fbbf24',
  info: '#60a5fa',
};

// Soft, layered elevation presets per scheme (premium, not heavy).
export type Elevation = 'sm' | 'md' | 'lg';
export const getShadow = (scheme: 'light' | 'dark', level: Elevation = 'md') => {
  if (scheme === 'dark') {
    const map = {
      sm: { o: 0.3, r: 10, h: 4, e: 2 },
      md: { o: 0.4, r: 18, h: 10, e: 4 },
      lg: { o: 0.5, r: 28, h: 16, e: 8 },
    }[level];
    return { shadowColor: '#000000', shadowOpacity: map.o, shadowRadius: map.r, shadowOffset: { width: 0, height: map.h }, elevation: map.e };
  }
  const map = {
    sm: { o: 0.04, r: 6, h: 1, e: 1 },
    md: { o: 0.05, r: 10, h: 3, e: 1 },
    lg: { o: 0.14, r: 26, h: 12, e: 7 },
  }[level];
  return { shadowColor: '#1b2a4a', shadowOpacity: map.o, shadowRadius: map.r, shadowOffset: { width: 0, height: map.h }, elevation: map.e };
};

// 4pt spacing grid.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 16,
  '2xl': 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h1: { fontFamily: 'Inter_600SemiBold', fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  h2: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  h3: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20, letterSpacing: -0.15 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14 },
  mono: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 24 },
} as const;

export type ColorSchemeName = 'light' | 'dark';

export const getColors = (scheme: ColorSchemeName): ThemeColors =>
  scheme === 'dark' ? darkColors : lightColors;
