'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalSearch } from '../../contexts/useGlobalSearchContext';

function normalize(s) {
  return (s ?? '').toString().trim().toLowerCase();
}

export default function GlobalSearchBar() {
  const router = useRouter();
  const { query, setQuery, items } = useGlobalSearch();
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return items
      .filter(x => normalize(x.searchText).includes(q))
      .slice(0, 10);
  }, [query, items]);

  const onPick = (item) => {
    setOpen(false);
    setQuery('');

    const params = new URLSearchParams();
    params.set('focus', item.rowId);

    if (item.source) params.set('source', item.source);

    router.push(`${item.route}?${params.toString()}`);
  };

  return (
    <div className="relative w-[280px] md:w-[360px]">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Search everything..."
        className="w-full border rounded-lg px-3 py-2 outline-none"
      />

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-[var(--surface-card)] shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.key}
              type="button"
              onMouseDown={() => clearTimeout(blurTimer.current)}
              onClick={() => onPick(r)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              <div className="responsiveTextTitle font-medium">{r.title}</div>
              {r.subtitle ? (
                <div className="responsiveTextInput text-gray-600">{r.subtitle}</div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
