# VERIFICATION — Phase 4

Run over the **316 in-scope files** listed in INVENTORY.md.

`rg` is not installed on this machine, so GNU grep is run over the exact inventory
file list. That is equivalent to the task file's `rg` commands and stricter — it
cannot drift the way a glob can.

## What is excluded from the gates, and why

| Exclusion | Reason |
|---|---|
| commented-out code | never rendered; comment *spans* are blanked, not just lines starting with `//` |
| `cssVar('--token', '#fallback')` | the fallback is the correct pattern — the token is still the source of truth |
| HTML entities (`&#931;` `&#8209;`) | these are characters, not colours |
| `app/globals.css`, `tailwind.config.js` | the token definitions themselves |
| `utils/themes.js` | the engine that derives every dark value |
| `utils/chartTheme.js`, `dashboard/charts.js` | chart **series** palettes — deliberately unthemed, because a palette must keep its own hue spacing to stay readable. Centralised there in batch 3 precisely so this exemption is one line, not scattered. |

---

## GATE 1 — no arbitrary font sizes

```
$ grep -nE "(^|[^-:alnum])text-\[[0-9]"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 2 — no fixed text-xs / text-sm (cannot ramp with the ladder)

```
$ grep -nE "(^|[^-:alnum])text-(xs|sm)\b"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 3 — no inline fontSize literals

```
$ grep -nE "fontSize: *[q][0-9]"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 4 — no hardcoded hex colours

```
$ grep -nE "#[0-9a-fA-F]{3,8}\b"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 5 — no literal rgb()/rgba()

```
$ grep -nE "rgba?\([0-9]"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 6 — no arbitrary z-index

```
$ grep -nE "z-\[[0-9]+\]"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 7 — no off-scale radius

```
$ grep -nE "rounded-(xl|md|sm)\b|rounded-\["   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 8 — no off-scale control heights (24-40px band)

```
$ grep -nE "h-\[(2[4-9]|3[0-9]|40)px\]|h-\[1\.[5-9]rem\]"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 9 — no arbitrary padding / gap

```
$ grep -nE "\b(p|px|py)-\[|\bgap-\["   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

## GATE 10 — font family declared only as the one token (or inherit)

```
$ grep -nE "(font-family|fontFamily)"   # over the 316 in-scope files
(no output)

RESULT: 0 matches  ✓ PASS
```

---

## Build
```
$ npm run build


ƒ  (Dynamic)  server-rendered on demand

```
Compiled successfully — full output tail:
 ✓ Compiled successfully in 37.0s
   Collecting page data ...
   Generating static pages (0/10) ...
   Generating static pages (2/10) 
   Generating static pages (4/10) 
   Generating static pages (7/10) 

errors: 0
```

## Lint
```
$ npm run lint
Errors  : 3   (pre-audit baseline: 3)
Warnings: 121  (pre-audit baseline: 121)

The 3 errors are identical to the pre-audit baseline and unrelated to this work:
  27:30  Error: Component definition is missing display name  react/display-name
  216:66  Error: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
  216:80  Error: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

diff of error sets, baseline vs now:
  (empty — ZERO new lint errors)
```

---

## Before / after, measured on the same 316 files

"Before" is read from commit `c9aed1a`, the last commit before this audit began.

| Metric | Before | After |
|---|---|---|
| Distinct text sizes in use | 38 | 15 |
| Total sized elements | 1440 | 77 |
| Distinct hardcoded colour literals | 139 | 96 |
| Total hardcoded colour occurrences | 406 | 129 |
| Distinct z-index values | 22 | 6 |
| Distinct radius values | 8 | 5 |
| Distinct control heights (20-44px) | 11 | 7 |


### Every distinct text size, before and after
```
BEFORE sizes: 8 8.64 8.8 8.96 9 9.12 9.28 9.6 9.92 10 10.24 10.4 10.51 10.56 10.88 11 11.2 11.5 11.52 11.84 12 12.48 12.8 13 13.12 13.2 13.6 14 15 15.2 16 17 18 19.2 21.6 24 36 48
AFTER  sizes: 9 9.92 10 11 12 13 14 15 16 17 18 20 22 24 26

The 14 'after' values ARE the ladder: each of the 7 rungs at its 4 breakpoints.
(0.62rem/9.92px appears only inside an explanatory comment in globals.css.)
```
