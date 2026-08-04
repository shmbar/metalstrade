# design-audit/tools

Re-runnable checks. These are what make the audit verifiable rather than a claim —
and what stops the drift coming back.

## Everyday use

```bash
npm run design:check      # all 10 gates over every in-scope file
npm run design:metrics    # before/after counts vs the pre-audit commit
```

`design:check` prints `ALL GATES PASS` and exits 0, or lists every offending
file:line and exits 1.

## The pre-commit hook

`.githooks/pre-commit` runs the gates against **staged files only**, so it stays fast.
It is wired up by `npm install` (the `prepare` script sets `core.hooksPath`), or manually:

```bash
git config core.hooksPath .githooks
```

A commit that introduces an off-scale font size, a hardcoded colour, an invented
z-index or an off-scale control height is blocked, with the exact lines printed.
Genuine exceptions: `git commit --no-verify`.

## Modes

```bash
node design-audit/tools/gates.js --scan      # derive the in-scope set from disk (default)
node design-audit/tools/gates.js --staged    # only staged files (used by the hook)
node design-audit/tools/gates.js <fileList>  # an explicit list (used to build VERIFICATION.md)
```

**`--scan` is the important one.** A frozen file list only proves the files that existed
the day the audit ran — a component added next month would sail past it. `--scan` applies
the same scope rules that built `INVENTORY.md` to whatever is on disk now.

## What each gate enforces

Every gate maps to a rule in `../TOKENS.md`:

| Gate | Rule |
|---|---|
| 1 | no arbitrary font sizes — §1.2 |
| 2 | no fixed `text-xs`/`text-sm` (they can't ramp) — §1.4 |
| 3 | no inline `fontSize` literals — §1.2 |
| 4 | no hardcoded hex — §5 |
| 5 | no literal `rgb()`/`rgba()` — §5 |
| 6 | no arbitrary z-index — §6.1 |
| 7 | no off-scale radius — §3 |
| 8 | no off-scale control heights — §4 |
| 9 | no arbitrary padding/gap — §2 |
| 10 | one font family — §1.1 |

Exclusions are deliberate and documented in `../VERIFICATION.md`: commented-out code,
`cssVar('--x','#fallback')` fallbacks, HTML entities, and the token-source files
(`globals.css`, `themes.js`, `chartTheme.js`, `dashboard/charts.js`, `tailwind.config.js`).

## A note on `replace-map.js`

The safe literal replacer used for the sweeps. It escapes every regex metacharacter and
**self-checks at startup**, refusing to run if escaping is broken. An earlier hand-rolled
version silently failed and resized icons across 124 files — that is why the self-check
exists. Do not replace it with an inline one-liner.
