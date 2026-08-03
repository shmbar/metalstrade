/* Before/after metrics over the SAME in-scope file set.
 * "Before" is read from the pre-audit commit so the comparison is honest.
 */
const { execSync } = require("child_process");
const fs = require("fs");

const BASE = "c9aed1a";
const files = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter(Boolean);

function readBase(f) {
  try { return execSync('git show "' + BASE + ':' + f + '"', { maxBuffer: 1e8, stdio: ["ignore", "pipe", "ignore"] }).toString(); }
  catch (e) { return null; }
}
function readNow(f) { try { return fs.readFileSync(f, "utf8"); } catch (e) { return null; } }

function pxOf(v) {
  const m = String(v).match(/^([\d.]+)(rem|px)$/);
  if (!m) return null;
  return m[2] === "rem" ? +(parseFloat(m[1]) * 16).toFixed(2) : parseFloat(m[1]);
}

function measure(reader) {
  const sizes = new Set(), colours = new Set(), z = new Set(), radii = new Set(), heights = new Set();
  let colourCount = 0, sizeCount = 0;
  for (const f of files) {
    const s = reader(f);
    if (s === null) continue;
    // font sizes: arbitrary classes + inline fontSize + named
    (s.match(/text-\[[\d.]+(?:rem|px)\]/g) || []).forEach(function (m) {
      const p = pxOf(m.slice(6, -1)); if (p) { sizes.add(p); sizeCount++; }
    });
    (s.match(/fontSize: *['"][\d.]+(?:rem|px)['"]/g) || []).forEach(function (m) {
      const p = pxOf(m.replace(/.*['"]([^'"]+)['"].*/, "$1")); if (p) { sizes.add(p); sizeCount++; }
    });
    const named = { "text-xs": 12, "text-sm": 14, "text-base": 16, "text-lg": 18, "text-xl": 20, "text-2xl": 24, "text-3xl": 30, "text-4xl": 36, "text-5xl": 48 };
    for (const k in named) {
      const re = new RegExp("(^|[^-:\\w])" + k + "\\b", "g");
      const n = (s.match(re) || []).length;
      if (n) { sizes.add(named[k]); sizeCount += n; }
    }
    // colours
    (s.match(/(?:^|[^&])#[0-9a-fA-F]{3,8}\b/g) || []).forEach(function (m) { colours.add(m.replace(/^[^#]/, "").toLowerCase()); colourCount++; });
    (s.match(/rgba?\([0-9][^)]*\)/g) || []).forEach(function (m) { colours.add(m.replace(/\s/g, "")); colourCount++; });
    // z-index
    (s.match(/\bz-\[?\d+\]?/g) || []).forEach(function (m) { z.add(m); });
    // radii
    (s.match(/\brounded-(none|sm|md|lg|xl|2xl|3xl|full)\b|rounded-\[[^\]]+\]/g) || []).forEach(function (m) { radii.add(m); });
    // control heights
    (s.match(/\bh-\[[\d.]+(?:px|rem)\]/g) || []).forEach(function (m) {
      const p = pxOf(m.slice(3, -1)); if (p && p >= 20 && p <= 44) heights.add(p);
    });
    (s.match(/\bh-(6|7|8|9|10|11)\b/g) || []).forEach(function (m) { heights.add(parseInt(m.slice(2)) * 4); });
  }
  return { sizes, colours, z, radii, heights, colourCount, sizeCount };
}

const before = measure(readBase);
const after = measure(readNow);

function row(label, b, a) {
  console.log("| " + label + " | " + b + " | " + a + " |");
}
console.log("| Metric | Before | After |");
console.log("|---|---|---|");
row("Distinct text sizes in use", before.sizes.size, after.sizes.size);
row("Total sized elements", before.sizeCount, after.sizeCount);
row("Distinct hardcoded colour literals", before.colours.size, after.colours.size);
row("Total hardcoded colour occurrences", before.colourCount, after.colourCount);
row("Distinct z-index values", before.z.size, after.z.size);
row("Distinct radius values", before.radii.size, after.radii.size);
row("Distinct control heights (20-44px)", before.heights.size, after.heights.size);
console.log("");
console.log("BEFORE sizes: " + [...before.sizes].sort(function (a, b) { return a - b; }).join(" "));
console.log("AFTER  sizes: " + [...after.sizes].sort(function (a, b) { return a - b; }).join(" "));
console.log("");
console.log("BEFORE z: " + [...before.z].sort().join(" "));
console.log("AFTER  z: " + [...after.z].sort().join(" "));
console.log("");
console.log("BEFORE radii: " + [...before.radii].sort().join(" "));
console.log("AFTER  radii: " + [...after.radii].sort().join(" "));
console.log("");
console.log("BEFORE heights: " + [...before.heights].sort(function (a, b) { return a - b; }).join(" "));
console.log("AFTER  heights: " + [...after.heights].sort(function (a, b) { return a - b; }).join(" "));
