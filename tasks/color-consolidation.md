# Color Scheme Consolidation Plan

## Goal
Replace all hardcoded blue hex values with CSS variables defined in `app/globals.css`.

## CSS Variables (already defined)
```css
:root {
  --endeavour: #0366ae;
  --rock-blue: #9fb8d4;
  --selago: #ebf2fc;
  --port-gore: #28264f;
  --bunting: #1c134d;
  --chathams-blue: #103a7a;
  --regent-gray: #838ca7;
}
```

## Mapping
| Hardcoded | Count | Files | → CSS Variable |
|-----------|-------|-------|----------------|
| `#005b9f` | 208 | 49 | `var(--endeavour)` |
| `#11497c` | 30 | 19 | `var(--chathams-blue)` |
| `#183d79` / `#1D3D79` | 151 | 31 | `var(--chathams-blue)` |
| `#28264f` | 12 | 3 | `var(--port-gore)` |

## Notes
- SVG files in `public/logo/` are SKIPPED (icon assets)
- `app/globals.css` variable definitions are SKIPPED (they define the variables)
- Only `.js`, `.jsx`, `.css` files are changed
- This is a purely cosmetic change — same colors, just referenced via variables
- Makes future theme changes trivial

## Phases
1. Replace `#005b9f` → `var(--endeavour)` in 49 files
2. Replace `#11497c` → `var(--chathams-blue)` in 19 files
3. Replace `#183d79` / `#1D3D79` → `var(--chathams-blue)` in 31 files
4. Replace `#28264f` → `var(--port-gore)` in 3 files
5. Verify + review
