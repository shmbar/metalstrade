#!/usr/bin/env node
/**
 * Design-token gates.
 *
 * `.githooks/pre-commit` runs this on staged files before every commit. That
 * hook has always existed and has always been correct — but it skips silently
 * when this file is absent, and commit f09e4568 ("Retire the design-audit
 * working files") deleted it. The gate went quiet rather than loud, and the
 * drift it existed to prevent came straight back: by 2026-08-11 ten separate
 * table headers had drifted off the shared standard, on eight pages, none of it
 * visible without putting two pages side by side. This file is what makes the
 * hook do something again.
 *
 * Output contract (parsed by the hook's awk block — do not reformat):
 *
 *     ## GATE <title>
 *     <one offending "file:line: text" per line>
 *     RESULT: <count>
 *
 * Exit 1 if any gate has a non-zero count.
 *
 * Usage:  node design-audit/tools/gates.js --staged
 *         node design-audit/tools/gates.js --scan
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'utils'];
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);

/* Files allowed to define what everyone else only consumes. */
const TOKEN_SOURCES = new Set([
    'app/globals.css',
    'tailwind.config.js',
    'utils/themes.js',
]);

/* Narrow, deliberate exceptions. Each needs a reason — an entry here is a
   promise that the deviation was thought about, not that the gate was noisy. */
const ALLOW = {
    // expenses sets padding inline on 13 cells; only !important can outrank an
    // inline style, so this is what makes the SHARED padding actually apply.
    'app/(root)/expenses/newTable.js': ['custom-table-def'],
    // A last-child border opt-out, not a restatement of the band.
    'app/(root)/accounting/newTable.js': ['custom-table-def'],
};

const allowed = (file, gate) => (ALLOW[file] || []).includes(gate);

// ── file list ───────────────────────────────────────────────────────────────
function stagedFiles() {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', {
        cwd: ROOT, encoding: 'utf8',
    });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
}

function walk(dir, acc = []) {
    let entries;
    try { entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); }
    catch { return acc; }
    for (const e of entries) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
            if (e.name === 'node_modules' || e.name === '.next') continue;
            walk(rel, acc);
        } else acc.push(rel);
    }
    return acc;
}

const targets = (process.argv.includes('--staged') ? stagedFiles() : SCAN_DIRS.flatMap(d => walk(d)))
    .filter(f => EXT.has(path.extname(f)))
    .filter(f => !f.includes('__tests__') && !f.includes('design-audit/'));

const read = (f) => {
    try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return null; }
};

// ── gates ───────────────────────────────────────────────────────────────────
/* Two tiers, deliberately.
   BLOCKING gates are precise enough that a hit is always a real defect, so
   failing the commit is fair. ADVISORY gates are broader sweeps that legitimately
   match some correct code; they report but never block.

   The split matters more than it looks. A gate that blocks on things a developer
   knows are fine teaches them to reach for `--no-verify`, and once that is the
   habit the precise gates stop protecting anything either. Keeping the blocking
   set small and true is what keeps the whole mechanism credible. */
const gates = [];
const gate = (id, title, fn, blocking = true) => gates.push({ id, title, fn, blocking });

/* 1. A table header/cell may not restate the shared band.
      This is the 2026-08-11 bug. An inline style beats `.custom-table th`, and
      it fails SILENTLY — the cell keeps working and just renders a shade darker
      or a weight heavier, which reads as "the font is wrong on this page".
      Only genuinely per-column things belong on the element: width, minWidth,
      maxWidth, white-space, cursor, user-select, and content-driven alignment. */
/* Flag only what the shared rule ACTUALLY sets, so a hit always means a real
   conflict. `.custom-table th` sets colour/size/weight/transform/tracking;
   `.custom-table td` sets size but NOT colour or weight — so an inline colour on
   a <td> overrides nothing and is not a finding. A gate that reports harmless
   things gets bypassed with --no-verify, and then it protects nothing. */
