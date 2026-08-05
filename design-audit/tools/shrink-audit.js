/* Find every element whose DESKTOP size changed materially during the migration.
 *
 * The codemod mapped from the BASE Tailwind class, but a line like
 * `text-2xl sm:text-3xl md:text-4xl` renders at 36px on a desktop, not 24px —
 * the variants were dropped, so the real on-screen size collapsed. promote.js
 * only inspected lines that became responsiveTextDisplay, so anything that
 * landed on a *smaller* rung (the shared page hero, at Stat) slipped through.
 *
 * Pairing: `git diff -U0` against the pre-audit baseline. Within a hunk that
 * removed and added the same number of lines, the nth removed line is the old
 * version of the nth added line. That survives files whose total line count
 * changed, which a whole-file comparison cannot.
 *
 * Sizes are evaluated at 1440px — a common laptop, and the width Zak reviews at.
 * Breakpoints applying there: base, sm(640), md(768), lg(1024), xl(1280).
 * 2xl(1536) does not apply, so a 2xl: variant is ignored.
 */
const { execSync } = require("child_process");

const BASE = process.argv[2] || "c9aed1a";

const TW = { xs:12, sm:14, base:16, lg:18, xl:20, "2xl":24, "3xl":30, "4xl":36, "5xl":48, "6xl":60, "7xl":72, "8xl":96, "9xl":128 };
// ladder rung -> px at 1440 (the xl step of --fs-*)
const RUNG = { responsiveTextTableTitle:10, responsiveTextTable:11, responsiveTextTable1:11,
  responsiveText:12, responsiveTextTotal:12, responsiveTextInput:13, responsiveTextTitle:14,
  responsiveTextPage:17, responsiveTextStat:22, responsiveTextDisplay:25, responsiveTextHero:36 };
// breakpoints that apply at 1440, weakest first
const BP = [null, "sm", "md", "lg", "xl"];

function oldDesktopPx(line) {
  let px = null;
  for (const bp of BP) {
    const re = bp ? new RegExp(`\\b${bp}:text-(\\w+)`, "g") : /(?:^|[\s"'`{])text-(\w+)(?![-\w])/g;
    let m;
    while ((m = re.exec(line))) if (TW[m[1]] !== undefined) px = TW[m[1]];
  }
  return px;
}
function newPx(line) {
  let px = null;
  for (const [k, v] of Object.entries(RUNG))
    if (new RegExp(`\\b${k}(?![-\\w])`).test(line)) px = px === null ? v : Math.max(px, v);
  return px;
}

const files = execSync(`git diff --name-only ${BASE} -- "app/*" "components/*"`, { maxBuffer: 1e8 })
  .toString().split("\n").filter(f => /\.(jsx?|tsx?)$/.test(f));

const rows = [];
for (const f of files) {
  let diff;
  try { diff = execSync(`git diff -U0 ${BASE} -- "${f}"`, { maxBuffer: 1e8 }).toString(); } catch { continue; }
  const lines = diff.split("\n");
  let del = [], add = [];
  const flush = () => {
    if (del.length && del.length === add.length) {
      for (let i = 0; i < del.length; i++) {
        const o = oldDesktopPx(del[i]), n = newPx(add[i]);
        if (o === null || n === null) continue;
        if (n === o) continue;
        const ratio = n / o;
        if (ratio >= 0.85 && ratio <= 1.2) continue;   // within a rung's rounding
        rows.push({ f, o, n, ratio, txt: add[i].replace(/^\+/, "").trim().slice(0, 96) });
      }
    }
    del = []; add = [];
  };
  for (const l of lines) {
    if (l.startsWith("@@")) { flush(); continue; }
    if (/^[-+]{3}/.test(l)) continue;
    if (l.startsWith("-")) { if (add.length) flush(); del.push(l); }
    else if (l.startsWith("+")) add.push(l);
    else flush();
  }
  flush();
}

rows.sort((a, b) => a.ratio - b.ratio);
const shrank = rows.filter(r => r.ratio < 1), grew = rows.filter(r => r.ratio > 1);
console.log(`${rows.length} element(s) changed desktop size by more than a rung: ${shrank.length} shrank, ${grew.length} grew\n`);
for (const r of rows) console.log(`  ${String(r.o).padStart(3)}px -> ${String(r.n).padStart(3)}px  ${r.f}\n        ${r.txt}`);
