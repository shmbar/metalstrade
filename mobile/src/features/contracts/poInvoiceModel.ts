// Purchase-invoice (poInvoices) editing model — pure port of the web poInvModal
// handlers (app/(root)/contracts/modals/poInvModal.js).
//
// Mobile could only READ poInvoices: it had no way to add a purchase invoice, set
// its value, or build a payment schedule — Cashflow could blind-write pmnt/blnc but
// nothing could create the row in the first place.
//
// The invariants that must hold after every edit:
//   pmnt = Σ payments[].pmnt
//   blnc = round2(invValue − pmnt)
// and a payment carries BOTH an absolute amount and its percentage of invValue, so
// changing the invoice value rescales every payment by its stored percentage.

export interface PoPayment {
  pmntId: string;
  pmntDate: { startDate: string | null; endDate: string | null } | null;
  pmntPerc: any;
  pmnt: any;
}

export interface PoInvoice {
  id: string;
  inv: string;
  invValue: any;
  pmnt: any;
  blnc: any;
  invRef: any[];
  payments: PoPayment[];
  draft?: boolean;
}

export const removeNonNumeric = (n: any) => (n ?? '').toString().replace(/[^0-9.\-]/g, '');
export const countDecimalDigits = (v: any) => {
  const s = String(v ?? '');
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
};
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const sumPayments = (payments: PoPayment[]) =>
  payments.reduce((t, o) => t + (parseFloat(o.pmnt) || 0), 0);

export const blankPayment = (id: string): PoPayment => ({
  pmntId: id,
  pmntDate: null,
  pmntPerc: '',
  pmnt: '',
});

export const blankPoInvoice = (id: string, paymentId: string): PoInvoice => ({
  id,
  pmnt: '0',
  inv: '',
  invValue: '',
  invRef: [],
  blnc: '',
  payments: [blankPayment(paymentId)],
});

// Re-derive pmnt + blnc from the payment rows.
function settle(item: PoInvoice, payments: PoPayment[]): PoInvoice {
  const tmp = sumPayments(payments);
  return {
    ...item,
    payments,
    pmnt: tmp,
    blnc: round2((parseFloat(item.invValue) || 0) - tmp),
  };
}

// Invoice number is free text; the invoice VALUE rescales every payment by its
// stored percentage (web parity — the schedule is defined in percentages).
export function setInvoiceField(list: PoInvoice[], id: string, name: 'inv' | 'invValue', raw: string): PoInvoice[] {
  return list.map((item) => {
    if (item.id !== id) return item;
    if (name === 'inv') return { ...item, inv: raw };
    const newInvValue = removeNonNumeric(raw);
    const payments = item.payments.map((z) => ({
      ...z,
      pmnt: (newInvValue as any) * (z.pmntPerc as any) / 100,
    }));
    const tmp = sumPayments(payments);
    return {
      ...item,
      invValue: newInvValue,
      payments,
      pmnt: tmp,
      blnc: round2((newInvValue as any) - tmp),
    };
  });
}

// Editing a payment's PERCENTAGE derives its amount from invValue.
export function setPaymentPerc(list: PoInvoice[], id: string, pmntId: string, raw: string): PoInvoice[] {
  return list.map((item) => {
    if (item.id !== id) return item;
    const payments = item.payments.map((z) =>
      z.pmntId === pmntId ? { ...z, pmntPerc: raw, pmnt: ((parseFloat(item.invValue) || 0) * (raw as any)) / 100 } : z
    );
    return settle(item, payments);
  });
}

// Editing a payment's AMOUNT derives its percentage. Web rejects >2 decimals.
export function setPaymentAmount(list: PoInvoice[], id: string, pmntId: string, raw: string): PoInvoice[] | null {
  if (countDecimalDigits(raw) > 2) return null;
  return list.map((item) => {
    if (item.id !== id) return item;
    const clean = removeNonNumeric(raw);
    const invValue = parseFloat(item.invValue) || 0;
    const payments = item.payments.map((z) =>
      z.pmntId === pmntId
        ? {
            ...z,
            pmnt: clean,
            pmntPerc: invValue ? parseFloat((((clean as any) * 100) / invValue).toFixed(2)) : 0,
          }
        : z
    );
    return settle(item, payments);
  });
}

export function setPaymentDate(list: PoInvoice[], id: string, pmntId: string, iso: string): PoInvoice[] {
  return list.map((item) =>
    item.id === id
      ? {
          ...item,
          payments: item.payments.map((z) =>
            z.pmntId === pmntId ? { ...z, pmntDate: { startDate: iso, endDate: iso } } : z
          ),
        }
      : item
  );
}

export function addPayment(list: PoInvoice[], id: string, pmntId: string): PoInvoice[] {
  return list.map((item) => (item.id === id ? { ...item, payments: [...item.payments, blankPayment(pmntId)] } : item));
}

export function deletePayment(list: PoInvoice[], id: string, pmntId: string): PoInvoice[] {
  return list.map((item) => {
    if (item.id !== id) return item;
    return settle(item, item.payments.filter((z) => z.pmntId !== pmntId));
  });
}

export function addInvoice(list: PoInvoice[], id: string, paymentId: string): PoInvoice[] {
  return [...list, blankPoInvoice(id, paymentId)];
}

export function deleteInvoice(list: PoInvoice[], id: string): PoInvoice[] {
  return list.filter((x) => x.id !== id);
}

// Draft hides a purchase invoice from Cashflow (web: "Draft toggle to hide an
// invoice from Cashflow" — the cashflow payables reader skips inv.draft).
export function toggleDraft(list: PoInvoice[], id: string, value: boolean): PoInvoice[] {
  return list.map((x) => (x.id === id ? { ...x, draft: value } : x));
}
