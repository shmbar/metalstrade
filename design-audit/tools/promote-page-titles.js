/* Give the CRM a page-title rung.
 *
 * Every page's <h1> ("Contracts", "Invoices", "Margins", "Settings", ...) was on
 * responsiveTextTitle — the 14px rung meant for CARD and SECTION titles. So the
 * page title rendered at exactly the same size as the clock beside it and the
 * labels below it, and 21 of the 22 CRM pages had no size above 14px at all.
 * Measured, not guessed: design-audit/tools/font-census.mjs.
 *
 * responsiveTextPage (16/17/18/20) is the rung literally named "page titles" and
 * was going unused. Promoting to it gives the app one step of hierarchy without
 * touching the dense data below, which Zak signed off on.
 *
 * Only <h1> lines carrying the shared page-title signature (border-l-4) are
 * touched, so section titles that legitimately sit at 14px are left alone.
 */
const fs = require("fs");

const files = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter(Boolean);
const write = process.argv.includes("--write");
let n = 0, cf = 0;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, "utf8").split("\n");
  let touched = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!/<h1/.test(l)) continue;
    if (!/border-l-4/.test(l)) continue;          // the shared page-title signature
    if (!/responsiveTextTitle(?![-\w])/.test(l)) continue;
    lines[i] = l.replace(/responsiveTextTitle(?![-\w])/g, "responsiveTextPage");
    n++; touched = true;
  }
  if (touched) { cf++; if (write) fs.writeFileSync(f, lines.join("\n")); console.log("  " + f); }
}
console.log((write ? "APPLIED" : "DRY RUN") + `: promoted ${n} page title(s) in ${cf} files`);
