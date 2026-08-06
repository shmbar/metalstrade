// ESLint (flat config) for the Expo app. There was no lint setup here at all, so
// the parity work could only ever be gated on `tsc`.
//
// Scope is deliberately narrow: this catches the classes of mistake that actually
// bite in this codebase (unused imports left behind by refactors, missing hook
// dependencies producing stale figures, accidental shadowing) without turning into
// a stylistic rewrite of ~10k lines of existing screens.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      // Business logic copied VERBATIM from the web app — it must stay byte-identical
      // so the financial math is provably the same. Never lint (or reformat) it.
      'src/shared/**',
    ],
  },
  {
    rules: {
      // Stale-closure bugs in money hooks are the expensive kind here.
      'react-hooks/exhaustive-deps': 'warn',
      // Unused imports/vars are the usual residue of a refactor. Using the core
      // rule rather than the TS one so no extra plugin has to be wired in.
      'no-unused-vars': [
        'warn',
        { args: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],

      // ── React Compiler advisories, demoted to warnings ──────────────────────
      // These fire on the "seed local editable state from server data in an
      // effect" pattern that every editable screen in this app already uses, and
      // on Date.now() inside a memo (which the notification feed handles on
      // purpose via a targeted re-tick). They are performance/purity hints from
      // the React 19 compiler, NOT correctness defects, and turning them into
      // errors would demand refactoring screens this work never touched.
      // Left visible as warnings so they can be worked through deliberately.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/static-components': 'warn',
      'react/display-name': 'warn',
    },
  },
];
