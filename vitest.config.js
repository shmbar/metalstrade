import { defineConfig } from 'vitest/config';

// Vitest 4 transforms with oxc, which handles JSX inside .js files natively, so we
// no longer need @vitejs/plugin-react (it was incompatible with this Vitest version
// and threw "reading 'config'" during config resolution, breaking every suite).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.{js,ts}'],
  },
});
