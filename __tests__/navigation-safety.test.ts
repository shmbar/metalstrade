/**
 * Buttons stuck or not responding when moving between screens (client, 2026-10-05).
 *
 * The shared causes, each pinned here against the real modules:
 *  - a sheet closed and a screen pushed in the same moment (an invisible layer on iOS),
 *    and double taps stacking a screen twice → lib/sheetRegistry + lib/navGate;
 *  - the whole 10.7 MB device copy re-serialised every 30 s while the app was in use
 *    → query/backgroundPersister;
 *  - every navigation in the app passing through lib/nav (the design guard enforces the import).
 */
import { describe, it, expect } from 'vitest';
import { createSheetRegistry, SHEET_LEAVE_MS, SHEET_MAX_WAIT_MS } from '@/lib/sheetRegistry';
import { createNavGate, hrefKey, withVisit, FRESH_ON_OPEN, DUP_MS, BACK_DUP_MS } from '@/lib/navGate';
import { persistWhenAway } from '@/query/backgroundPersister';

// A clock and timer queue the tests move by hand.
function fakeTime() {
  let t = 1_000_000;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => t,
    setTimer: (fn: () => void, ms: number) => {
      const id = ++seq;
      timers.set(id, { at: t + ms, fn });
      return id;
    },
    clearTimer: (id: unknown) => {
      timers.delete(id as number);
    },
    advance(ms: number) {
      const end = t + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        t = due[1].at;
        due[1].fn();
      }
      t = end;
    },
  };
}

function setup() {
  const time = fakeTime();
  const sheets = createSheetRegistry(time);
  const gate = createNavGate({ now: time.now, sheets });
  const log: string[] = [];
  return { time, sheets, gate, log };
}

describe('sheets: navigation waits until a sheet has left the screen', () => {
  it('a sheet counts while open and for the moment it takes to leave', () => {
    const { time, sheets } = setup();
    expect(sheets.busy()).toBe(false);
    const id = sheets.opened(() => {});
    expect(sheets.busy()).toBe(true);
    sheets.closed(id);
    expect(sheets.busy()).toBe(true); // still fading out natively
    time.advance(SHEET_LEAVE_MS - 1);
    expect(sheets.busy()).toBe(true);
    time.advance(1);
    expect(sheets.busy()).toBe(false);
  });

  it('runs a waiting navigation only after the last sheet has left', () => {
    const { time, sheets, log } = setup();
    const a = sheets.opened(() => {});
    const b = sheets.opened(() => {});
    sheets.whenGone(() => log.push('go'));
    sheets.closed(a);
    time.advance(SHEET_LEAVE_MS + 10);
    expect(log).toEqual([]); // b is still open
    sheets.closed(b);
    time.advance(SHEET_LEAVE_MS - 1);
    expect(log).toEqual([]);
    time.advance(1);
    expect(log).toEqual(['go']);
  });

  it('never holds a navigation past the cap, even if a sheet ignores its close', () => {
    const { time, sheets, log } = setup();
    sheets.opened(() => {}); // an owner that does not close
    sheets.whenGone(() => log.push('go'));
    time.advance(SHEET_MAX_WAIT_MS - 1);
    expect(log).toEqual([]);
    time.advance(1);
    expect(log).toEqual(['go']); // a tap is never swallowed
  });

  it('closeAll asks every open sheet to close; one that throws does not stop the rest', () => {
    const { sheets } = setup();
    const closed: string[] = [];
    sheets.opened(() => closed.push('a'));
    sheets.opened(() => {
      throw new Error('boom');
    });
    sheets.opened(() => closed.push('c'));
    sheets.closeAll();
    expect(closed).toEqual(['a', 'c']);
  });

  it('with nothing on screen a navigation runs at once', () => {
    const { sheets, log } = setup();
    sheets.whenGone(() => log.push('go'));
    expect(log).toEqual(['go']);
  });
});

