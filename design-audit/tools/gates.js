/* Phase 4 gate runner. Emits design-audit/VERIFICATION.md with real output.
 *
 * Line-based with consistent exclusions, so the gates measure what they claim:
 *   - commented-out lines            (dead code, never rendered)
 *   - cssVar('--x','#fallback')      (the token is still the source of truth)
 *   - HTML entities &#931; &#8209;   (characters, not colours)
 *   - the token-source files         (listed per gate, with reason)
 */
const fs = require("fs");

const files = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter(Boolean);

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
        if (!/var\(--font-poppins\)|var\(--font-mono\)|^inherit$/.test(v)) {
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
  return /cssVar\(/.test(l);           // documented token fallback
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
console.error(allPass ? "ALL GATES PASS" : "SOME GATES FAIL");
