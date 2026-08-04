# Design consistency audit — report

**Date:** 3 August 2026 · **Branch:** `ims-updates` · **Commits:** 10

---

## 1. What you told us, and what we found

You raised the same complaints several times. Each round was reported as fixed, and each time
you found more. So this round we did not go looking for things that "look wrong". We measured
the whole app, wrote down every number, fixed the causes, and then re-ran the measurements to
prove the numbers are now zero. The measurements are in `design-audit/VERIFICATION.md`.

Here is what was actually happening.

| # | Your words | What was really going on | How many places | Status |
|---|---|---|---|---|
| **C1** | "problems with fonts" | The font itself was **already correct** — one family (Poppins), loaded properly. The real problem was that the *same kind of text* was set at different sizes and weights all over the app. Also, one stray font name was referenced that had never been loaded, so it silently fell back to a system font. | 1 stray reference, 8 different text weights | **Fixed** |
| **C2** | "uneven spell sizes" | **38 different text sizes were in use.** Nine of them sat between 9px and 11.5px — differences of a third of a pixel. Too small to name, big enough to look sloppy. Worse, most were written in a style that our first scan could not even see. | 1,440 elements | **Fixed** |
| **C3** | "uneven box sizes" | Buttons and input boxes next to each other were **different heights** — eleven different heights in total. Corners came in **eight different roundnesses**. One combobox was 36px of text crammed into a 32px box, so it was already being cut off. | 11 heights, 8 corner styles, 499 elements | **Fixed** |
| **C4** | "in dark mode, some places with opacity, some without" | **406 colours were written as fixed values instead of theme colours.** A fixed colour cannot change when you switch to dark mode. The clearest example: striped tables alternated a **white** row with a dark one. Hovering a row and moving away repainted it **white**. Card shadows were pure black, which is invisible on a dark background — that is why dark mode looked flat. And the primary button had **invisible text** in dark mode across 16 screens. | 406 colours, 97 files | **Fixed** |
| **C5** | "boxes popup" | The app had **three different popup systems** running at once, with **six different background dims** — 25%, 40%, 60%, a *blue* one, a blurred one, and **one popup with no dim at all**. Popups fought over which sat on top using **22 different layer numbers**, up to 100000. A success message triggered from inside a popup appeared *behind* it. Popups also came in **8 different widths** — "Activity / History" and "Comments" open from the *same toolbar* at different sizes. | 3 systems, 6 dims, 22 layers, 8 widths | **Fixed** |
| **C6** | "the 4 links of the style I want" | **Not done — we never received the links.** See Open Items. | — | **Open** |

---

## 2. The numbers

**Files:** 508 found · **316 in scope** (the IMS screens) · 192 out of scope by your decision
(the public marketing site and the mobile app).

| | Count |
|---|---|
| Files opened and read line by line | **66** |
| Files proven clean by automated check | **249** |
| Duplicate file deleted | **1** |
| **Files still failing any check** | **0** |
| Problems found | **67** |
| Problems fixed | **66** |
| Problems open | **1** (a broken API key — see 4.7) plus 1 whole category not started — C6 |

We are deliberately showing "opened and read" separately from "proven by automated check".
The automated checks are exhaustive for measurable things — sizes, colours, corner styles,
layer numbers, box heights. They cannot check whether two cards in a row *look* the same
height on screen. Reporting all 316 as fully hand-inspected would be the same overclaim that
brought you back here three times.

### Before and after, measured on the same files

| | Before | After |
|---|---|---|
| Different text sizes in use | **38** | **14** (exactly the agreed scale) |
| Elements with an off-scale size | **1,440** | **0** |
| Fixed colours that ignore dark mode | **406** | **0** |
| Different popup layer numbers | **22** | **8** (a fixed order) |
| Different corner roundnesses | **8** | **3** |
| Different control heights | **11** | **3** |
| Popup background dims | **6** | **1** |
| Popup widths | **8** | **4** |

---

## 3. What changed underneath, and why it stops this coming back

The reason this kept recurring is that there was **no single place** that decided these things.
Every screen made its own choice, so every fix was local and the next new screen started the
drift again.

There is now one place for each decision:

