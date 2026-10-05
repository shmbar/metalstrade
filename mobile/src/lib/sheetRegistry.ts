// Which sheets are on screen, and when the last one has finally left. Pure — the clock and
// timers are injected, so __tests__/navigation-safety.test.ts drives it directly.
//
// Every <Sheet> is a React Native Modal: a separate iOS view controller laid over the whole
// app. When a sheet closes and a screen is pushed in the same moment — "tap a row in the
// sheet, open that record", five places in the app did exactly this — UIKit is asked to
// dismiss one controller and run a push transition at once. When those collide the modal's
// transparent controller can stay on screen with nothing drawn in it: an invisible layer
// over the app that swallows every tap, which is the "buttons stuck after moving to another
// page" the client kept reporting. The same happens when a screen is frozen (freezeOnBlur)
// with its sheet still presented.
//
// So navigation (lib/nav) asks here first: while a sheet is open it is closed, and the
// navigation waits until the sheet has had time to leave the screen.

/** How long a closed sheet may still be on screen natively — the iOS fade-out, with margin. */
export const SHEET_LEAVE_MS = 450;
/** Never hold a navigation longer than this, whatever a sheet does — a stuck tap is worse. */
export const SHEET_MAX_WAIT_MS = 1500;

export interface SheetRegistry {
  /** A sheet has been presented. Returns its id; `close` asks its owner to close it. */
  opened(close: () => void): number;
  /** That sheet is closing (hidden or unmounted). It still counts until it has left. */
  closed(id: number): void;
  /** True while any sheet is open or still leaving the screen. */
  busy(): boolean;
  /** Ask every open sheet's owner to close it. */
  closeAll(): void;
  /** Run `fn` once no sheet is open or leaving — at the latest after SHEET_MAX_WAIT_MS. */
  whenGone(fn: () => void): void;
}

export function createSheetRegistry(deps: {
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (t: unknown) => void;
}): SheetRegistry {
  const open = new Map<number, () => void>();
  let seq = 0;
  let leavingUntil = 0;
  let waiters: { fn: () => void; deadline: number }[] = [];
  let timer: unknown = null;

  const busy = () => open.size > 0 || deps.now() < leavingUntil;

  const flush = () => {
    timer = null;
    const t = deps.now();
    const ready = !busy();
    const due = waiters.filter((w) => ready || t >= w.deadline);
    waiters = waiters.filter((w) => !(ready || t >= w.deadline));
    due.forEach((w) => {
      try {
        w.fn();
      } catch {
        // one failing navigation must not strand the rest
      }
    });
    arm();
  };

  // Wake at the next moment something can change: the leaving window ending, or the
  // earliest waiter's deadline.
  const arm = () => {
    if (timer != null) {
      deps.clearTimer(timer);
      timer = null;
    }
    if (!waiters.length) return;
    const t = deps.now();
    const candidates = [Math.min(...waiters.map((w) => w.deadline))];
    if (!open.size && leavingUntil > t) candidates.push(leavingUntil);
    const at = Math.min(...candidates);
    timer = deps.setTimer(flush, Math.max(0, at - t));
  };

  return {
    opened(close) {
      const id = ++seq;
      open.set(id, close);
      return id;
    },
    closed(id) {
      if (!open.delete(id)) return;
      leavingUntil = Math.max(leavingUntil, deps.now() + SHEET_LEAVE_MS);
      arm();
    },
    busy,
    closeAll() {
      [...open.values()].forEach((close) => {
        try {
          close();
        } catch {
          // a sheet whose owner throws on close still lets the others close
        }
      });
    },
    whenGone(fn) {
      if (!busy()) {
        fn();
        return;
      }
      waiters.push({ fn, deadline: deps.now() + SHEET_MAX_WAIT_MS });
      arm();
    },
  };
}

/** The app's one registry. */
export const sheets = createSheetRegistry({
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
});
