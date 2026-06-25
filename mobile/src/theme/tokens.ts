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
  bg: '#f4f6fb',          // soft cool canvas (not pure white)
  bgElevated: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#eef2f8',  // input / inset fills
  card: '#ffffff',
  border: '#e7ecf3',      // hairline
  borderStrong: '#d6deea',
  text: '#0f1b35',        // deep ink
  textMuted: '#5a6a85',
  textFaint: '#97a3b8',
  primary: palette.endeavour,
  primaryText: '#ffffff',
  tabBar: '#ffffff',
  tabActive: palette.endeavour,
  tabInactive: '#a6b2c6',
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
    sm: { o: 0.05, r: 10, h: 3, e: 1 },
    md: { o: 0.07, r: 20, h: 10, e: 3 },
    lg: { o: 0.1, r: 32, h: 18, e: 6 },
  }[level];
  return { shadowColor: '#0f1b35', shadowOpacity: map.o, shadowRadius: map.r, shadowOffset: { width: 0, height: map.h }, elevation: map.e };
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
  xl: 20,
  '2xl': 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: 'Poppins_700Bold', fontSize: 28, lineHeight: 34 },
  h1: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 28 },
  h2: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 24 },
  h3: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 20 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: 'Poppins_500Medium', fontSize: 14, lineHeight: 20 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 14 },
  mono: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, lineHeight: 24 },
} as const;

export type ColorSchemeName = 'light' | 'dark';

export const getColors = (scheme: ColorSchemeName): ThemeColors =>
  scheme === 'dark' ? darkColors : lightColors;
