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

  it('every button ticks on touch-down — firmer for primary/danger, light for the rest', () => {
    // Client, 2026-09-24: "haptic feels slow" (a Save only buzzed when the server answered);
    // 2026-09-30: "buttons sometimes have no haptic". Both live in the components, not screens.
    const button = fs.readFileSync(path.join(ROOT, 'src/components/ui/Button.tsx'), 'utf8');
    expect(button).toContain("haptic={variant === 'primary' || variant === 'danger' ? 'impact' : 'selection'}");
    const iconButton = fs.readFileSync(path.join(ROOT, 'src/components/ui/IconButton.tsx'), 'utf8');
    expect(iconButton).toMatch(/haptic = 'selection'/);
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

// Client, 2026-10-05: "buttons getting stuck or not responding when navigating". The causes
// were shared, so the fixes live in shared code — and these keep them from being undone.
describe('navigation and touch safety', () => {
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

  it('every navigation goes through lib/nav — no screen imports expo-router\'s router', () => {
    // lib/nav drops double taps and never navigates while a sheet is on screen.
    const offenders = files
      .filter((f) => rel(f) !== 'src/lib/nav.ts')
      .filter((f) => /import\s*\{[^}]*\brouter\b[^}]*\}\s*from\s*['"]expo-router['"]/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the only Modal is Sheet, and Sheet reports itself to the sheet registry', () => {
    // JSX at the start of a line — not a comment that mentions one.
    const raw = files.filter((f) => rel(f) !== 'src/components/ui/Sheet.tsx' && /^\s*<Modal\b/m.test(fs.readFileSync(f, 'utf8'))).map(rel);
    expect(raw).toEqual([]);
    const sheet = read('src/components/ui/Sheet.tsx');
    expect(sheet).toContain('sheets.opened(');
    expect(sheet).toContain('sheets.closed(id)');
  });

  it('a toast never takes a tap — it sits over the Back button after every save', () => {
    const host = read('src/components/ToastHost.tsx');
    expect(host).toContain('pointerEvents="none"');
    expect(host).not.toMatch(/<Pressable\b/);
  });

  it('a disabled control looks disabled: the press dim multiplies its opacity', () => {
    const pressable = read('src/components/ui/Pressable.tsx');
    expect(pressable).toMatch(/opacity: restOpacity \* \(/);
  });

  it('a double tap on a Button or IconButton is one action', () => {
    for (const p of ['src/components/ui/Button.tsx', 'src/components/ui/IconButton.tsx']) {
      expect(read(p)).toContain('pressGuardMs={PRESS_GUARD_MS}');
    }
  });

  it('the device copy is never written on a timer while the app is in use', () => {
    const client = read('src/query/client.ts');
    expect(client).toContain('persistWhenAway(');
    expect(client).not.toMatch(/throttleTime:\s*[1-9]/);
  });

  it('a save runs when pressed — never paused behind a network check that may be wrong', () => {
    expect(read('src/query/client.ts')).toContain("mutations: { networkMode: 'always' }");
  });

  it('the offline pill never catches a tap meant for the header under it', () => {
    expect(read('src/components/OfflineBanner.tsx')).toContain('pointerEvents="none"');
  });

  it('each hidden-tab form starts over for every open (keyed by lib/nav\'s visit number)', () => {
    for (const [p, name] of [['app/(app)/expense-edit.tsx', 'ExpenseEdit'], ['app/(app)/sales-contract-edit.tsx', 'SalesContractEdit']]) {
      const src = read(p);
      expect(src).toContain(`export default function ${name}Screen()`);
      expect(src).toContain(`<${name} key={_v || 'first'} />`);
    }
  });
});
