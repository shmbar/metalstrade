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
			}
		},
		container: {
			maxWidth: '1700px'
		}
	},
	plugins: [require("tailwindcss-animate")],
	layers: ['components', 'utilities', 'app'], // or simply use a default layer like `components`
}