const TH_PROPS = /\b(color|fontWeight|fontSize|textTransform|letterSpacing|fontFamily)\s*:/;
const TD_PROPS = /\b(fontSize|fontFamily|textTransform|letterSpacing)\s*:/;
gate('th-band', 'Table cell restates the shared band (globals.css .custom-table th/td)', (file, src) => {
    if (!/\.(js|jsx|tsx)$/.test(file)) return [];
    /* Scope: only tables that opted into the standard. A printable invoice
       (cashflow/invPopup) or a modal's own little table is not governed by
       `.custom-table` and is free to set its own type. */
    if (!/custom-table/.test(src)) return [];
    const hits = [];
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (!/<(th|td)\b/.test(lines[i])) continue;
        // Collect the opening tag: from `<th` until the line whose content ends
        // the tag. Bounded so an unclosed tag can't run away with the file.
        let buf = '';
        for (let j = i; j < Math.min(i + 14, lines.length); j++) {
            buf += lines[j] + '\n';
            if (/^\s*(\/?>|\}\}\s*\/?>)/.test(lines[j]) || /[^=]>\s*$/.test(lines[j])) break;
        }
        // Only inline style objects count. A className is fine — utilities lose
        // to the 0,1,1 shared rule anyway, so they cannot cause this bug.
        const style = buf.match(/style=\{\{[\s\S]*?\}\}/);
        if (!style) continue;
        const isTh = /<th\b/.test(lines[i]);
        const re = isTh ? TH_PROPS : TD_PROPS;
        if (re.test(style[0])) {
            hits.push(`${file}:${i + 1}: <${isTh ? 'th' : 'td'}> sets ${style[0].match(re)[1]} inline`);
        }
    }
    return hits;
});

/* 2. `.custom-table th/td` has exactly one definition, in globals.css.
      Fourteen files used to each carry their own global copy under the same
      selector, so the last one mounted won and "the standard" meant something
      different depending on your navigation path. */
gate('custom-table-def', 'Local CSS rule styles th/td type (belongs in globals.css)', (file, src) => {
    if (TOKEN_SOURCES.has(file) || allowed(file, 'custom-table-def')) return [];
    const hits = [];
    const lines = src.split('\n');
    /* Deliberately matches ANY class, not just `.custom-table`. `.margins-table th`
       carried its own font-weight/font-size and beat the standard for exactly the
       same reason a `.custom-table th` copy did: same 0,1,1 specificity, injected
       later by styled-jsx, so it silently replaced the shared rule rather than
       merging with it. Renaming the class does not make the copy safe, so the gate
       cannot key on the name. Layout (padding, align, borders) is still fair game
       locally — only TYPE is reserved to globals.css. */
    const BAND_CSS = /(^|\s)(font-size|font-weight|color|text-transform|letter-spacing|font-family)\s*:/;
    for (let i = 0; i < lines.length; i++) {
        if (!/^\s*\.[\w-]+\s+(th|td)\s*[,{]/.test(lines[i])) continue;
        /* A summary/total band is a deliberate semantic variant — it tints the row
           and takes a matching text colour on purpose. That is a considered
           override of the default band, not drift, so it is out of scope here. */
        if (/summary|total|footer/i.test(lines[i])) continue;
        const block = lines.slice(i, i + 14).join('\n').split('}')[0];
        const m = block.match(BAND_CSS);
        if (m) hits.push(`${file}:${i + 1}: ${lines[i].trim()} sets ${m[2]}`);
    }
    return hits;
});

/* 3. One radius: interactive things use --radius-control (10px), never a pill.

      `rounded-full` on a control is the same class of silent drift as an inline
      colour on a <th>: nothing breaks, it just stops matching the rest of the
      app. It took three rounds of review on 2026-08-11 to find them all by hand,
      because the first two searches keyed on the wrong signal — control HEIGHT
      (h-7/h-8), which misses every `px-2.5 py-0.5` filter chip. INTERACTIVITY is
      the signal that works, so that is what this gate matches.

      Exempt by design, not by oversight: avatars and dots (equal w-/h-), spinners
      and pulses, progress-bar fills, the toggle switch (round IS the affordance),
      AutosavePill, and the public marketing pages + chat UI, which are a separate
      visual language where a pill is the conventional form. */
/* Only true pills remain. The public marketing pages and the chat UI were both
   exempted at first on the assumption that they were "a separate visual
   language" — Zak overruled both (2026-08-12). The app has ONE radius; if a
   marketing page wants a pill it has to be an actual pill (an avatar, a dot, a
   progress bar), not a rounded control. Do not re-add a whole area here. */
const RADIUS_EXEMPT = /(AutosavePill|switch\.(js|tsx)|spinner|videoLoader|skeletons)/;
gate('one-radius', 'rounded-full on an interactive control (use rounded-lg = --radius-control)', (file, src) => {
    if (!/\.(js|jsx|tsx)$/.test(file) || RADIUS_EXEMPT.test(file)) return [];
    const hits = [];
    const lines = src.split('\n');
    lines.forEach((l, i) => {
        if (!l.includes('rounded-full')) return;
        if (/^\s*(\/\/|\/?\*|\*)/.test(l)) return;                       // comments
        const interactive = /<button|onClick|cursor-pointer|<input|<select|\bh-(7|8|9|10)\b/.test(l);
        if (!interactive) return;
        /* Look at the next two lines as well, not just this one. A conditional
           className puts `rounded-full` on the opening line and the `w-3 h-3` that
           proves it is a dot on the NEXT line inside the template literal — which
           is how the testimonial carousel dots read as a false positive. */
        const ctx = lines.slice(i, i + 3).join(' ');
        const isAvatarOrDot = /\bw-([0-9.]+)\b\s+\bh-\1\b|\bh-([0-9.]+)\b\s+\bw-\2\b/.test(ctx)
            || /animate-(ping|spin|pulse|bounce)/.test(ctx)
            || /width:\s*[0-9]+/.test(ctx);
        const isBar = /overflow-hidden/.test(ctx) && /\bh-(1|1\.5|2|full)\b/.test(ctx);
        if (!isAvatarOrDot && !isBar) hits.push(`${file}:${i + 1}: rounded-full on an interactive element`);
    });
    return hits;
});

/* 4. Raw hex outside the token sources. Every colour routes through a var().

      Exports and charts are exempt BY DESIGN, not by oversight: an Excel/PDF
      export leaves the browser, so a CSS variable has nothing to resolve
      against, and chart series colours are deliberately fixed so a saved report
      looks the same to whoever opens it, whatever theme they use. Enforcing
      tokens there would be enforcing a bug. */
const UNTHEMED = /(charts?|excel|pdf|export|report|jspdf|Pdf|Excel)/;
gate('raw-hex', 'Raw hex colour (use a var(--token) from globals.css)', (file, src) => {
    if (TOKEN_SOURCES.has(file) || UNTHEMED.test(file)) return [];
    const hits = [];
    src.split('\n').forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;           // comments
        const m = l.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/);
        if (m && !/svg|gradientTransform|stopColor/i.test(l)) hits.push(`${file}:${i + 1}: ${m[0]}`);
    });
    return hits;
}, false);

