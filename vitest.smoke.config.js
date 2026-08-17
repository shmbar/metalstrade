import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import base from './vitest.config.js';

// The real-data smoke check (__tests__/smoke/*.smoke.ts) is deliberately OUTSIDE the
// default `npm test` glob: it needs credentials and a network, and it reports on YOUR
// data rather than on the code. It reuses the main config wholesale — same aliases,
// same native stubs — and swaps the include pattern and the environment.
//
//   npm run test:smoke
//
// See the header of __tests__/smoke/real-data.smoke.ts for the options.

const root = (p) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Minimal .env reader. Earlier files win, and anything ALREADY in the real process
 * environment beats every file — so an override on the command line still works.
 *
 * This has to happen HERE rather than inside the test file: mobile/src/lib/firebase.ts
 * initialises Firebase at module scope, and ESM evaluates imports before the importing
 * module's body, so a loader in the test file runs too late and the SDK sees no
 * credentials at all.
 */
function readEnvFiles(files) {
  const out = {};
  for (const rel of files) {
    const path = root(rel);
    if (!existsSync(path)) continue;
    for (const raw of readFileSync(path, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (out[key] === undefined && process.env[key] === undefined) out[key] = val;
    }
  }
  return out;
}

// The parity config injects FAKE Firebase credentials (parity.invalid / parity-test)
// so the parity suite can never reach real data — a good safeguard, and exactly wrong
// here. Drop it and supply the real config instead. Everything else — aliases, native
// stubs — is inherited unchanged.
const { env: _parityFakeFirebaseEnv, ...baseTest } = base.test;

export default defineConfig({
  ...base,
  test: {
    ...baseTest,
    include: ['**/__tests__/smoke/**/*.smoke.ts','**/__tests__/perf/**/*.smoke.ts'],
    env: readEnvFiles(['./mobile/.env', './mobile/.env.local', './.env', './.env.local']),
    // One connection, one sign-in, sequential reads — no point parallelising, and it
    // keeps the printed report readable.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