describe('navigation: one move per tap, never through a closing sheet', () => {
  it('"tap a row in the sheet, open that record": the push waits for the sheet to leave', () => {
    // contracts/[id] (and four more screens) did `setSheet(null); router.push(...)`.
    const { time, sheets, gate, log } = setup();
    let open = true;
    const id = sheets.opened(() => {
      open = false;
    });
    // The handler: close the sheet, then navigate — in the same tick.
    gate('push:/(app)/contracts/c1', () => log.push('push'));
    expect(log).toEqual([]); // not while the sheet is on screen…
    expect(open).toBe(false); // …which the gate asked to close
    sheets.closed(id); // React commits: the sheet unmounts
    time.advance(SHEET_LEAVE_MS);
    expect(log).toEqual(['push']); // …and only then the push
  });

  it('a navigation from outside (a push notification) closes an open sheet first', () => {
    const { time, sheets, gate, log } = setup();
    let id = 0;
    id = sheets.opened(() => sheets.closed(id)); // its owner closes it when asked
    gate('push:/(app)/invoices/77', () => log.push('push'));
    expect(log).toEqual([]);
    time.advance(SHEET_LEAVE_MS);
    expect(log).toEqual(['push']);
  });

  it('a double tap on a row opens the record once', () => {
    const { time, gate, log } = setup();
    expect(gate('push:/(app)/contracts/c1', () => log.push('1'))).toBe(true);
    time.advance(120);
    expect(gate('push:/(app)/contracts/c1', () => log.push('2'))).toBe(false);
    expect(log).toEqual(['1']);
    time.advance(DUP_MS);
    gate('push:/(app)/contracts/c1', () => log.push('3')); // a real second visit later
    expect(log).toEqual(['1', '3']);
  });

  it('two different taps are two moves', () => {
    const { time, gate, log } = setup();
    gate('push:/a', () => log.push('a'));
    time.advance(50);
    gate('push:/b', () => log.push('b'));
    expect(log).toEqual(['a', 'b']);
  });

  it('a double tap on Back goes back one screen, not two', () => {
    const { time, gate, log } = setup();
    gate('back', () => log.push('back'), { back: true });
    time.advance(200);
    gate('back', () => log.push('back'), { back: true });
    expect(log).toEqual(['back']);
    time.advance(BACK_DUP_MS);
    gate('back', () => log.push('back'), { back: true });
    expect(log).toEqual(['back', 'back']);
  });

  it('identifies an href however it is written', () => {
    expect(hrefKey('/(app)/contracts/c1')).toBe('/(app)/contracts/c1');
    expect(hrefKey({ pathname: '/(app)/contracts/po-invoices', params: { id: 'c1', tab: 'x' } }))
      .toBe(hrefKey({ params: { tab: 'x', id: 'c1' }, pathname: '/(app)/contracts/po-invoices' }));
    expect(hrefKey({ pathname: '/p', params: { id: 'c1' } })).not.toBe(hrefKey({ pathname: '/p', params: { id: 'c2' } }));
  });
});

describe('stress: thousands of rapid random tap sequences', () => {
  // A small seeded PRNG, so a failure reproduces exactly.
  const prng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  it('never navigates under a sheet, never loses an accepted tap, never strands a waiting move', () => {
    for (let run = 0; run < 2000; run++) {
      const rnd = prng(run + 1);
      const { time, sheets, gate } = setup();
      const open = new Set<number>();
      let accepted = 0;
      let ran = 0;
      const violations: string[] = [];
      const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

      const openSheet = () => {
        let id = 0;
        // Its owner closes it when asked, a few ms later (React committing the change).
        id = sheets.opened(() => {
          time.setTimer(() => {
            if (open.delete(id)) sheets.closed(id);
          }, Math.floor(rnd() * 40));
        });
        open.add(id);
      };
      const navigate = (key: string, back = false) => {
        const requestedAt = time.now();
        const ok = gate(key, () => {
          ran++;
          const waited = time.now() - requestedAt;
          if (sheets.busy() && waited < SHEET_MAX_WAIT_MS) violations.push(`${key} ran under a sheet after ${waited} ms`);
        }, { back });
        if (ok) accepted++;
      };

      for (let step = 0; step < 40; step++) {
        const action = pick(['open', 'close', 'push', 'pushSame', 'back', 'wait', 'wait']);
        if (action === 'open') openSheet();
        if (action === 'close' && open.size) {
          const id = pick([...open]);
          open.delete(id);
          sheets.closed(id);
        }
        if (action === 'push') navigate(`push:/(app)/screen-${Math.floor(rnd() * 5)}`);
        if (action === 'pushSame') {
          navigate('push:/(app)/contracts/c1');
          time.advance(Math.floor(rnd() * 150)); // a human double tap
          navigate('push:/(app)/contracts/c1');
        }
        if (action === 'back') navigate('back', true);
        time.advance(Math.floor(rnd() * (action === 'wait' ? 900 : 60)));
      }
      // Close whatever is still open and let everything settle.
      [...open].forEach((id) => sheets.closed(id));
      open.clear();
      time.advance(SHEET_MAX_WAIT_MS + SHEET_LEAVE_MS);

      expect(violations).toEqual([]);
      expect(ran).toBe(accepted); // every tap that was not a double tap did navigate
      expect(sheets.busy()).toBe(false);
    }
  });
});

