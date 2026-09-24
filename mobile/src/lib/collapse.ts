import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Remembered open/closed state for a section.
 *
 * Client, 2026-09-16: "too much scrolling". Cashflow listed every row of all ten
 * sections at once, and the dashboard re-opened all four bands on every visit, so
 * reaching the figure you wanted meant scrolling past everything you did not. Sections
 * collapse to their heading and total — which is what the web app's accordions do — and
 * each screen remembers what YOU left open, per device.
 */
const KEY = (id: string) => `ims-open:${id}`;
const cache = new Map<string, boolean>();

export function useCollapsible(id: string, defaultOpen: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(() => cache.get(id) ?? defaultOpen);

  useEffect(() => {
    if (cache.has(id)) return;
    let live = true;
    AsyncStorage.getItem(KEY(id))
      .then((v) => {
        if (!live || v == null) return;
        const val = v === '1';
        cache.set(id, val);
        setOpen(val);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      cache.set(id, next);
      AsyncStorage.setItem(KEY(id), next ? '1' : '0').catch(() => {});
      return next;
    });
  }, [id]);

  return [open, toggle];
}
