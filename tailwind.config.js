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
			fontFamily: {
				poppins: ['var(--font-poppins)', 'sans-serif'],
			},
			gridTemplateColumns: {
				'21': 'repeat(21, minmax(0, 1fr))'
			},
			backgroundImage: {
				LoginBG: "url('/login/loginBG.jpg')",
			},
			colors: {
				customBlue: '#096EB6',
				customLavender: '#B1A0C7',
				customOrange: '#E26B0A',
				customLime: '#92D050',
				/* Palette shades re-pointed at the themable tokens so utility classes
				   like bg-gray-50 / text-red-600 / border-slate-500 follow dark mode.
				   Light values ≈ Tailwind defaults (visually identical). Shades NOT
				   listed keep their defaults on purpose: mid tones (400/500 accents,
				   button bgs like bg-green-500 / bg-red-500) read fine on both modes. */
				gray: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)', 300: 'var(--border-neutral-strong)', 500: 'var(--text-mid)', 600: 'var(--text-mid)', 700: 'var(--text-strong)' },
				slate: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)', 300: 'var(--border-neutral-strong)', 500: 'var(--text-mid)', 600: 'var(--text-mid)', 700: 'var(--text-strong)' },
				zinc: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)', 300: 'var(--border-neutral-strong)' },
				neutral: { 50: 'var(--surface-base)', 100: 'var(--surface-muted)', 200: 'var(--border-neutral)' },
				red: { 50: 'var(--danger-soft)', 100: 'var(--danger-bg)', 200: 'var(--danger-border)', 300: 'var(--danger-border)', 600: 'var(--danger-text)', 700: 'var(--danger-strong)' },
				green: { 50: 'var(--ok-soft)', 100: 'var(--ok-bg)', 200: 'var(--ok-border)', 300: 'var(--ok-border)', 600: 'var(--ok-text)', 700: 'var(--ok-strong)' },
				emerald: { 50: 'var(--ok-soft)', 100: 'var(--ok-bg)' },
				amber: { 50: 'var(--warn-soft)', 100: 'var(--warn-bg)', 200: 'var(--warn-border)', 300: 'var(--warn-border)', 600: 'var(--warn-text)', 700: 'var(--warn-strong)', 800: 'var(--warn-strong)' },
				yellow: { 50: 'var(--warn-soft)', 100: 'var(--warn-bg)', 200: 'var(--warn-border)' },
				blue: { 50: 'var(--selago)', 100: 'var(--surface-header)', 200: 'var(--border-divider)', 300: 'var(--rock-blue)', 500: 'var(--primary-bright)', 600: 'var(--primary-bright)', 900: 'var(--chathams-blue)' },
				purple: { 50: 'var(--violet-soft)', 100: 'var(--violet-bg)' },
				violet: { 50: 'var(--violet-soft)', 100: 'var(--violet-bg)' },
				indigo: { 50: 'var(--violet-soft)', 100: 'var(--violet-bg)' },
				pink: { 50: 'var(--pink-soft)', 100: 'var(--pink-bg)' },
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
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			/* Shadows re-pointed at themable tokens (design-audit/TOKENS.md §5.2).
			   Tailwind's defaults hardcode rgba(0,0,0,…), which is invisible on a
			   dark surface — that was a large part of the "dark mode looks flat"
			   report. This one change themes all 348 shadow-* usages in the app.
			   It also collapses 5 shadow steps into the 3 the spec allows:
			   xl and 2xl now resolve to the same value as lg. */
			boxShadow: {
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

