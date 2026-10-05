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

  it('nothing navigates around lib/nav: no useRouter, Link or navigation.* calls', () => {
    const BYPASS = /\buseRouter\(|<Link\b|\bnavigation\.(navigate|push|goBack|pop|replace|dispatch|reset)\(|\b(CommonActions|StackActions)\./;
    const offenders = files
      .filter((f) => rel(f) !== 'src/lib/nav.ts')
      .filter((f) => BYPASS.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the paths that do not start from a button go through it too', () => {
    // App-icon shortcuts: the library's hook would use expo-router's own router.
    expect(read('app/_layout.tsx')).toContain('useQuickActionRouting(openShortcut)');
    // The IMS ↔ GIS reset and signing out take screens away wholesale — after any sheet.
    expect(read('app/(app)/_layout.tsx')).toMatch(/sheets\.whenGone\(\(\) => navRef\.reset\(/);
    const auth = read('src/store/auth.ts');
    expect(auth).toContain('sheets.closeAll();');
    expect(auth.indexOf('sheets.whenGone(resolve)')).toBeLessThan(auth.indexOf('await fbSignOut(auth)'));
  });

  it('the five "tap in a sheet, go somewhere" screens use the registered Sheet and lib/nav', () => {
    // Each closed its sheet and navigated in the same tick — the collision that left an
    // invisible layer over the app. What makes them safe now is shared, so it is pinned here.
    const sites = [
      ['app/(app)/contracts/[id].tsx', /setSheet\(null\);\s*router\.push\(/],
      ['app/(app)/contracts/index.tsx', /setAlertsOpen\(false\);\s*router\.push\(/],
      ['app/(app)/shipment.tsx', /setEditing\(null\);\s*router\.push\(/],
      ['src/features/stocks/LotSheet.tsx', /onClose\(\);\s*router\.push\(/],
      ['app/(app)/expense-edit.tsx', /setFindOpen\(false\);\s*backWhenDone\(\);/],
    ];
    for (const [p, closeThenGo] of sites) {
      const src = read(p);
      expect(src, p).toMatch(closeThenGo); // the pattern is still there…
      expect(src, p).toMatch(/<Sheet\b/); // …inside the one Sheet that registers itself…
      expect(src, p).toMatch(/import \{[^}]*\} from '@\/lib\/nav';/); // …navigating through the gate
      expect(src, p).not.toMatch(/import\s*\{[^}]*\brouter\b[^}]*\}\s*from\s*['"]expo-router['"]/);
    }
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

// Dashboard and Cashflow sat on their skeletons (client, 2026-10-05): every bulk read queued
// behind the stock ledger on the full SDK's one stream, the Dashboard made its requests one
// after another, and the same year buckets were downloaded again and again. What fixed it
// is shared, so it is pinned here (see __tests__/read-layer.test.ts for the behaviour).
describe('Dashboard and Cashflow load without waiting on each other', () => {
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  /** The body of a top-level function in a module, up to the next top-level declaration. */
  const fnBody = (src, name) => {
    const start = src.search(new RegExp(`^(export )?(async )?function ${name}\\b`, 'm'));
    expect(start, `${name} not found`).toBeGreaterThanOrEqual(0);
    const rest = src.slice(start + 1);
    const end = rest.search(/^(export |async function |function |const |let )/m);
    return end < 0 ? rest : rest.slice(0, end);
  };

  it('the screens\' bulk reads go through the shared read layer, never the listeners\' stream', () => {
    const src = read('src/data/firestore.ts');
    for (const name of ['loadData', 'loadInvoicesTagged', 'loadFlatByDate', 'loadMargins', 'getInvoicesBatched', 'loadDocsByIdBatched', 'buildInvoiceIndex', 'loadNotifications', 'loadAllStockData']) {
      expect(fnBody(src, name), name).not.toMatch(/\bgetDocs?\(/);
    }
    expect(read('src/features/cashflow/useCashflow.ts')).not.toMatch(/loadDataSettings/);
  });

  it('the Dashboard starts its reads together — one wave, not a chain of awaits', () => {
    const body = fnBody(read('src/features/dashboard/useDashboard.ts'), 'loadDashboardInputs');
    // the contracts' invoice index (needs the contracts) and the one Promise.all — nothing else waits
    expect(body.match(/\bawait\b/g)).toHaveLength(2);
    expect(body).toMatch(/await Promise\.all\(/);
  });

  it('a save drops the shared reads when it starts and when it lands', () => {
    const src = read('src/data/writes.ts');
    const imported = src.match(/import \{([^}]*)\} from 'firebase\/firestore'/)[1];
    for (const fn of ['setDoc', 'updateDoc', 'deleteDoc', 'writeBatch']) {
      expect(imported).toMatch(new RegExp(`\\b${fn} as sdk\\w+`));
      expect(imported).not.toMatch(new RegExp(`(^|[\\s,])${fn}\\s*(,|$)`));
    }
    expect(src.match(/aroundWrite\(/g).length).toBeGreaterThanOrEqual(4);
  });

  it('a pull to refresh and an invalidation drop them too; sign-out forgets them', () => {
    expect(read('src/components/ui/Screen.tsx')).toMatch(/clearCollectionReads\(\);\s*onRefresh\(\);/);
    expect(read('app/_layout.tsx')).toContain('dropSharedReadsOnInvalidate(queryClient);');
    expect(read('src/store/auth.ts')).toMatch(/queryClient\.clear\(\);\s*clearCollectionReads\(\);/);
  });

  it('background downloads wait for the first screen; a screen that needs the ledger does not', () => {
    for (const p of ['src/features/stocks/useWarmLedger.ts', 'src/features/live/useLiveSync.ts']) {
      expect(read(p)).toContain('launch.whenSettled()');
    }
    expect(read('src/features/stocks/useAllStockLots.ts')).not.toContain('whenSettled');
    const layout = read('app/(app)/_layout.tsx');
    const at = (s) => layout.indexOf(s);
    expect(at('useLaunchSession(uidCollection);')).toBeGreaterThan(0);
    expect(at('useLaunchSession(uidCollection);')).toBeLessThan(at('useLiveSync(uidCollection);'));
    expect(at('useLaunchSession(uidCollection);')).toBeLessThan(at('useWarmLedger(uidCollection);'));
    expect(read('app/_layout.tsx')).toMatch(/onSuccess=\{markRestored\}\s*onError=\{markRestored\}/);
  });

  it('Cashflow never shows a stock figure worked out without the ledger', () => {
    const screen = read('app/(app)/cashflow.tsx');
    expect(screen).toContain('const { flows: data, stock, data: whole');
    expect(screen).not.toMatch(/\bdata\.(stocksPaid|stocksUnpaid|stocksPaidTotal|stocksUnpaidTotal|unsoldBySupplier|unsoldByCur|unsoldTotal|totalLeft|balance)\b/);
    expect(screen).toMatch(/buildCashflowReport\(whole,/);
  });
});
