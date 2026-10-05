// The rules every navigation passes through (lib/nav). Pure — the clock and the sheet
// registry are injected, so __tests__/navigation-safety.test.ts drives it directly.
//
//  1. A double tap is one navigation. The same push/replace within DUP_MS, or a second
//     back within BACK_DUP_MS, is dropped: two quick taps on a row used to stack the same
//     screen twice — Back then "did nothing" (it went to the copy) — and a double tap on
//     Back skipped a screen.
//  2. No navigation while a sheet is on screen. The sheet is closed first and the
//     navigation runs once it has left (lib/sheetRegistry explains the invisible layer this
//     prevents) — at the latest SHEET_MAX_WAIT_MS later, so a tap is never swallowed.

export const DUP_MS = 700;
export const BACK_DUP_MS = 450;

export interface GateSheets {
  busy(): boolean;
  closeAll(): void;
  whenGone(fn: () => void): void;
}

/** A stable identity for an href — a string, or { pathname, params } in any key order. */
export function hrefKey(href: unknown): string {
  if (href == null) return '';
  if (typeof href === 'string') return href;
  if (typeof href !== 'object') return String(href);
  const h = href as { pathname?: unknown; params?: Record<string, unknown> };
  const params = h.params && typeof h.params === 'object'
    ? Object.keys(h.params).sort().map((k) => `${k}=${String((h.params as Record<string, unknown>)[k])}`).join('&')
    : '';
  return `${String(h.pathname ?? '')}?${params}`;
}

/*
 * Forms that live as hidden TABS stay mounted between visits — tab screens are never
 * unmounted — and kept their state: "New expense" after looking at expense A opened with
 * A's figures and A's id, so Save overwrote A; a second "New" reopened the first one's
 * values. Every OPEN of these forms carries a fresh visit number (`_v`), and the screen
 * starts over for each one (keyed by it). Coming back to the form — from its Attachments,
 * say — is a back, not an open: same visit, nothing typed is lost.
 */
export const FRESH_ON_OPEN = ['/(app)/expense-edit', '/(app)/sales-contract-edit'];

export function withVisit(href: unknown, visit: number): unknown {
  if (typeof href === 'string') {
    const path = href.split('?')[0];
    if (!FRESH_ON_OPEN.includes(path)) return href;
    return `${href}${href.includes('?') ? '&' : '?'}_v=${visit}`;
  }
  if (href && typeof href === 'object') {
    const h = href as { pathname?: string; params?: Record<string, unknown> };
    if (!h.pathname || !FRESH_ON_OPEN.includes(h.pathname)) return href;
    return { ...h, params: { ...(h.params || {}), _v: String(visit) } };
  }
  return href;
}

export function createNavGate(deps: { now: () => number; sheets: GateSheets }) {
  let lastKey = '';
  let lastAt = Number.NEGATIVE_INFINITY;

  /** Run `run` under the rules above. Returns false when it was dropped as a double tap. */
  return function go(key: string, run: () => void, opts: { back?: boolean; dedupe?: boolean } = {}): boolean {
    const t = deps.now();
    const window = opts.back ? BACK_DUP_MS : DUP_MS;
    if (opts.dedupe !== false && key === lastKey && t - lastAt < window) return false;
    lastKey = key;
    lastAt = t;
    if (deps.sheets.busy()) {
      deps.sheets.closeAll();
      deps.sheets.whenGone(run);
    } else {
      run();
    }
    return true;
  };
}
