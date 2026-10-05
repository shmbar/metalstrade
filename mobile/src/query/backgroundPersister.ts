import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/*
 * The device copy of the data is written when the app LEAVES the foreground — never while
 * someone is using it.
 *
 * The whole query cache is one AsyncStorage value: about 10.7 MB in an ordinary session
 * (measured 2026-09-11; 3,325 stock lots alone are 5.1 MB). Writing it means
 * JSON.stringify on the JS thread — 154 ms on a laptop, several times that on a phone —
 * and the thread that runs every button runs nothing else meanwhile. The old setup wrote
 * it at most every 30 s after any data change: a refetch on every screen change, every
 * teammate's save through live sync. So while someone moved through the app it froze for
 * up to a second every half minute, and a tap that landed in that window did nothing —
 * "buttons getting stuck when navigating" (client, 2026-10-05).
 *
 * Now the latest snapshot is only remembered, and written the moment the app goes
 * inactive or into the background (switching app, locking the phone, the app switcher),
 * when nobody is tapping. iOS gives a backgrounding app several seconds, which is plenty.
 * The copy exists for a launch with no signal; an app the system kills in the foreground
 * loses at most the changes since it was last put away.
 */
export function persistWhenAway(
  inner: Persister,
  onAppStateChange: (listener: (state: string) => void) => unknown
): Persister & { flush: () => Promise<void> } {
  let latest: PersistedClient | null = null;

  const flush = async () => {
    if (!latest) return;
    const client = latest;
    latest = null;
    try {
      await inner.persistClient(client);
    } catch {
      // a failed write only costs the offline copy
    }
  };

  onAppStateChange((state) => {
    if (state !== 'active') flush();
  });

  return {
    persistClient: (client) => {
      latest = client;
    },
    restoreClient: () => inner.restoreClient(),
    removeClient: async () => {
      // Signing out removes the copy; a snapshot taken before that must not bring it back.
      latest = null;
      await inner.removeClient();
    },
    flush,
  };
}
