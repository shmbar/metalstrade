// Lightweight types for the Firestore documents the read-path screens consume.
// The web app is untyped JS, so these describe the fields actually used here;
// `[key: string]: any` keeps us tolerant of the many other fields on each doc.

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface Product {
  id: string;
  description?: string;
  qnty?: string | number;
  unitPrc?: string | number;
  [key: string]: any;
}

export interface PoInvoice {
  id: string;
  inv?: string;
  pmnt?: string | number;
  invValue?: string | number;
  invRef?: string[];
  [key: string]: any;
}

export interface InvoiceRef {
  invoice: number;
  date: string;
  [key: string]: any;
}

export interface Contract {
  id: string;
  order?: string;
  date?: string;
  dateRange?: DateRange;
  supplier?: string; // supplier id
  cur?: string; // 'us' | 'eu'
  qTypeTable?: string;
  productsData?: Product[];
  poInvoices?: PoInvoice[];
  invoices?: InvoiceRef[];
  stock?: string[];
  conStatus?: string;
  euroToUSD?: number;
  remarks?: any[];
  comments?: string;
  // Enriched client-side: grouped invoice docs linked to this contract.
  invoicesData?: Invoice[][];
  [key: string]: any;
}

export interface Payment {
  pmnt?: string | number;
  date?: string;
  pmntDate?: string;
  [key: string]: any;
}

export interface InvoiceProduct {
  id: string;
  description?: string;
  descriptionId?: string;
  qnty?: string | number;
  unitPrc?: string | number;
  total?: string | number;
  container?: string;
  [key: string]: any;
}

export interface Invoice {
  id: string;
  invoice?: number;
  invType?: string;
  date?: string;
  dateRange?: DateRange;
  delDate?: DateRange | string;
  totalAmount?: string | number;
  debtBlnc?: string | number;
  balanceDue?: string | number;
  payments?: Payment[];
  productsDataInvoice?: InvoiceProduct[];
  cur?: any;
  client?: any;
  shpType?: string;
  pol?: string;
  pod?: string;
  final?: boolean;
  draft?: boolean;
  canceled?: boolean;
  comments?: string;
  poSupplier?: { id?: string; order?: string; date?: string };
  shipData?: { fnlzing?: string; rcvd?: string; status?: string; etd?: string; eta?: string; [key: string]: any };
  [key: string]: any;
}

export interface NamedEntity {
  id: string;
  nname?: string;
  supplier?: string;
  [key: string]: any;
}

export interface Settings {
  Supplier?: { Supplier?: NamedEntity[] };
  Client?: { Client?: NamedEntity[] };
  Quantity?: { Quantity?: { id: string; qTypeTable?: string }[] };
  [key: string]: any;
}

export interface CompanyData {
  eurUsdRate?: string | number;
  defaultTermDays?: string | number;
  lng?: string;
  [key: string]: any;
}

export interface DateSelect {
  start: string;
  end: string;
}
