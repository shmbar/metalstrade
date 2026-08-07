import { defineConfig } from 'vitest/config';
import base from './vitest.config.js';

// The real-data smoke check (__tests__/smoke/*.smoke.ts) is deliberately OUTSIDE the
// default `npm test` glob: it needs credentials and a network, and it reports on YOUR
// data rather than on the code. It reuses the main config wholesale — same aliases,
// same native stubs — and only swaps the include pattern.
//
//   npm run test:smoke
//
// See the header of __tests__/smoke/real-data.smoke.ts for the env vars.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['**/__tests__/smoke/**/*.smoke.ts'],
    // One connection, one sign-in, sequential reads — no point parallelising, and it
    // keeps the printed report readable.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
