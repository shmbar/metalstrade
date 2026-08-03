/* Literal token replacement across a file list.
 *
 * WHY THIS FILE EXISTS: an earlier inline `node -e` pass built its regexes with
 * a hand-rolled escape that silently failed, so a key like "h-[1.84rem]" became
 * the UNESCAPED pattern h-[1.84rem] — a character class matching h-1, h-8, h-4,
 * h-r, h-e, h-m. It rewrote icon sizes (h-4 -> h-7) across 124 files. That run
 * was reverted.
 *
 * Two defences here:
 *   1. escapeRe() escapes every regex metacharacter, and is unit-checked at
 *      startup against the exact key that broke before.
 *   2. keys are applied longest-first so z-[100000] is never eaten by z-[100].
 *
 * Usage: node replace-map.js <fileList> <mapJson> [--write]
 */
const fs = require("fs");

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Self-check: refuse to run if escaping is not doing its job.
(function selfCheck() {
  const probe = escapeRe("h-[1.84rem]");
  const re = new RegExp(probe);
  if (re.test("h-4") || re.test("h-8") || !re.test("h-[1.84rem]")) {
    console.error("FATAL: escapeRe is broken (" + probe + ") — refusing to run.");
    process.exit(1);
  }
  const z = new RegExp(escapeRe("z-[100]"));
  if (z.test("z-0") || z.test("z-1")) {
    console.error("FATAL: escapeRe leaks character classes — refusing to run.");
    process.exit(1);
  }
})();

const files = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter(Boolean);
const MAP = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const write = process.argv.includes("--write");
const EXCLUDE = new Set(["app/globals.css"]);

const keys = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });
const applied = {};
let cf = 0;

for (const f of files) {
  if (EXCLUDE.has(f) || !fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, "utf8");
  const b = s;
  for (const k of keys) {
    const re = new RegExp(escapeRe(k), "g");
    let n = 0;
    s = s.replace(re, function () { n++; return MAP[k]; });
    if (n) applied[k] = (applied[k] || 0) + n;
  }
  if (s !== b) { cf++; if (write) fs.writeFileSync(f, s); }
}

const total = Object.values(applied).reduce(function (a, b) { return a + b; }, 0);
console.log((write ? "APPLIED" : "DRY RUN") + ": " + total + " sites in " + cf + " files");
Object.entries(applied).sort(function (a, b) { return b[1] - a[1]; })
  .forEach(function (e) { console.log("  " + String(e[1]).padStart(4) + "  " + e[0] + "  ->  " + MAP[e[0]]); });
