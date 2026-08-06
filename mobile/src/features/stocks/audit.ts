// Stock Audit — port of web app/(root)/stocks/stockAudit.js buildAudit.
// Reports: Leftovers (net > 0, writable off), duplicate OUT, over-shipped,
// orphan OUT, zero-qty IN.

const resolveDescName = (r: any): string => {
  const arr = Array.isArray(r?.productsData) ? r.productsData : [];
  if (r.type === 'in' && r.description) return arr.find((p: any) => p.id === r.description)?.description || '';
  if (r.mtrlStatus === 'select' || r.isSelection) return arr.find((p: any) => p.id === r.descriptionId)?.description || '';
  if (r.type === 'out' && r.moveType === 'out') return r.descriptionName || '';
  return r.descriptionText || r.descriptionName || '';
};

// Port of utils.js filteredArray: within one invoice number, if invTypes differ keep
// only the highest (a Credit/Final note supersedes the original invoice).
const filteredArray = <T extends { invoice?: any; invType?: any }>(arr: T[]): T[] => {
  const byInvoice: Record<string, T[]> = {};
  arr.forEach((obj) => {
    (byInvoice[String(obj.invoice)] ||= []).push(obj);
  });
  return Object.values(byInvoice).flatMap((group) => {
    const distinct = new Set(group.map((o) => parseInt(o.invType as any, 10)));
    if (distinct.size === 1) return group;
    const maxInvType = Math.max(...distinct);
    return group.filter((o) => parseInt(o.invType as any, 10) === maxInvType);
  });
};

export interface AuditRecord {
  id: string; type: string; stockId: string; stockNm: string; descId: string; descNm: string;
  qnty: number; unitPrc: number; cur: string; supplier: string; order: string; date: string; invoice: string;
}
export interface AuditGroup {
  stockId: string; stockNm: string; descId: string; names: string;
  inQty: number; outQty: number; inRows: number; outRows: number; net: number;
  rep?: { unitPrc: number; cur: string; supplierId: string; supplierNm: string; order: string };
  lastDate?: string;
}
export interface LeftoverGroup extends AuditGroup {
  value: number;
}

