// Verbatim from app/(root)/materialtables/constants.js — element set + unit labels.
export const DEFAULT_ELEMENTS = [
  { key: 'ni', label: 'Ni' },
  { key: 'cr', label: 'Cr' },
  { key: 'mo', label: 'Mo' },
  { key: 'co', label: 'Co' },
  { key: 'nb', label: 'Nb' },
  { key: 'w', label: 'W' },
  { key: 'cu', label: 'Cu' },
  { key: 'ti', label: 'Ti' },
  // Fe is LAST on purpose: it is the remainder (100 − the sum of everything else),
  // so it can only be read once the columns it depends on have been read. It used
  // to sit between Cu and Ti, which put the total before one of its own inputs.
  { key: 'fe', label: 'Fe', autoCalc: true },
] as const;

/**
 * Already-saved tables carry their OWN copy of the element list, made before Fe
 * moved, so the constant above is not enough — web re-orders every table it loads
 * (page.js:142-146 moveFeLast, applied at :175). Without this a saved table still
 * renders Fe in the middle on mobile while web shows it last, for the same data.
 */
export function moveFeLast<T extends { key: string }>(elements?: T[] | null): T[] {
  const list = (elements && elements.length ? elements : (DEFAULT_ELEMENTS as readonly any[])) as T[];
  const fe = list.find((e) => e.key === 'fe');
  return fe ? [...list.filter((e) => e.key !== 'fe'), fe] : list;
}

export const UNIT_LABELS: Record<string, string> = { mt: 'MT', kgs: 'Kgs', lbs: 'Lbs' };

// Multiply a stored weight by this to get metric tons (used by the cost columns).
export const UNIT_TO_MT: Record<string, number> = { mt: 1, kgs: 0.001, lbs: 0.000453592 };
