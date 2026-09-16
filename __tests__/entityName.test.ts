import { describe, expect, it } from 'vitest';
import { entityName } from '../mobile/src/lib/entityName';

// Cashflow → Stocks - Paid once listed "b6f14654-c111-4905-…" for the warehouse "Seagull":
// the phone's Settings copy had not loaded and the lookup fell back to the raw id.
const warehouses = [
  { id: 'b6f14654-c111-4905-9f00-000000000001', nname: 'Seagull', stock: 'Seagull Terminal' },
  { id: 'c1', stock: 'Full name only' },
  { id: 'c2' },
];

describe('entityName (web cashflow/funcs.js parity)', () => {
  it('prefers the short name, then the full name', () => {
    expect(entityName(warehouses, 'b6f14654-c111-4905-9f00-000000000001', 'warehouse')).toBe('Seagull');
    expect(entityName(warehouses, 'c1', 'warehouse')).toBe('Full name only');
    expect(entityName(warehouses, 'c2', 'warehouse')).toBe('Unnamed warehouse');
  });

  it('never shows a raw id', () => {
    const id = '85e17c20-e253-41aa-b000-000000000002';
    expect(entityName([], id, 'warehouse', false)).toBe('…');
    expect(entityName(undefined, id, 'warehouse', false)).toBe('…');
    expect(entityName([], id, 'warehouse', true)).toBe('Unknown warehouse · 85e17c20');
    expect(entityName(warehouses, '', 'warehouse')).toBe('No warehouse');
  });
});
