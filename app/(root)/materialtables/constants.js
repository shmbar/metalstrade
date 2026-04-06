export const DEFAULT_ELEMENTS = [
    { key: 'ni', label: 'Ni' },
    { key: 'cr', label: 'Cr' },
    { key: 'cu', label: 'Cu' },
    { key: 'mo', label: 'Mo' },
    { key: 'w',  label: 'W'  },
    { key: 'co', label: 'Co' },
    { key: 'nb', label: 'Nb' },
    { key: 'fe', label: 'Fe' },
    { key: 'ti', label: 'Ti' },
]

export const UNIT_LABELS = { mt: 'MT', kgs: 'Kgs', lbs: 'Lbs' }

// How many MT is 1 unit of the selected weight unit
// Used to convert stored weight → MT for cost calculation
export const UNIT_TO_MT = { mt: 1, kgs: 0.001, lbs: 0.000453592 }
