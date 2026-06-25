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

const FIELD_ORDER = ['invoice', 'date', 'amount', 'cur', 'due', 'paid', 'notPaid'];

export function useAccStatement(clientId: string, year: string, date1: string) {
  const { uidCollection } = useAuth();
  return useQuery({
    enabled: !!uidCollection && !!clientId && !!year && !!date1,
    queryKey: ['acc-statement', uidCollection, clientId, year, date1],
    queryFn: async () => {
      const dt = await loadAcntStatement(uidCollection as string, year, clientId, date1);
      const rows: StatementRow[] = (dt?.data || []).map((z: any) => {
        const ordered: any = {};
        FIELD_ORDER.forEach((k) => (ordered[k] = k === 'invoice' ? String(z.invoice ?? '') : z[k] ?? ''));
        return ordered as StatementRow;
      });
      return rows;
    },
  });
}
