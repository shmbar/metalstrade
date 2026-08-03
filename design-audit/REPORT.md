# Design consistency audit — report

**Date:** 3 August 2026 · **Branch:** `ims-updates` · **Commits:** 4

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
| **C5** | "boxes popup" | The app had **three different popup systems** running at once, with **five different background dims** (25%, 40%, 60%, blurred, and none at all). Popups fought over which sat on top using **22 different layer numbers**, up to 100000. A success message triggered from inside a popup appeared *behind* it. | 3 systems, 5 dims, 22 layers | **Fixed** |
| **C6** | "the 4 links of the style I want" | **Not done — we never received the links.** See Open Items. | — | **Open** |

---

## 2. The numbers

**Files:** 508 found · **316 in scope** (the IMS screens) · 192 out of scope by your decision
(the public marketing site and the mobile app).

| | Count |
|---|---|
| Files opened and read line by line | **51** |
| Files proven clean by automated check | **264** |
| Duplicate file deleted | **1** |
| **Files still failing any check** | **0** |
| Problems found | **50** |
| Problems fixed | **50** |
| Problems open | **0** (plus 1 whole category not started — C6) |

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
| Popup background dims | **5** | **1** |

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
6. **Ten automated checks** now measure all of this. They live in the project and can be re-run
   on any future change. **A new screen that drifts will fail them.**

Two genuine bugs were found on the way that were not cosmetic at all: the primary button had
**invisible text in dark mode** on 16 screens, and there were **two different Button components
live at once** — an old unused-looking file was in fact being loaded by half the app, which is
why the same button looked different on different pages.

---

## 4. OPEN ITEMS — what is not done

Being straight with you here, because a short honest list is worth more than a false 100%.

### 4.1 C6 — the 4 reference links · **blocked on you**
We never received them. They are not in the project, the brief, or the message history we can
see. Everything above was derived from your existing app, not from the references. **Nothing in
C6 has been checked**: layout density, spacing rhythm, shadow depth, colour temperature and type
scale versus those four sites. Send the links or screenshots and this becomes a short, focused
piece of work.

### 4.2 The visual checks have not been done · **needs a person or a login**
The task asks for every route to be opened in light and dark at 1440 / 1024 / 768 / 390px, with
screenshots. **We could not do this.** Every screen is behind a login backed by live company
data, and this environment has no browser and no credentials. So these remain unverified:

- cards in the same row being exactly the same height
- table columns not jumping as data loads
- nothing overlapping or clipped at phone width
- empty states, loading states and error states on every screen

The measurable causes of those problems are fixed. The visual confirmation is not done.
**`design-audit/screenshots/` is empty and we have not pretended otherwise.**

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

### 4.5 Two mistakes we made during this work
Recorded because they affected the result and you should be able to see them.

1. An automated edit had a faulty pattern that quietly matched more than intended and resized
   **icons** across 124 files. We caught it, **threw the work away, and redid it** with a tool
   that now refuses to run unless it first proves its own pattern-matching is correct. The redone
   counts matched the expected numbers exactly.
2. Three of our own checks were wrong and flagged correct code — including one that reported
   86 perfectly good font declarations as errors. All three were rewritten. A check that cries
   wolf gets ignored, which is worse than no check.

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

**In dark mode: we expect not.** That was measured, and every cause we could find is fixed —
including the white rows, the invisible button text and the flat shadows.

**On a phone: we cannot promise yet.** Nothing has been opened in a browser at 390px. The
underlying causes of layout breakage are fixed, but that is not the same as having looked.

To close that gap we need either a test login for a staging environment, or someone to walk the
checklist in §4.2 with the app in front of them. That is the one thing standing between this
report and a confident yes.