/* 4. Off-ladder type. Sizes come from --fs-*, reachable as classes or vars. */
gate('type-ladder', 'Off-ladder font size (use --fs-* or a .responsiveText* class)', (file, src) => {
    if (TOKEN_SOURCES.has(file)) return [];
    const hits = [];
    src.split('\n').forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        const cls = l.match(/\b(?:text-(?:xs|sm|base|lg|xl))\b|\btext-\[\d+(?:px|rem)\]/);
        const inline = l.match(/fontSize:\s*['"`]\d+(?:px|rem)['"`]/);
        if (cls) hits.push(`${file}:${i + 1}: ${cls[0]}`);
        else if (inline) hits.push(`${file}:${i + 1}: ${inline[0]}`);
    });
    return hits;
}, false);

// ── run ─────────────────────────────────────────────────────────────────────
let failed = 0;
const sources = targets.map(f => [f, read(f)]).filter(([, s]) => s !== null);

let advisory = 0;

for (const g of gates) {
    const hits = sources.flatMap(([f, s]) => g.fn(f, s));
    /* Advisory gates must report RESULT: 0 — the hook's awk treats any non-zero
       RESULT as a failure to print. They surface via the summary line instead. */
    console.log(`## GATE ${g.title}${g.blocking ? '' : ' [advisory]'}`);
    if (g.blocking) {
        hits.slice(0, 40).forEach(h => console.log(h));
        if (hits.length > 40) console.log(`… and ${hits.length - 40} more`);
        console.log(`RESULT: ${hits.length}`);
        failed += hits.length;
    } else {
        console.log(`RESULT: 0`);
        advisory += hits.length;
    }
}

const note = advisory ? ` (${advisory} advisory)` : '';
console.log(failed === 0
    ? `  ✓ design gates passed — ${sources.length} files${note}`
    : `  ✗ design gates: ${failed} issue(s) across ${sources.length} files${note}`);

process.exit(failed === 0 ? 0 : 1);