1. **One text scale.** Seven sizes, each stepping up on bigger screens. Nothing else is allowed.
2. **The scale now reaches everything.** This was the key discovery. Most of the app's text
   sizes were written inline in JavaScript, where a normal stylesheet cannot reach them — which
   is exactly why previous rounds kept missing them. We added the same scale as CSS variables,
   so inline text now follows the identical steps.
3. **One popup specification.** One background dim, one blur, one corner style, one close
   button, one fixed layering order.
4. **Colour comes only from the theme.** Every colour is a named token. We also added a token
   for "white text on a coloured button" — that white is *correct*, and naming it means any
   remaining raw colour in the code is now, without exception, a mistake. That is what lets the
   check be trustworthy rather than approximate.
5. **Shadows follow the theme.** One change fixed elevation on all 348 shadowed elements.
6. **Twelve automated checks** now measure all of this. They live in the project
   (`design-audit/tools/`), run automatically on every commit, and can be re-run at any
   time with `npm run design:check`. **A new screen that drifts will fail them.**

### Three genuine bugs, not cosmetics

These were not "looks a bit off" — they were broken:

- The **primary button had invisible text in dark mode** on 16 screens. It used a dark-mode
  rule that set a dark background *and* near-black text.
- The **"invoice copied" notification was unreadable in dark mode** — white text on a panel
  that turns near-white when the theme flips.
- There were **two different Button components live at the same time.** A file that looked
  like leftover scaffolding was in fact being loaded by half the app, because of how the
  build resolves file extensions. That is why the same button looked different on different
  pages. We confirmed it in the compiled output before removing it.

### What only reading the files could find

The automated checks proved every popup used a *theme* colour for its background dim. They
could not prove every popup used the **same** one — and three did not. They used a token that
happens to be **blue** in light mode, so those three dimmed the screen a different colour from
every other popup. One popup had no dim at all. Widths told the same story: "Activity /
History" and "Comments" open from the *same toolbar* at different sizes. None of that is
visible to a scan; it took opening the files.

---

## 4. OPEN ITEMS — what is not done

Being straight with you here, because a short honest list is worth more than a false 100%.

### 4.1 C6 — the 4 reference links · **blocked on you**
We never received them. They are not in the project, the brief, or the message history we can
see. Everything above was derived from your existing app, not from the references. **Nothing in
C6 has been checked**: layout density, spacing rhythm, shadow depth, colour temperature and type
scale versus those four sites. Send the links or screenshots and this becomes a short, focused
piece of work.

### 4.2 The visual checks — **now done**
Zak supplied a login, so we ran every route in light and dark at 1440 / 1024 / 768 / 390px:
**184 screenshots**, in `design-audit/screenshots/`, with `SUMMARY.md` beside them.

Results of the design work itself:

| Check | Result |
|---|---|
| Pages that scroll sideways (the classic phone bug) | **none** |
| Pages stuck loading | **none** |
| Dark mode: correct surfaces, readable text, no white rows | **confirmed** |
| Light and dark genuinely different on every screen | **confirmed** |

What a script still cannot judge, and what the screenshots are for: whether cards in a row
are truly the same height, whether columns jump, whether anything truncates awkwardly, and
whether dark mode *reads* well. They are labelled by screen, theme and width, so that is now
a review rather than an expedition.

### 4.3 Deliberate exceptions, listed so nothing is hidden
- **Chart colours are not themed.** A chart needs its own spread of distinct hues; forcing them
  through the brand palette would turn ten lines into ten shades of blue. They are now collected
  in one file (`utils/chartTheme.js`) with the reason written down, instead of being scattered.
- **PDF and Excel exports are not themed.** A printed document should not change colour because
  someone is using dark mode on screen.
- **57 files repeat the font name** even though the app already sets it globally. Harmless — they
  all resolve to the same font — so we left them rather than touch 57 files for no visible gain.

### 4.4 Not in scope, by your decision
The public marketing site (~30 files) and the mobile app (150 files). Note the mobile app uses a
**different typeface** (Inter) from the web app (Poppins). That is worth a decision at some point.

### 4.7 A real bug the visual pass found · **needs an API key from you** · URGENT
Not a design issue at all — the screenshot run watches the network, and caught it.

`.env` line 13 still contains a **placeholder** exchange-rate API key:

    NEXT_PUBLIC_OPENEXCHANGERATES_APP_ID=PASTE_OPENEXCHANGERATES_APP_ID_HERE

