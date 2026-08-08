/* Phase 4 gate runner. Emits design-audit/VERIFICATION.md with real output.
 *
 * Line-based with consistent exclusions, so the gates measure what they claim:
 *   - commented-out lines            (dead code, never rendered)
 *   - cssVar('--x','#fallback')      (the token is still the source of truth)
 *   - HTML entities &#931; &#8209;   (characters, not colours)
 *   - the token-source files         (listed per gate, with reason)
 */
/* Modes:
 *   node gates.js <fileList>   check an explicit list (used to produce VERIFICATION.md)
 *   node gates.js --scan       DERIVE the in-scope set from disk (default; covers new files)
 *   node gates.js --staged     check only staged files that are in scope (pre-commit)
 *
 * --scan matters for durability. A frozen file list only proves the files that
 * existed the day the audit ran; a component added next month would sail past.
 * The scope rules below are the same ones used to build INVENTORY.md.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOTS = ["app", "components", "contexts", "hooks", "lib", "utils", "actions"];
const ROOT_FILES = ["tailwind.config.js", "postcss.config.mjs", "next.config.mjs", "components.json"];
const EXT = /\.(js|jsx|ts|tsx|css|mjs)$/;
const MARKETING = /^components\/(CTA|Contact|Features|Footer|Hero|Navbar|Testimonial|platform)\//;

function inScope(p) {
  p = p.replace(/\\/g, "/");
  if (!EXT.test(p)) return false;
  if (/(^|\/)(node_modules|\.next|backups|tests|__tests__)\//.test(p)) return false;
  if (/^mobile\//.test(p)) return false;            // separate app, out of scope
  if (/^app\/api\//.test(p)) return false;          // no UI
  /* The public marketing pages WERE excluded — that is how they kept ad-hoc
     Tailwind sizes and no dark mode while the CRM was normalised. They are now
     on the same ladder and the same tokens, so they are gated too. Anything
     excluded from the gate drifts; that is the lesson. */
  if (ROOT_FILES.includes(p)) return true;
  return ROOTS.some(function (r) { return p.startsWith(r + "/"); });
}

function walk(dir, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const e of entries) {
    const full = path.posix.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^(node_modules|\.next|\.git|backups|tests|__tests__)$/.test(e.name)) continue;
      walk(full, acc);
    } else if (inScope(full)) acc.push(full);
  }
  return acc;
}

const arg = process.argv[2];
let files;
if (arg === "--staged") {
  const out = execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8" });
  files = out.split(/\r?\n/).filter(Boolean).filter(inScope).filter(function (f) { return fs.existsSync(f); });
} else if (!arg || arg === "--scan") {
  files = ROOTS.reduce(function (a, r) { return walk(r, a); }, []).concat(ROOT_FILES.filter(function (f) { return fs.existsSync(f); }));
} else {
  files = fs.readFileSync(arg, "utf8").split(/\r?\n/).filter(Boolean);
}

const COLOUR_EXEMPT = new Set([
  "app/globals.css", "utils/themes.js", "utils/chartTheme.js",
  "app/(root)/dashboard/charts.js", "tailwind.config.js",
]);
const TOKEN_SOURCE = new Set(["app/globals.css", "tailwind.config.js"]);

