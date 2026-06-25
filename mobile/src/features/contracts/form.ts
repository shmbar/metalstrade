import { Contract } from '@/data/types';
import { SelectOption } from '@/components/ui/Select';

// Each contract field that is a settings-driven dropdown maps to a settings
// category. In the web app the option label is the property named exactly like
// the field key (Selector renders k[name]); we replicate that here.
export interface FieldConfig {
  key: keyof Contract | string;
  label: string;
  categoryKey: string; // settings[categoryKey][categoryKey]
  required?: boolean;
}

export const SELECT_FIELDS: FieldConfig[] = [
  { key: 'supplier', label: 'Supplier', categoryKey: 'Supplier', required: true },
  { key: 'cur', label: 'Currency', categoryKey: 'Currency', required: true },
  { key: 'shpType', label: 'Shipment', categoryKey: 'Shipment', required: true },
  { key: 'qTypeTable', label: 'Quantity Unit', categoryKey: 'Quantity' },
  { key: 'origin', label: 'Origin', categoryKey: 'Origin' },
  { key: 'delTerm', label: 'Delivery Terms', categoryKey: 'Delivery Terms' },
  { key: 'pol', label: 'POL', categoryKey: 'POL' },
  { key: 'pod', label: 'POD', categoryKey: 'POD' },
  { key: 'packing', label: 'Packing', categoryKey: 'Packing' },
  { key: 'contType', label: 'Container Type', categoryKey: 'Container Type' },
  { key: 'size', label: 'Size', categoryKey: 'Size' },
  { key: 'deltime', label: 'Delivery Time', categoryKey: 'Delivery Time' },
  { key: 'termPmnt', label: 'Payment Terms', categoryKey: 'Payment Terms' },
];

// Build picker options from a settings category. `fieldKey` selects the label
// property (web parity: the option object holds its label under the field's name).
export function optionsFor(settings: any, categoryKey: string, fieldKey: string): SelectOption[] {
  const arr = settings?.[categoryKey]?.[categoryKey] || [];
  return arr
    .filter((x: any) => !x.deleted)
    .map((x: any) => ({ value: x.id, label: String(x[fieldKey] ?? x.nname ?? '') }))
    .filter((o: SelectOption) => o.label);
}

// Blank contract — mirrors hooks/useContractsState.js newContract.
export function blankContract(): Contract {
  return {
    id: '',
    order: '',
    dateRange: { startDate: null, endDate: null },
    date: '',
    supplier: '',
    shpType: '',
    origin: '',
    delTerm: '',
    pol: '',
    pod: '',
    packing: '',
    contType: '',
    size: '',
    deltime: '',
    cur: '',
    qTypeTable: '',
    remarks: [],
    priceRemarks: [],
    invoices: [],
    expenses: [],
    productsData: [],
    termPmnt: '',
    conStatus: '',
    poInvoices: [],
    comments: '',
    stock: [],
  };
}

// Auto PO number — mirrors buildAutoOrder(): "ddmmyy-N-SUP". N is the next free
// sequence for today; SUP is the supplier code (added once a supplier is picked).
export function buildAutoOrder(contracts: Contract[], supplierName: string | null): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}`;
  const used = (contracts || [])
    .map((c) => c.order ?? '')
    .filter((o) => o.startsWith(datePart + '-'))
    .map((o) => parseInt(o.split('-')[1]))
    .filter((n) => !isNaN(n));
  const nextN = used.length > 0 ? Math.max(...used) + 1 : 1;
  const supCode = supplierName ? supplierName.substring(0, 3).toUpperCase() : '';
  return `${datePart}-${nextN}-${supCode}`;
}

// Required-field validation — same set the web save enforces.
export function validateContract(c: Contract): Record<string, boolean> {
  const errs: Record<string, boolean> = {};
  errs.supplier = !c.supplier;
  errs.cur = !c.cur;
  errs.order = !c.order;
  errs.shpType = !c.shpType;
  errs.date = !c.dateRange?.startDate;
  return errs;
}

export const hasErrors = (errs: Record<string, boolean>) => Object.values(errs).some(Boolean);