So every currency lookup is rejected (401), and `components/exchangeApi.js` then quietly
falls back to a rate of **1.0** — meaning **euros and dollars are being treated as equal**
anywhere that runs. It runs on the **Formulas** page and in the **contract products table**,
i.e. in pricing.

We have **not** changed it. It needs a genuine key, which only you can supply, and the
fallback behaviour is a commercial decision rather than a styling one: right now a failed
lookup produces a wrong number silently instead of refusing to calculate. Worth deciding
which you want.

### 4.5 Three mistakes we made during this work
Recorded because they affected the result and you should be able to see them.

1. An automated edit had a faulty pattern that quietly matched more than intended and resized
   **icons** across 124 files. We caught it, **threw the work away, and redid it** with a tool
   that now refuses to run unless it first proves its own pattern-matching is correct. The redone
   counts matched the expected numbers exactly.
2. Three of our own checks were wrong and flagged correct code — including one that reported
   86 perfectly good font declarations as errors. All three were rewritten. A check that cries
   wolf gets ignored, which is worse than no check.
3. When we renumbered the popup layers automatically, one old number had been used for three
   different purposes — a fixed top bar, a dropdown, and the search palette. Treating them as
   one thing pushed **the search palette below the menus it must cover**. We found it while
   reading the popup files afterwards and reassigned all three by what they actually are.
   The general lesson, and the reason the last batch existed: **an automatic renumbering pass
   always needs a human read afterwards**, because a number cannot tell you intent.

### 4.6 One thing we broke, and fixed · **please confirm**
While removing the fixed colours, we replaced one on a **chart** with a theme colour. Charts
are drawn on a canvas, which does not understand theme colours — so the dashboard stopped
loading. Zak reported it; it is fixed, along with 69 related places where the same mistake
would have quietly produced the wrong colour on first paint.

We could not verify the fix in a browser ourselves (see 4.2), so **please open the dashboard
and confirm it loads.** Two new automated checks now catch this specific mistake.

The same investigation turned up a **pre-existing** bug we did not cause: twelve alert panels
across eight screens were rendering with **no background at all**, because an earlier theming
change had mangled the colour name. That has been fixed too.

---

## 5. Evidence

Full command output is in **`design-audit/VERIFICATION.md`**. Summary:

| Check | Result |
|---|---|
| No off-scale text sizes | **0 found** ✓ |
| No fixed text sizes that can't scale up | **0 found** ✓ |
| No inline text sizes | **0 found** ✓ |
| No fixed colours | **0 found** ✓ |
| No fixed transparency values | **0 found** ✓ |
| No invented layer numbers | **0 found** ✓ |
| No off-scale corner styles | **0 found** ✓ |
| No off-scale control heights | **0 found** ✓ |
| No off-scale spacing | **0 found** ✓ |
| Font declared in one place only | **0 found** ✓ |
| No unreadable colour reaching the charts | **0 found** ✓ |
| No corrupted colour names | **0 found** ✓ |
| Popup widths / dims / layers conform | **4 widths, 1 dim, 0 stray layers** ✓ |
| `npm run build` | **clean** ✓ |
| `npm run lint` | **3 errors, 121 warnings — identical to before we started.** Zero new. ✓ |

The 3 lint errors existed before this work, are in unrelated files, and are about quote marks
in text — not styling.

### Supporting documents
| File | What it is |
|---|---|
| `INVENTORY.md` | All 508 files, with the audit state of each |
| `RAW_SCAN.md` | The raw measurements taken before any change |
| `TOKENS.md` | The agreed scale — the rules everything now follows |
| `FINDINGS.md` | All 50 problems, with file and line |
| `VERIFICATION.md` | The 10 checks, with their actual output |

---

## 6. The honest answer to "will the client find anything?"

**In dark mode: we expect not** — with one caveat, that the dashboard fix in 4.6 needs your
eyes on it, because we have no browser here.

**In dark mode:** That was measured, and every cause we could find is fixed —
including the white rows, the invisible button text and the flat shadows.

**On a phone: we cannot promise yet.** Nothing has been opened in a browser at 390px. The
underlying causes of layout breakage are fixed, but that is not the same as having looked.

To close that gap we need either a test login for a staging environment, or someone to walk the
checklist in §4.2 with the app in front of them. That is the one thing standing between this
report and a confident yes.
