import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadAcntStatement } from '@/data/firestore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface StatementPeriod {
  label: string;
  date1: string; // 'mid<Mon>' or full month name
}

// The 24 selectable periods for a year — mid-month (15th) and end-of-month, matching
// the web's date1 keys ('mid<Mon>' for the 15th, full month name for the last day).
export function periodsForYear(): StatementPeriod[] {
  const out: StatementPeriod[] = [];
  MONTHS_FULL.forEach((full, i) => {
    out.push({ label: `Mid ${MONTHS[i]}`, date1: `mid${MONTHS[i]}` });
    out.push({ label: `End ${MONTHS[i]}`, date1: full });
  });
  return out;
}

export interface StatementRow {
  invoice: string;
  date: string;
  amount: string | number;
  cur: string;
  due: string | number;
  paid: string | number;
  notPaid: string | number;
}

// web accstatement/page.js:29 — the column order the table iterates. Reshuffling it
// silently reorders the statement columns, so it is asserted, not assumed.
const FIELD_ORDER = ['invoice', 'date', 'amount', 'cur', 'due', 'paid', 'notPaid'];

/**
 * Raw statement docs → ordered rows, exactly like web page.js:131-134: the invoice
 * number is stringified first, then every field in FIELD_ORDER is projected with a
 * `?? ''` default so a missing column can never turn a total into NaN.
 */
export function normalizeStatementRows(raw: any[]): StatementRow[] {
  return (raw || []).map((z: any) => {
    const ordered: any = {};
    FIELD_ORDER.forEach((k) => (ordered[k] = k === 'invoice' ? String(z.invoice ?? '') : z[k] ?? ''));
    return ordered as StatementRow;
  });
}

export interface StatementCurTotal {
  amount: number;
  paid: number;
  notPaid: number;
}

/**
 * Per-currency totals — web setTtl via Numcur
 * (ContractsReview&Statement/funcs.js:115: `currentCur === cur ? 1 : 0`).
 *
 * The bucketing is an EQUALITY test against each id, never an else-branch: a row
 * whose currency is blank or some third id contributes to NEITHER bucket. Mobile
 * previously swept those into USD, inflating it by exactly their sum.
 *
 * Nothing is clamped — an overpaid invoice leaves a negative notPaid, as on web.
 */
export function statementTotals(
  rows: StatementRow[] | undefined
): { us: StatementCurTotal; eu: StatementCurTotal } {
  const mk = (): StatementCurTotal => ({ amount: 0, paid: 0, notPaid: 0 });
  const t = { us: mk(), eu: mk() };
  const n = (v: any) => {
    const f = parseFloat(v as any);
    return Number.isFinite(f) ? f : 0;
  };
  (rows || []).forEach((r) => {
    const cur = r.cur === 'us' ? 'us' : r.cur === 'eu' ? 'eu' : null;
    if (!cur) return;
    t[cur].amount += n(r.amount);
    t[cur].paid += n(r.paid);
    t[cur].notPaid += n(r.notPaid);
  });
  return t;
}

/**
 * dd.mm.yy — the mask web passes to dateFormat at page.js:289 and :306.
 *
 * Mobile slices the ISO string rather than going through Date. Web's dateFormat
 * parses 'YYYY-MM-DD' as UTC midnight and prints it in the BROWSER's timezone, so a
 * user west of Greenwich sees the previous day; slicing cannot shift. That
 * divergence is deliberate and is asserted in the parity suite.
 */
export function stmtDate(v: any): string {
  const [y, m, d] = String(v ?? '').slice(0, 10).split('-');
  return y && m && d ? `${d}.${m}.${y.slice(2)}` : '—';
}

/**
 * web page.js:268 — `x.row.original.cur === 'us' ? 'USD' : 'EUR'`. A hard ternary,
 * so a blank or unknown currency renders with a EURO sign, not the '$' the shared
 * curSymbol would fall back to. Intl also puts the minus OUTSIDE the symbol, which
 * shows up whenever an overpayment drives a figure negative.
 */
export function stmtMoney(v: number, cur?: string): string {
  const n = Number(v) || 0;
  const body = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}${cur === 'us' ? '$' : '€'}${body}`;
}

export function useAccStatement(clientId: string, year: string, date1: string) {
  const { uidCollection } = useAuth();
  return useQuery({
    enabled: !!uidCollection && !!clientId && !!year && !!date1,
    queryKey: ['acc-statement', uidCollection, clientId, year, date1],
    queryFn: async () => {
      const dt = await loadAcntStatement(uidCollection as string, year, clientId, date1);
      return normalizeStatementRows(dt?.data || []);
    },
  });
}
