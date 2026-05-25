import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// utils.js is a .js file that contains JSX (e.g. the ErrDiv helper). Next.js's
// swc transforms it fine at build time, but vitest uses vite — we need the
// React plugin configured to also pick up JSX inside .js files (the default
// only matches .jsx/.tsx).
export default defineConfig({
  plugins: [
    react({
      include: /\.(js|jsx|ts|tsx)$/,
    }),
  ],
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.{js,ts}'],
  },
});