export function buildAudit(stockData: any[], settings: any) {
  const stockName = (id: string) => settings?.Stocks?.Stocks?.find((s: any) => s.id === id)?.nname || id || '(none)';
  const supplierName = (id: string) => settings?.Supplier?.Supplier?.find((s: any) => s.id === id)?.nname || '';

  // An invoice and its Credit/Final note BOTH write off the same lines by design, and
  // every stock reader keeps only the superseding doc per invoice number (filteredArray).
  // Apply the same rule here, or those by-design pairs read as "duplicates" and their
  // doubled outs as "over-shipped" — burying the real problems. Outs without an invoice
  // reference pass through untouched.
  const rows = (stockData || []).filter(Boolean);
  const isInvOut = (r: any) => r.type === 'out' && r.invoice !== undefined && r.invoice !== null && r.invoice !== '';
  const auditSource = [...rows.filter((r: any) => !isInvOut(r)), ...filteredArray(rows.filter(isInvOut))];

  const enriched = auditSource.map((r: any) => ({
    raw: r,
    id: r.id,
    type: r.type,
    stockId: r.stock,
    stockNm: stockName(r.stock),
    descId: r.description || r.descriptionId || '',
    descNm: resolveDescName(r),
    qnty: parseFloat(r.qnty) || 0,
    finalqnty: r.finalqnty != null ? parseFloat(r.finalqnty) : null,
    unitPrc: parseFloat(r.unitPrc) || 0,
    cur: r.cur || '',
    supplier: supplierName(r.supplier),
    order: r.order || '',
    date: r.contractData?.date || r.date || '',
    invoice: r.invoice || '',
  }));

  // 1. Duplicate OUT — same (stockId, descId, qnty, unitPrc) appearing 2+ times.
  const dupBuckets: Record<string, any[]> = {};
  enriched.filter((r) => r.type === 'out').forEach((r) => {
    const k = `${r.stockId}|${r.descId}|${r.qnty.toFixed(3)}|${r.unitPrc}`;
    (dupBuckets[k] ||= []).push(r);
  });
  const dupes = Object.values(dupBuckets).filter((g) => g.length > 1).flat()
    .sort((a, b) => (a.descNm || '').localeCompare(b.descNm || ''));

  // 2 + 3. Group by (stockId, descId): in vs out.
  const groupBuckets: Record<string, any> = {};
  enriched.forEach((r) => {
    const k = `${r.stockId}|${r.descId}`;
    if (!groupBuckets[k]) {
      groupBuckets[k] = {
        stockId: r.stockId, stockNm: r.stockNm, descId: r.descId,
        names: new Set<string>(), inQty: 0, outQty: 0, inRows: 0, outRows: 0,
      };
    }
    const g = groupBuckets[k];
    if (r.descNm) g.names.add(r.descNm);
    if (r.type === 'in') {
      const useQ = r.finalqnty != null && r.finalqnty !== r.qnty ? r.finalqnty : r.qnty;
      g.inQty += Math.abs(useQ);
      g.inRows += 1;
      // Representative in-row: supplies price/currency/supplier/PO for the leftover
      // valuation and any write-off row created from this group.
      if (!g.rep || (r.unitPrc > 0 && !g.rep.unitPrc)) {
        g.rep = {
          unitPrc: r.unitPrc, cur: r.raw?.cur || '', supplierId: r.raw?.supplier || '',
          supplierNm: r.supplier, order: r.order,
        };
      }
    } else {
      g.outQty += Math.abs(r.qnty);
      g.outRows += 1;
    }
    const d = String(r.date || '');
    if (d && (!g.lastDate || String(g.lastDate) < d)) g.lastDate = r.date;
  });
  const groupRows: AuditGroup[] = Object.values(groupBuckets).map((g: any) => ({
    ...g, names: [...g.names].join(' / '), net: +(g.inQty - g.outQty).toFixed(3),
  }));

  // Remaining balances: material still showing in stock (net IN − OUT > 0). Some of it
  // is real unsold inventory; the rest is history that was never written off (sold on
  // the cashflow side but the stock movement was never recorded).
  const left: LeftoverGroup[] = groupRows
    .filter((g) => g.net > 0.0005 && g.inRows > 0)
    .map((g) => ({ ...g, value: g.net * (g.rep?.unitPrc || 0) }))
    .sort((a, b) => b.value - a.value);

  const over = groupRows.filter((g) => g.outQty > g.inQty + 0.1 && g.outRows > 0 && g.inRows > 0)
    .sort((a, b) => (b.outQty - b.inQty) - (a.outQty - a.inQty));

  // Zero-qty outs are noise, not misdirected write-offs.
  const orphan = groupRows.filter((g) => g.inRows === 0 && g.outRows > 0 && g.outQty > 0.001)
    .sort((a, b) => b.outQty - a.outQty);

  const zeroIn = enriched.filter((r) => r.type === 'in' && r.qnty === 0 && r.unitPrc > 0)
    .sort((a, b) => b.unitPrc - a.unitPrc);

  return { left, dupes, over, orphan, zeroIn, total: enriched.length };
}

// Build the OUT movements a leftover write-off records — one per selected group,
// dated today, for the remaining quantity. Same ledger mechanics as a shipment, so
// every reader (stock tables, cashflow, shared-stock picker) nets the group to zero.
// Additive and reversible: deleting the OUT row restores the balance.
export function buildWriteOffRows(groups: LeftoverGroup[], newId: () => string) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date();
  // 'dd-mmm-yyyy' — the same stamp dateFormat produces on web.
  const today = `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  return groups.map((g) => ({
    id: newId(),
    type: 'out',
    writeOff: true,
    comment: 'Stock audit write-off (leftover cleanup)',
    stock: g.stockId,
    descriptionId: g.descId,
    descriptionText: g.names,
    descriptionName: g.names,
    qnty: g.net,
    unitPrc: g.rep?.unitPrc || 0,
    cur: g.rep?.cur || 'us',
    supplier: g.rep?.supplierId || '',
    invoice: '',
    date: today,
  }));
}

export const leftoverKey = (g: AuditGroup) => `${g.stockId}|${g.descId}`;