describe('a form that lives as a hidden tab starts fresh on every open', () => {
  // expense-edit and sales-contract-edit stay mounted between visits; "New" after viewing
  // expense A opened with A's id and figures, and Save overwrote A.
  it('every open of those forms carries a new visit number', () => {
    expect(FRESH_ON_OPEN).toEqual(['/(app)/expense-edit', '/(app)/sales-contract-edit']);
    expect(withVisit('/(app)/expense-edit?id=new&kind=company', 7)).toBe('/(app)/expense-edit?id=new&kind=company&_v=7');
    expect(withVisit('/(app)/sales-contract-edit?id=new', 8)).toBe('/(app)/sales-contract-edit?id=new&_v=8');
    expect(withVisit({ pathname: '/(app)/expense-edit', params: { id: 'e1' } }, 9))
      .toEqual({ pathname: '/(app)/expense-edit', params: { id: 'e1', _v: '9' } });
  });

  it('two opens of "New" are two different visits', () => {
    expect(withVisit('/(app)/expense-edit?id=new', 1)).not.toBe(withVisit('/(app)/expense-edit?id=new', 2));
  });

  it('every other route is left exactly as written', () => {
    expect(withVisit('/(app)/contracts/c1', 3)).toBe('/(app)/contracts/c1');
    expect(withVisit('/(app)/attachments?id=e1', 3)).toBe('/(app)/attachments?id=e1');
    expect(withVisit({ pathname: '/(app)/contracts/po-invoices', params: { id: 'c1' } }, 3))
      .toEqual({ pathname: '/(app)/contracts/po-invoices', params: { id: 'c1' } });
  });

  it('a double tap on "New" is still one open — the visit number is added after the check', () => {
    const { time, gate, log } = setup();
    const href = '/(app)/expense-edit?id=new&kind=company';
    gate(`push:${hrefKey(href)}`, () => log.push(String(withVisit(href, 1))));
    time.advance(100);
    gate(`push:${hrefKey(href)}`, () => log.push(String(withVisit(href, 2))));
    expect(log).toEqual(['/(app)/expense-edit?id=new&kind=company&_v=1']);
  });
});

describe('the device copy is written when the app is put away, never while it is in use', () => {
  function fakeStorage() {
    const writes: any[] = [];
    let removed = 0;
    let listener: (s: string) => void = () => {};
    const inner = {
      persistClient: async (c: any) => {
        writes.push(c);
      },
      restoreClient: async () => ({ restored: true }) as any,
      removeClient: async () => {
        removed++;
      },
    };
    const persister = persistWhenAway(inner as any, (l) => {
      listener = l;
    });
    return { writes, persister, setState: (s: string) => listener(s), removed: () => removed };
  }

  it('a data change while the app is open writes nothing', async () => {
    const { writes, persister } = fakeStorage();
    await persister.persistClient({ n: 1 } as any);
    await persister.persistClient({ n: 2 } as any);
    expect(writes).toEqual([]);
  });

  it('putting the app away writes the latest snapshot, once', async () => {
    const { writes, persister, setState } = fakeStorage();
    await persister.persistClient({ n: 1 } as any);
    await persister.persistClient({ n: 2 } as any);
    setState('inactive');
    setState('background');
    await Promise.resolve();
    expect(writes).toEqual([{ n: 2 }]);
    setState('active');
    expect(writes).toHaveLength(1);
  });

  it('signing out drops a snapshot taken before it, and restore reads straight through', async () => {
    const { writes, persister, setState, removed } = fakeStorage();
    await persister.persistClient({ n: 1 } as any);
    await persister.removeClient();
    setState('background');
    await Promise.resolve();
    expect(writes).toEqual([]);
    expect(removed()).toBe(1);
    expect(await persister.restoreClient()).toEqual({ restored: true });
  });
});
