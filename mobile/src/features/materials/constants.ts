// Verbatim from app/(root)/materialtables/constants.js — element set + unit labels.
export const DEFAULT_ELEMENTS = [
  { key: 'ni', label: 'Ni' },
  { key: 'cr', label: 'Cr' },
  { key: 'mo', label: 'Mo' },
  { key: 'co', label: 'Co' },
  { key: 'nb', label: 'Nb' },
  { key: 'w', label: 'W' },
  { key: 'cu', label: 'Cu' },
  { key: 'fe', label: 'Fe', autoCalc: true },
  { key: 'ti', label: 'Ti' },
] as const;

export const UNIT_LABELS: Record<string, string> = { mt: 'MT', kgs: 'Kgs', lbs: 'Lbs' };

// Multiply a stored weight by this to get metric tons (used by the cost columns).
export const UNIT_TO_MT: Record<string, number> = { mt: 1, kgs: 0.001, lbs: 0.000453592 };
