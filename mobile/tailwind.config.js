/** @type {import('tailwindcss').Config} */
// Brand palette ported from the web app's globals.css CSS variables so the
// mobile design system stays visually consistent with the CRM. Dark-mode
// tokens are applied at runtime via the theme store (see src/theme).
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        endeavour: '#0366ae', // primary blue
        'chathams-blue': '#103a7a', // dark blue
        'port-gore': '#28264f', // dark text
        'regent-gray': '#8e9aaf',
        'rock-blue': '#9bb4cc',
        brand: {
          50: '#f8fbff',
          100: '#dbeeff',
          200: '#b8ddf8',
          300: '#8ec5f0',
          400: '#4f9fdf',
          500: '#0366ae',
          600: '#055a9c',
          700: '#103a7a',
          800: '#16315f',
          900: '#0f2342',
        },
        positive: '#16a34a',
        negative: '#dc2626',
        warn: '#f59e0b',
      },
      fontFamily: {
        sans: ['Poppins_400Regular'],
        medium: ['Poppins_500Medium'],
        semibold: ['Poppins_600SemiBold'],
        bold: ['Poppins_700Bold'],
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [],
};
