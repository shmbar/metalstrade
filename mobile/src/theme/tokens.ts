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

import { Platform } from 'react-native';

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

// Web parity: "Plus Jakarta Sans — the only family in the app" (CLAUDE.md).
// `display` was Inter_700Bold — web's own .text-display comment explains why
// that's wrong at this size: "600, not the reference's 700. At 22px Jakarta a
// full bold reads heavy at the top of every screen; semibold keeps the
// hierarchy without the weight." `mono` was never actually monospaced (plain
// Inter_600SemiBold) despite the name — web's one documented exception to
// "everything is Jakarta" is --font-mono, a system monospace stack for
// IDs/hashes (globals.css:297), which RN reaches via Platform.select rather
// than a single cross-platform family string.
//
// The ladder below is the WHOLE type system (client review 2026-09-16: "many things
// with font size, uneven"). Screens were reaching past it — 9, 10, 10.5, 15, 16, 18, 20,
// 24 and 36px set inline, and ~60 captions or body lines re-weighted by hand — because
// roles they needed had no variant: a table header, a chip, a bold total, an uppercase
// eyebrow, a KPI figure. Every one of those roles is a variant now, so a screen never
// sets fontSize/fontFamily itself. Weight carries one meaning, as on web: 600 = label or
// header, 500 = figure, 400 = body. Digits are tabular everywhere (Text applies it), so
// columns of amounts line up.
const JAKARTA = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
} as const;

export const typography = {
  /** the one hero number on the dashboard */
  hero: { fontFamily: JAKARTA.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.7 },
  display: { fontFamily: JAKARTA.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  /** tab-root screen title — web's --fs-page is 16; a phone title carries a little more */
  h1: { fontFamily: JAKARTA.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  /** stack screen / sheet title */
  h2: { fontFamily: JAKARTA.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  /** card and section title — web's --fs-title (13–14) */
  h3: { fontFamily: JAKARTA.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  /** a card's headline figure — web's --fs-stat (20–24) */
  statLg: { fontFamily: JAKARTA.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  /** KPI tile figure */
  stat: { fontFamily: JAKARTA.medium, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  /** a key figure inside a row or tile */
  figure: { fontFamily: JAKARTA.medium, fontSize: 15, lineHeight: 20 },
  /** web's --fs-body is 11–13; 13 is the phone's floor for running text */
  body: { fontFamily: JAKARTA.regular, fontSize: 13, lineHeight: 18 },
  bodyMedium: { fontFamily: JAKARTA.medium, fontSize: 13, lineHeight: 18 },
  /** button titles, totals, emphasised row text */
  bodyStrong: { fontFamily: JAKARTA.semibold, fontSize: 13, lineHeight: 18 },
  /** text typed into or chosen in a field — every field, so a form reads as one */
  input: { fontFamily: JAKARTA.regular, fontSize: 14, lineHeight: 19 },
  /** field labels, tile labels, segmented options — web's --fs-input */
  label: { fontFamily: JAKARTA.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 0.1 },
  caption: { fontFamily: JAKARTA.regular, fontSize: 11, lineHeight: 15 },
  /** a small figure — 500 is the figure weight */
  captionMedium: { fontFamily: JAKARTA.medium, fontSize: 11, lineHeight: 15 },
  /** chip and badge text, small status text */
  captionStrong: { fontFamily: JAKARTA.semibold, fontSize: 11, lineHeight: 15 },
  /** uppercase eyebrow above a group */
  overline: { fontFamily: JAKARTA.semibold, fontSize: 10, lineHeight: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  /** dense fixed-width grids (material tables, statements) — web's --fs-table rung */
  table: { fontFamily: JAKARTA.regular, fontSize: 11, lineHeight: 14 },
  tableStrong: { fontFamily: JAKARTA.semibold, fontSize: 11, lineHeight: 14 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, lineHeight: 16 },
} as const;

/** How far system Larger Text may grow the app's type before rows and controls stop fitting. */
/*
 * Client review 2026-09-18 ("some font sizes are still too large"): the ladder above sat one
 * rung above web's everywhere (body 14 vs web's 11–13, titles 16–22 vs 13–16), and system
 * Larger Text could add a further 25% on top. Every rung now sits on web's scale — a phone
 * keeps one size more for running text — and Larger Text may add at most 10%, so a dense
 * ledger stays a ledger on any phone.
 */
export const MAX_FONT_SCALE = 1.1;

/**
 * Layout rhythm. Measured across every screen before choosing: most already stacked
 * cards 12 apart and inset card content 14, but lists used 10 or 12 and detail screens
 * 14, and controls sat at 34/36/44/48/50 tall — so two screens side by side never
 * lined up. These are the values the primitives use; screens use them too.
 */
export const layout = {
  /** screen side gutter */
  gutter: spacing.lg,
  /** content inset inside a card */
  cardInset: 12,
  /** a row inside a card: vertical padding */
  rowPad: 10,
  /** between stacked cards and sections */
  stack: 10,
  /** under a screen header */
  headerGap: 12,
  /** buttons, text fields, selects, date fields — iOS's own control height */
  controlHeight: 44,
  /** chips, filter pills */
  pillHeight: 32,
  /** round icon buttons, back button */
  iconButton: 36,
  /** leading avatar / icon disc in a row */
  leading: 36,
  /** icon disc in a section header */
  sectionIcon: 28,
  /** trailing chevron width — reserved even when a row has none, so figures line up */
  trailing: 16,
} as const;

export type ColorSchemeName = 'light' | 'dark';

export const getColors = (scheme: ColorSchemeName): ThemeColors =>
  scheme === 'dark' ? darkColors : lightColors;

/**
 * Space after the last row of a list. Lists sit above the tab bar, which already
 * reserves the device's bottom inset — so this is breathing room only, not inset.
 * A list with a floating create button uses FAB_CLEARANCE instead.
 */
export const LIST_END_PADDING = spacing.xl;
