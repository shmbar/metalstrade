import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Vitest 4 transforms with oxc. Do NOT add @vitejs/plugin-react — it is incompatible
// with this Vitest version and threw "reading 'config'" during config resolution,
// breaking every suite.
//
// CAVEAT (verified): a .js file containing JSX still cannot be IMPORTED — Vite's
// import analysis rejects it (app/(root)/**/page.js, formulas/tabs/fenicr.js, …).
// That is what Tier 3 of the parity suites is for: __tests__/parity/_helpers/webSource.ts
// reads such files as text and hashes the formula, which works fine.
//
// The aliases below let a SINGLE root-run vitest import both sides of the app:
//   - the web app through its own tsconfig paths (@utils/*, @components/*, ...)
//   - the Expo app in ./mobile through ITS paths (@/* -> mobile/src, @shared/* -> mobile/src/shared)
// which is what __tests__/parity/** needs in order to feed identical inputs to a web
// module and its mobile port inside one test file.
//
// NOTE ON ALIAS KEYS: Vite/rollup alias matching is `importee === find` OR
// `importee.startsWith(find + '/')`, so the keys must NOT carry a trailing slash
// ('@/' would never match '@/store/auth'). '@' therefore does not swallow
// '@shared/...' or '@tanstack/...' either — those need a literal '@/' prefix to match.
const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // ── native-module stubs (ROOT TEST RUN ONLY) ──────────────────────────────
      // Several mobile files export PURE logic but sit next to React-Query hooks and
      // therefore transitively import react-native (deriveContract lives in
      // useContracts.ts -> @/store/auth -> @/lib/firebase -> react-native). Rolldown
      // cannot parse react-native's Flow-typed index.js, so the whole test FILE fails
      // to load before any assertion runs. Stubbing the native leaves lets the module
      // graph resolve so the pure exports can be imported and compared.
      // The Expo bundler never sees this — it exists only in vitest.
      // See __tests__/parity/_helpers/stubs/nativeStub.ts for what it does and does
      // NOT guarantee.
      { find: /^react-native$/, replacement: r('./__tests__/parity/_helpers/stubs/nativeStub.ts') },
      { find: /^react-native\/.*/, replacement: r('./__tests__/parity/_helpers/stubs/nativeStub.ts') },
      { find: /^@react-native-async-storage\/.*/, replacement: r('./__tests__/parity/_helpers/stubs/nativeStub.ts') },
      { find: /^expo(-.*|\/.*)?$/, replacement: r('./__tests__/parity/_helpers/stubs/nativeStub.ts') },
      { find: /^react-native-.*/, replacement: r('./__tests__/parity/_helpers/stubs/nativeStub.ts') },

      // Most specific first (defensive — see the note above, they cannot collide).
      { find: '@shared', replacement: r('./mobile/src/shared') },
      { find: '@utils', replacement: r('./utils') },
      { find: '@components', replacement: r('./components') },
      { find: '@lib', replacement: r('./lib') },
      { find: '@hooks', replacement: r('./hooks') },
      { find: '@contexts', replacement: r('./contexts') },
      { find: '@public', replacement: r('./public') },
      // Mobile's catch-all. Keep LAST.
      { find: '@', replacement: r('./mobile/src') },
    ],
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.{js,ts}'],
    // mobile/src/lib/firebase.ts calls initializeApp/initializeAuth at MODULE SCOPE, so
    // importing any mobile hook file explodes with auth/invalid-api-key unless the
    // EXPO_PUBLIC_* vars exist. These are deliberately fake and point at nothing:
    // initializeApp does no network I/O, and a parity test that ever reaches the
    // network is broken by definition. Real credentials must never appear here.
    env: {
      EXPO_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'parity.invalid',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'parity-test',
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'parity-test.appspot.com',
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      EXPO_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
      // Same story on the web side: utils/firebase.js initialises at module scope, so
      // any web module that imports `db` (e.g. app/(root)/accstatement/func.js) needs
      // these to exist. Fake, offline, never real credentials.
      NEXT_PUBLIC_API_KEY: 'test-api-key',
      NEXT_PUBLIC_AUTH_DOMAIN: 'parity.invalid',
      NEXT_PUBLIC_PROJECT_ID: 'parity-test',
      NEXT_PUBLIC_STORAGE_BUCKET: 'parity-test.appspot.com',
      NEXT_PUBLIC_MESSAGING_SENDER_ID: '000000000000',
      NEXT_PUBLIC_APP_ID: '1:000000000000:web:0000000000000000000000',
    },
    // Vitest already excludes node_modules by default, but the include glob above is
    // repo-wide and there are TWO node_modules trees here (root + mobile/), plus build
    // output. Spelling them out keeps a stray fixture in .next/ or a dependency's own
    // __tests__ folder from being collected.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/build/**',
      // Helpers for the parity suites live beside them; they are not suites.
      '**/__tests__/**/_helpers/**',
    ],
  },
});