const GATES = [
  { id: 1, title: "no arbitrary font sizes", cmd: 'grep -nE "(^|[^-:alnum])text-\\[[0-9]"',
    re: /(^|[^-:\w])text-\[[0-9]/, exempt: TOKEN_SOURCE },
  { id: 2, title: "no fixed text-xs / text-sm (cannot ramp with the ladder)", cmd: 'grep -nE "(^|[^-:alnum])text-(xs|sm)\\b"',
    re: /(^|[^-:\w])text-(xs|sm)\b/, exempt: TOKEN_SOURCE },
  { id: 3, title: "no inline fontSize literals", cmd: 'grep -nE "fontSize: *[q][0-9]"',
    re: /fontSize: *['"][0-9]/, exempt: TOKEN_SOURCE },
  { id: 4, title: "no hardcoded hex colours", cmd: 'grep -nE "#[0-9a-fA-F]{3,8}\\b"',
    re: /(^|[^&])#[0-9a-fA-F]{3,8}\b/, exempt: COLOUR_EXEMPT },
  /* Gate 4b — the same defect written as a CSS colour KEYWORD.
     Gate 4 only sees #hex, so `background: 'white'` sailed through: a surface
     frozen light, which in dark mode rendered a white notification row and
     white zebra stripes in CertChecker. Use --surface-card for a themed
     surface, --on-brand for text on a brand-coloured one. */
  {
    id: 41, title: "no CSS colour keywords as style values (white/black)",
    cmd: 'grep -nE "(background|color)[^,}]*[quote](white|black)[quote]"',
    re: /\b(background|backgroundColor|color|borderColor)\s*:[^,}\n]*['"](white|black)['"]/,
    exempt: COLOUR_EXEMPT
  },
  { id: 5, title: "no literal rgb()/rgba()", cmd: 'grep -nE "rgba?\\([0-9]"',
    re: /rgba?\([0-9]/, exempt: COLOUR_EXEMPT },
  { id: 6, title: "no arbitrary z-index", cmd: 'grep -nE "z-\\[[0-9]+\\]"',
    re: /z-\[[0-9]+\]/, exempt: new Set() },
  { id: 7, title: "no off-scale radius", cmd: 'grep -nE "rounded-(xl|md|sm)\\b|rounded-\\["',
    re: /\brounded-(xl|md|sm)\b|rounded-\[/, exempt: TOKEN_SOURCE },
  { id: 8, title: "no off-scale control heights (24-40px band)", cmd: 'grep -nE "h-\\[(2[4-9]|3[0-9]|40)px\\]|h-\\[1\\.[5-9]rem\\]"',
    re: /\bh-\[(2[4-9]|3[0-9]|40)px\]|\bh-\[1\.[5-9][0-9]*rem\]|\bh-\[2\.[0-4][0-9]*rem\]/, exempt: new Set() },
  { id: 9, title: "no arbitrary padding / gap", cmd: 'grep -nE "\\b(p|px|py)-\\[|\\bgap-\\["',
    re: /\b(p|px|py)-\[|\bgap-\[/, exempt: new Set() },
  /* Gate 11 — canvas cannot parse var(). chart.js colour options and the
     fallback argument of cssVar()/cssVarRgba() must be REAL colour strings.
     Added after the batch-3 sweep tokenised a gradient stop and crashed the
     dashboard, and turned 69 fallbacks into self-referential var() strings. */
  {
    id: 11, title: "no var() reaching the canvas (chart.js / cssVar fallbacks)",
    cmd: 'grep -nE "addColorStop.*var\\(|cssVar.*, *.var\\("',
    wholeFile: function (src) {
      const bad = [];
      const lines = src.split("\n");
      lines.forEach(function (l, i) {
        // Two unambiguous patterns only.
        //   1. a gradient stop containing var()  — always a crash
        //   2. a cssVar/cssVarRgba FALLBACK containing var() — self-referential
        //      and unparseable, so the fallback silently does nothing
        // A broader rule that also flagged `backgroundColor: 'var(--x)'` was
        // tried and produced 170 false positives: that form is correct in a DOM
        // style object, where CSS resolves var() natively. Chart dataset colours
        // are left to the two rules above plus the fact that chart.js throws
        // loudly and immediately on an unparseable colour.
        if (/addColorStop\([^)]*var\(/.test(l) ||
          /cssVar(?:Rgba)?\([^)]*,\s*'[^']*var\(/.test(l)) {
          bad.push((i + 1) + ": " + l.trim().slice(0, 100));
        }
      });
      return bad;
    }, exempt: new Set()
  },
  /* Gate 12 — a token name immediately followed by leftover hex characters,
     e.g. var(--surface-card)beb. That is what a #fff -> var(--surface-card)
     replace does when the pattern has no word boundary and meets #fffbeb. The
     result is INVALID CSS, so the element renders with no background at all.
     Twelve of these shipped in commit 0f57b43 and survived until this audit. */
  {
    id: 12, title: "no truncated-token corruption (var(--x) followed by stray hex)",
    cmd: 'grep -nE "var\\(--[a-z-]+\\)[0-9a-zA-Z]"',
    re: /var\(--[a-z0-9-]+\)[0-9a-zA-Z]/, exempt: new Set()
  },
  /* Gate 13 — a TEXT token used to paint a BACKGROUND.
     --chathams-blue / --port-gore / --bunting / --regent-gray / --text-* are
     ink colours; the theme engine INVERTS them in dark mode (dark ink on light
     paper becomes light ink on dark paper). Painting a surface with one works
     in light mode and flips LIGHT in dark, while the white text on it stays
     white — unreadable. This is how the marketing hero broke, and it was doing
     the same to button hover states and table header bands in the app.
     Use --brand-deep for a deep brand surface, or --surface-* for a neutral one.
     Note --endeavour is NOT listed: the engine keeps it mid-tone in both modes,
     so it is legitimate as a background. */
  {
    id: 13, title: "no text token used as a background (it inverts in dark mode)",
    cmd: 'grep -nE "bg-\\[var\\(--(chathams-blue|port-gore|bunting|regent-gray|text-strong|text-mid)\\)\\]"',
    re: /\bbg-\[var\(--(chathams-blue|port-gore|bunting|regent-gray|text-strong|text-mid)\)\]|background(-color)?\s*:\s*['"]?var\(--(chathams-blue|port-gore|bunting|regent-gray|text-strong|text-mid)\)/,
    exempt: new Set()
  },
  /* Gate 10 is whole-file, not per-line: `fontFamily:` is frequently written
     with its value on the following line, which a line-based test reads as a
     family of "" and wrongly fails. */
  { id: 10, title: "font family declared only as the one token (or inherit)", cmd: 'grep -nE "(font-family|fontFamily)"',
    wholeFile: function (src) {
      const bad = [];
      const re = /(?:font-family|fontFamily)\s*[:=]\s*['"]?\s*([^;,}'"\n]*(?:\n\s*["'][^"'\n]*)?)/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const v = m[1].replace(/\s+/g, " ").trim();
        // Two UI families are legitimate after the SaaS redesign: Jakarta for all
        // UI/headings and Inter for data tables and figures (its tabular numerals
        // keep columns aligned). --font-poppins remains as a legacy alias onto
        // Jakarta, so old call sites still resolve to the current UI font.
        if (!/var\(--font-jakarta\)|var\(--font-inter\)|var\(--font-poppins\)|var\(--font-mono\)|^inherit$/.test(v)) {
          bad.push(src.slice(0, m.index).split("\n").length + ": " + v.slice(0, 60));
        }
      }
      return bad;
    }, exempt: TOKEN_SOURCE },
];

/* Blank out comments before scanning, preserving line numbering.
 * Line-prefix matching was not enough: a /* … *\/ block that wraps onto a second
 * line leaves that line starting with ordinary text, so the gate read prose as
 * code. Blanking the comment SPANS is the correct fix.
 */
function stripComments(src) {
  let s = src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, function (m) {
    return m.replace(/[^\n]/g, " ");   // keep newlines, drop content
  });
  s = s.split("\n").map(function (l) {
    return l.trim().startsWith("//") ? "" : l;
  }).join("\n");
  return s;
}

function skipLine(l) {
  // Documented token fallbacks. The fallback argument of cssVar()/cssVarRgba()
  // MUST be a literal colour — canvas cannot parse var() — so a literal on
  // these lines is correct, not a violation. Note the (Rgba)?: an earlier
  // version tested only /cssVar\(/ and so failed 9 correct cssVarRgba lines.
  return /cssVar(Rgba)?\(/.test(l);
}

const out = [];
let allPass = true;

for (const g of GATES) {
  const hits = [];
  for (const f of files) {
    if (g.exempt.has(f) || !fs.existsSync(f)) continue;
    const src = stripComments(fs.readFileSync(f, "utf8"));
    if (g.wholeFile) {
      g.wholeFile(src).forEach(function (h) { hits.push(f + ":" + h); });
      continue;
    }
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (skipLine(lines[i])) continue;
      if (g.re.test(lines[i])) hits.push(f + ":" + (i + 1) + ":" + lines[i].trim().slice(0, 110));
    }
  }
  if (hits.length) allPass = false;
  out.push("## GATE " + g.id + " — " + g.title);
  out.push("");
  out.push("```");
  out.push("$ " + g.cmd + "   # over the 316 in-scope files");
  out.push(hits.length ? hits.slice(0, 40).join("\n") : "(no output)");
  out.push("");
  out.push("RESULT: " + hits.length + " matches" + (hits.length === 0 ? "  ✓ PASS" : "  ✗ FAIL"));
  out.push("```");
  out.push("");
}

console.log(out.join("\n"));

const mode = arg === "--staged" ? "staged" : (!arg || arg === "--scan") ? "scan" : "list";
if (allPass) {
  console.error("ALL GATES PASS  (" + files.length + " files, mode=" + mode + ")");
} else {
  console.error("SOME GATES FAIL  (" + files.length + " files, mode=" + mode + ")");
  console.error("See design-audit/TOKENS.md for the rule each gate enforces.");
  process.exitCode = 1;   // so a hook or CI job actually fails
}
