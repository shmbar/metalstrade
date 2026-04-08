// Fe is marked autoCalc: true — computed as 100 − sum(all other elements)
export const DEFAULT_ELEMENTS = [
    { key: 'ni', label: 'Ni' },
    { key: 'cr', label: 'Cr' },
    { key: 'mo', label: 'Mo' },
    { key: 'co', label: 'Co' },
    { key: 'nb', label: 'Nb' },
    { key: 'w',  label: 'W'  },
    { key: 'cu', label: 'Cu' },
    { key: 'fe', label: 'Fe', autoCalc: true },
    { key: 'ti', label: 'Ti' },
]

export const UNIT_LABELS = { mt: 'MT', kgs: 'Kgs', lbs: 'Lbs' }

// Multiply stored value by this to convert TO kgs
export const TO_KGS = { mt: 1000, kgs: 1, lbs: 0.453592 }

// Multiply stored kgs by this to convert FROM kgs
export const FROM_KGS = { mt: 0.001, kgs: 1, lbs: 2.20462 }

// Multiply stored value by this to get metric tons (for cost calculation)
export const UNIT_TO_MT = { mt: 1, kgs: 0.001, lbs: 0.000453592 }
