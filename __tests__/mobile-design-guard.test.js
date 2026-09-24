import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The mobile app's type ladder and haptics vocabulary only stay consistent if screens
// can't reach past them (client review 2026-09-16: "font size, uneven, and haptic
// feedback"). This is the mobile counterpart of web's design:check.
const ROOT = path.resolve(__dirname, '../mobile');
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
};
walk(path.join(ROOT, 'app'));
walk(path.join(ROOT, 'src'));
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

// Where setting a font directly is the point: the ladder itself, and a glyph sized to its disc.
const FONT_ALLOWED = new Set(['src/theme/tokens.ts', 'src/components/ui/Avatar.tsx']);

describe('mobile design guard', () => {
  it('no screen sets fontSize or fontFamily except through typography tokens', () => {
    const offenders = [];
    for (const f of files) {
      if (FONT_ALLOWED.has(rel(f))) continue;
      fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/\bfont(Size|Family):/.test(line) && !/typography\.\w+\.font(Size|Family)/.test(line)) offenders.push(`${rel(f)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('every Text variant used exists in the ladder', () => {
    const tokens = fs.readFileSync(path.join(ROOT, 'src/theme/tokens.ts'), 'utf8');
    const ladder = tokens.slice(tokens.indexOf('export const typography'), tokens.indexOf('} as const;', tokens.indexOf('export const typography')));
    const known = new Set([...ladder.matchAll(/^\s{2}(\w+): \{/gm)].map((m) => m[1]));
    const unknown = [];
    for (const f of files) {
      const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/<Text\b[^>]*?\bvariant="(\w+)"/g)) if (!known.has(m[1])) unknown.push(`${rel(f)}: ${m[1]}`);
    }
    expect(unknown).toEqual([]);
  });

  it('haptics only go through lib/haptics', () => {
    const direct = files.filter((f) => rel(f) !== 'src/lib/haptics.ts' && /from 'expo-haptics'/.test(fs.readFileSync(f, 'utf8'))).map(rel);
    expect(direct).toEqual([]);
  });

  it('primary and danger buttons tick on touch-down; secondary buttons stay silent', () => {
    // Client, 2026-09-24: "haptic feels slow". A Save's only feedback used to be the success
    // pulse after the server answered. The press itself is now acknowledged at once.
    const button = fs.readFileSync(path.join(ROOT, 'src/components/ui/Button.tsx'), 'utf8');
    expect(button).toContain("haptic={variant === 'primary' || variant === 'danger' ? 'impact' : undefined}");
  });

  it('selection haptics fire on touch-down, never from a tap-release handler', () => {
    // onPress runs when the finger LIFTS and after the JS thread handles the tap; iOS's own
    // controls tick on touch-down. Use the Pressable/IconButton/Card `haptic` prop instead.
    const offenders = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      src.split(/\r?\n/).forEach((line, i) => {
        if (/onPress=\{[^}]*haptics\.selection\(\)/.test(line)) offenders.push(`${rel(f)}:${i + 1}`);
      });
      if (/onPress=\{(async )?\(\) => \{\s*\n\s*haptics\.selection\(\)/.test(src)) offenders.push(`${rel(f)} (multi-line onPress)`);
    }
    expect(offenders).toEqual([]);
  });
});
