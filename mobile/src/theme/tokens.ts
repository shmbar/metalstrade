// Design tokens — the single source of truth for the mobile design system.
//
// Every colour below is the RESOLVED value of a web token from app/globals.css
// (light) and utils/themes.js DARK_* (dark). React Native cannot read CSS custom
// properties, so the values are inlined — but nothing here is invented: if a colour
// is not traceable to a web token, it does not belong in this file.
//
// Re-derived 2026-08-17 when web moved from the old blue brand to violet. Mobile
// had been left on #0366ae while web was on #6D5CE0, so the two apps did not look
// like the same product.
//
// The status families are deliberately MUTED (client revision 2026-08-08). Mobile
// had bright #0f9d58 / #dc2626 / #e08600 where web uses #2E6A4F / #98393B / #805A28.
// Do not "brighten" these back — the muting was the client's explicit request.

export const palette = {
  // --brand / --endeavour, and its light+dark partners
  brand: '#6D5CE0',
  brandDark: '#8B7CF7',
  brandStrong: '#A497FF',

  // --violet-* (the brand family used for chips/info)
  violetBg: '#EEEBFC',
  violetBorder: '#D6CFF7',
  violetText: '#5A49CB',

  // --ok-* / --danger-* / --warn-* — muted, per the client revision
  okBg: '#E6EFE9',
  okBorder: '#C6DACE',
  okText: '#2E6A4F',
  okFigure: '#37815F',
  dangerBg: '#F2E4E3',
  dangerBorder: '#DFC2C0',
  dangerText: '#98393B',
  warnBg: '#F5EBDB',
  warnBorder: '#E1CBAD',
  warnText: '#805A28',
  pinkText: '#6A5677',
  tealText: '#2F6560',
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

// Light mode — app/globals.css :root, resolved.
export const lightColors: ThemeColors = {
  bg: '#F7F6FB',           // --bg-page   (violet-tinted, not neutral grey)
  bgElevated: '#FFFFFF',   // --bg-card
  surface: '#FFFFFF',      // --bg-card
  surfaceAlt: '#F4F3F9',   // --bg-subtle — input / inset fills
  card: '#FFFFFF',         // --bg-card
  border: '#EAE8F2',       // --line
  borderStrong: '#DAD6E8', // --line-strong
  text: '#1E1B39',         // --ink
  textMuted: '#48455E',    // --ink-secondary
  textFaint: '#5B5875',    // --ink-muted
  primary: palette.brand,
  primaryText: '#FFFFFF',
  tabBar: '#FFFFFF',       // --bg-card
  tabActive: palette.brand,
  tabInactive: '#5B5875',  // --ink-muted
  positive: palette.okText,
  negative: palette.dangerText,
  warn: palette.warnText,
  info: palette.violetText,
};

// Dark mode — utils/themes.js DARK_NEUTRALS / DARK_SIGNATURE / DARK_STATUS,
// resolved. Web's dark is hue-tinted rather than neutral black, and every status
// value there was measured at 6.5:1+ against --bg-card; keep them together.
export const darkColors: ThemeColors = {
  bg: '#131120',           // --bg-page
  bgElevated: '#1B1830',   // --bg-card
  surface: '#1B1830',      // --bg-card
  surfaceAlt: '#232038',   // --bg-subtle
  card: '#1B1830',         // --bg-card
  border: '#2E2A4A',       // --line
  borderStrong: '#3A3560', // --line-strong
  text: '#EDEBFA',         // --ink
  textMuted: '#B6B2D0',    // --ink-secondary
  textFaint: '#A5A0C0',    // --ink-muted
  primary: palette.brandDark,
  primaryText: '#131120',
  tabBar: '#1B1830',       // --bg-card
  tabActive: palette.brandDark,
  tabInactive: '#A5A0C0',  // --ink-muted
  positive: '#74B896',     // --ok-text (dark)
  negative: '#DE8A88',     // --danger-text (dark)
  warn: '#D5B17B',         // --warn-text (dark)
  info: '#A99EF5',         // --violet-text (dark)
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
  return { shadowColor: '#1E1B39', shadowOpacity: map.o, shadowRadius: map.r, shadowOffset: { width: 0, height: map.h }, elevation: map.e };
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
