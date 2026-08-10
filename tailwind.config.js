/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
		"./node_modules/react-tailwindcss-datepicker/dist/index.esm.js",
	],
	theme: {
		extend: {
			/* One family. `font-inter` is gone (see app/layout.js); sans and display
			   are the same stack so `font-sans` and `font-display` cannot drift. */
			fontFamily: {
				sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
				display: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
			},
			/* ── Less bold (client revision 2026-08-08) ───────────────────────────
			   `font-bold` is remapped from 700 to 600, which is the single edit that
			   takes the weight down across all ~600 font-bold call sites without
			   touching one of them. 600 is the ceiling for UI chrome: headings,
			   column labels, totals labels. 700 is still reachable as font-extrabold
			   for the marketing hero, which is the only place it earns its keep.
			   Numeric content goes lighter still — see the .numeric / .tnum rule in
			   globals.css, which pins figures to 500. */
			fontWeight: {
				normal: '400',
				medium: '500',
				semibold: '600',
				bold: '600',
				extrabold: '700',
				black: '700',
			},
			/* ── Density (client revision 2026-08-08: "everything is too big") ──────
			   Rescaling the SPACING SCALE is the one edit that compacts padding,
			   gaps, margins and control heights everywhere at once, because every
			   p-* / px-* / py-* / m-* / gap-* / space-* / h-* / w-* / inset-* class
			   in the app reads from it. The alternative — retuning ~2,900 utility
			   classes across 316 files — would have been both enormous and unstable,
			   and it is exactly the page-by-page drift the design audit removed.

			   Roughly -12.5%, snapped to whole pixels so nothing lands on a half
			   pixel and blurs. The control band comes out where the reference sits:
			     h-7 28->24   h-8 32->28   h-9 36->32   h-10 40->36
			   and the common paddings tighten without collapsing:
			     p-2 8->7   p-3 12->10   p-4 16->14   p-5 20->16   p-6 24->20

			   Deliberately NOT rescaled:
			     · 0 / px / 0.5 / 1  — already at or below 4px; -12.5% is sub-pixel.
			     · 11 and above      — these are LAYOUT sizes, not spacing: w-20/w-24/
			                           w-28 are table column widths (106 uses of w-24
			                           alone) and h-60/h-80 are scroll-box heights.
			                           Narrowing columns is how you get the clipped
			                           text the same client is complaining about, so
			                           the density pass stops short of them.
			   The scale stays monotonic across the seam (h-10 = 2.25rem < h-11 =
			   2.75rem), so no utility inverts against its neighbour. */
			spacing: {
				1.5: '0.3125rem',  /*  6 ->  5 */
				2:   '0.4375rem',  /*  8 ->  7 */
				2.5: '0.5rem',     /* 10 ->  8 */
				3:   '0.625rem',   /* 12 -> 10 */
				3.5: '0.75rem',    /* 14 -> 12 */
				4:   '0.875rem',   /* 16 -> 14 */
				5:   '1rem',       /* 20 -> 16 */
				6:   '1.25rem',    /* 24 -> 20 */
				7:   '1.5rem',     /* 28 -> 24 */
				8:   '1.75rem',    /* 32 -> 28 */
				9:   '2rem',       /* 36 -> 32 */
				10:  '2.25rem',    /* 40 -> 36 */
			},
			gridTemplateColumns: {
				'21': 'repeat(21, minmax(0, 1fr))'
			},
			backgroundImage: {
				LoginBG: "url('/login/loginBG.jpg')",
			},
			colors: {
				/* SaaS design tokens (globals.css :root) — the semantic vocabulary the
				   redesigned components use: bg-page, bg-surface, text-ink, border-line… */
				page: 'var(--bg-page)',
				surface: 'var(--bg-card)',
				subtle: 'var(--bg-subtle)',
				sunken: 'var(--bg-sunken)',
				line: {
					DEFAULT: 'var(--line)',
					strong: 'var(--line-strong)',
				},
				ink: {
					DEFAULT: 'var(--ink)',
					secondary: 'var(--ink-secondary)',
					muted: 'var(--ink-muted)',
				},
				brand: {
					DEFAULT: 'var(--brand)',
					strong: 'var(--brand-strong)',
					soft: 'var(--brand-soft)',
					line: 'var(--brand-border)',
				},
				ok: { bg: 'var(--ok-bg)', text: 'var(--ok-text)', line: 'var(--ok-border)' },
				warn: { bg: 'var(--warn-bg)', text: 'var(--warn-text)', line: 'var(--warn-border)' },
				bad: { bg: 'var(--bad-bg)', text: 'var(--bad-text)', line: 'var(--bad-border)' },
				info: { bg: 'var(--info-bg)', text: 'var(--info-text)', line: 'var(--info-border)' },
				/* customBlue / customLavender / customOrange / customLime were four raw
				   hexes with no remaining call sites (the `variant='customBlue'` uses are
				   a cva Button variant, not this colour). Removed rather than re-pointed:
				   an unused bright orange in the palette is an invitation. */
				/* Palette shades re-pointed at the themable tokens so utility classes
				   like bg-gray-50 / text-red-600 / border-slate-500 follow dark mode.

				   The 400/500 mid tones USED to be left at Tailwind's defaults, on the
				   reasoning that "accent fills read fine in both modes". They read fine
				   and they were the loudest thing on the screen — Tailwind's 400/500 are
				   tuned for marketing sites, not a finance table. Those exact shades are
				   what the client saw as "bright pink/orange" and "green that doesn't
				   match": text-green-500, bg-emerald-500, text-orange-500, bg-amber-400.
				   They are now mapped onto the same muted families as everything else,
				   which removes the hue at the TOKEN layer — one edit instead of a hunt
				   through 36 files, and no way for a new call site to reintroduce it.

				   orange/emerald/rose have no palette of their own by design: orange IS
				   warn, emerald IS ok, rose IS danger. Collapsing the synonyms is what
				   stops the same state being drawn in two different colours on two
				   different pages. */
				gray: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)', 300: 'var(--border-neutral-strong)', 500: 'var(--text-mid)', 600: 'var(--text-mid)', 700: 'var(--text-strong)' },
				slate: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)', 300: 'var(--border-neutral-strong)', 500: 'var(--text-mid)', 600: 'var(--text-mid)', 700: 'var(--text-strong)' },
				zinc: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)', 300: 'var(--border-neutral-strong)' },
				neutral: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)' },
				red: { 50: 'var(--danger-soft)', 100: 'var(--danger-bg)', 200: 'var(--danger-border)', 300: 'var(--danger-border)', 400: 'var(--danger-text)', 500: 'var(--danger-text)', 600: 'var(--danger-text)', 700: 'var(--danger-strong)', 800: 'var(--danger-strong)', 900: 'var(--danger-strong)' },
				rose: { 50: 'var(--danger-soft)', 100: 'var(--danger-bg)', 200: 'var(--danger-border)', 300: 'var(--danger-border)', 400: 'var(--danger-text)', 500: 'var(--danger-text)', 600: 'var(--danger-text)', 700: 'var(--danger-strong)' },
				green: { 50: 'var(--ok-soft)', 100: 'var(--ok-bg)', 200: 'var(--ok-border)', 300: 'var(--ok-border)', 400: 'var(--ok-text)', 500: 'var(--ok-text)', 600: 'var(--ok-text)', 700: 'var(--ok-strong)', 800: 'var(--ok-strong)', 900: 'var(--ok-strong)' },
				emerald: { 50: 'var(--ok-soft)', 100: 'var(--ok-bg)', 200: 'var(--ok-border)', 300: 'var(--ok-border)', 400: 'var(--ok-text)', 500: 'var(--ok-text)', 600: 'var(--ok-text)', 700: 'var(--ok-strong)', 800: 'var(--ok-strong)' },
				teal: { 50: 'var(--ok-soft)', 100: 'var(--ok-bg)', 400: 'var(--teal-text)', 500: 'var(--teal-text)', 600: 'var(--teal-text)', 700: 'var(--teal-text)' },
				amber: { 50: 'var(--warn-soft)', 100: 'var(--warn-bg)', 200: 'var(--warn-border)', 300: 'var(--warn-border)', 400: 'var(--warn-text)', 500: 'var(--warn-text)', 600: 'var(--warn-text)', 700: 'var(--warn-strong)', 800: 'var(--warn-strong)' },
				orange: { 50: 'var(--warn-soft)', 100: 'var(--warn-bg)', 200: 'var(--warn-border)', 300: 'var(--warn-border)', 400: 'var(--warn-text)', 500: 'var(--warn-text)', 600: 'var(--warn-text)', 700: 'var(--warn-strong)', 800: 'var(--warn-strong)' },
				yellow: { 50: 'var(--warn-soft)', 100: 'var(--warn-bg)', 200: 'var(--warn-border)', 300: 'var(--warn-border)', 400: 'var(--warn-text)', 500: 'var(--warn-text)', 600: 'var(--warn-text)', 700: 'var(--warn-strong)' },
				blue: { 50: 'var(--selago)', 100: 'var(--surface-header)', 200: 'var(--border-divider)', 300: 'var(--rock-blue)', 500: 'var(--primary-bright)', 600: 'var(--primary-bright)', 900: 'var(--chathams-blue)' },
				purple: { 50: 'var(--violet-soft)', 100: 'var(--violet-bg)' },
				violet: { 50: 'var(--violet-soft)', 100: 'var(--violet-bg)' },
				indigo: { 50: 'var(--violet-soft)', 100: 'var(--violet-bg)' },
				pink: { 50: 'var(--pink-soft)', 100: 'var(--pink-bg)', 200: 'var(--pink-border)', 300: 'var(--pink-border)', 400: 'var(--pink-text)', 500: 'var(--pink-text)', 600: 'var(--pink-text)', 700: 'var(--pink-strong)' },
				fuchsia: { 50: 'var(--pink-soft)', 100: 'var(--pink-bg)', 400: 'var(--pink-text)', 500: 'var(--pink-text)', 600: 'var(--pink-text)', 700: 'var(--pink-strong)' },
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-zoom-in': {
					'0%': {
						opacity: 0,
						transform: 'scale(0.95)'
					},
					'100%': {
						opacity: 1,
						transform: 'scale(1)'
					}
				},
				'fade-zoom-out': {
					'0%': {
						opacity: 1,
						transform: 'scale(1)'
					},
					'100%': {
						opacity: 0,
						transform: 'scale(0.95)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-zoom-in': 'fade-zoom-in 200ms ease-out forwards',
				'fade-zoom-out': 'fade-zoom-out 200ms ease-in forwards'
			},
			/* One radius (see the --radius note in globals.css). 2xl/3xl are mapped
			   here rather than left at Tailwind's 16px/24px defaults because ~180
			   call sites already say rounded-2xl; pointing the utility at the token
			   converges them without editing a single component. */
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'2xl': 'var(--radius-card)',
				'3xl': 'var(--radius-card)',
				card: 'var(--radius-card)',
				panel: 'var(--radius-panel)',
				control: 'var(--radius-control)',
			},
			/* Shadows re-pointed at themable tokens (design-audit/TOKENS.md §5.2).
			   Tailwind's defaults hardcode rgba(0,0,0,…), which is invisible on a
			   dark surface — that was a large part of the "dark mode looks flat"
			   report. This one change themes all 348 shadow-* usages in the app.
			   It also collapses 5 shadow steps into the 3 the spec allows:
			   xl and 2xl now resolve to the same value as lg. */
			boxShadow: {
				/* SaaS tiers — shadow-card is the default resting elevation for
				   page cards / KPI cards; raised for hover; pop for overlays. */
				card: 'var(--shadow-xs)',
				raised: 'var(--shadow-sm)',
				pop: 'var(--shadow-md)',
				sm: 'var(--shadow-sm)',
				DEFAULT: 'var(--shadow-md)',
				md: 'var(--shadow-md)',
				lg: 'var(--shadow-lg)',
				xl: 'var(--shadow-lg)',
				'2xl': 'var(--shadow-lg)',
				inner: 'inset 0 2px 4px 0 rgb(var(--shadow-rgb) / 0.06)',
				none: 'none',
			},
			zIndex: {
				sticky: 'var(--z-sticky)',
				'page-popover': 'var(--z-page-popover)',
				appbar: 'var(--z-appbar)',
				dropdown: 'var(--z-dropdown)',
				popover: 'var(--z-popover)',
				modal: 'var(--z-modal)',
				'modal-nested': 'var(--z-modal-nested)',
				toast: 'var(--z-toast)',
				tooltip: 'var(--z-tooltip)',
				command: 'var(--z-command)',
			},
			screens: {
				'3xl': '1920px',
			}
		},
		container: {
			maxWidth: '1700px'
		}
	},
	plugins: [require("tailwindcss-animate")],
	layers: ['components', 'utilities', 'app'], // or simply use a default layer like `components`
}

