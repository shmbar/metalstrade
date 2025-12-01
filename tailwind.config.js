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
			gridTemplateColumns: {
				'21': 'repeat(21, minmax(0, 1fr))'
			},
			backgroundImage: {
				LoginBG: "url('/login/loginBG.jpg')"
			},
			colors: {
				customBlue: '#096EB6',
				customLavender: '#CCC0DA',
				customOrange: '#E26B0A',
				customLavender: '#B1A0C7',
				customLime: '#92D050',
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
				"fade-zoom-in": {
					"0%": { opacity: 0, transform: "scale(0.95)" },
					"100%": { opacity: 1, transform: "scale(1)" },
				},
				"fade-zoom-out": {
					"0%": { opacity: 1, transform: "scale(1)" },
					"100%": { opacity: 0, transform: "scale(0.95)" },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				"fade-zoom-in": "fade-zoom-in 200ms ease-out forwards",
				"fade-zoom-out": "fade-zoom-out 200ms ease-in forwards",
			}
		},
		container: {
			maxWidth: '1700px'
		}
	},
	plugins: [],
	layers: ['components', 'utilities', 'app'], // or simply use a default layer like `components`
}

