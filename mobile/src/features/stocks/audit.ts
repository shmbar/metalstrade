// Stock Audit — port of web app/(root)/stocks/stockAudit.js buildAudit. Pure
// read-only integrity report: duplicate OUT, over-shipped, orphan OUT, zero-qty IN.

const resolveDescName = (r: any): string => {
  const arr = Array.isArray(r?.productsData) ? r.productsData : [];
  if (r.type === 'in' && r.description) return arr.find((p: any) => p.id === r.description)?.description || '';
  if (r.mtrlStatus === 'select' || r.isSelection) return arr.find((p: any) => p.id === r.descriptionId)?.description || '';
  if (r.type === 'out' && r.moveType === 'out') return r.descriptionName || '';
  return r.descriptionText || r.descriptionName || '';
};

export interface AuditRecord {
  id: string; type: string; stockNm: string; descId: string; descNm: string;
  qnty: number; unitPrc: number; cur: string; supplier: string; order: string; date: string; invoice: string;
}
export interface AuditGroup {
  stockId: string; stockNm: string; descId: string; names: string;
  inQty: number; outQty: number; inRows: number; outRows: number; net: number;
}

export function buildAudit(stockData: any[], settings: any) {
  const stockName = (id: string) => settings?.Stocks?.Stocks?.find((s: any) => s.id === id)?.nname || id || '(none)';
  const supplierName = (id: string) => settings?.Supplier?.Supplier?.find((s: any) => s.id === id)?.nname || '';

  const enriched: (AuditRecord & { finalqnty: number | null })[] = (stockData || []).filter(Boolean).map((r: any) => ({
    id: r.id,
    type: r.type,
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

  // 1. Duplicate OUT
  const dupBuckets: Record<string, AuditRecord[]> = {};
  enriched.filter((r) => r.type === 'out').forEach((r) => {
    const k = `${r.stockNm}|${r.descId}|${r.qnty.toFixed(3)}|${r.unitPrc}`;
    (dupBuckets[k] ||= []).push(r);
  });
  const dupes = Object.values(dupBuckets).filter((g) => g.length > 1).flat()
    .sort((a, b) => (a.descNm || '').localeCompare(b.descNm || ''));

  // 2 + 3. Group by (stock, descId): in vs out
  const groupBuckets: Record<string, any> = {};
  enriched.forEach((r) => {
    const k = `${r.stockNm}|${r.descId}`;
    if (!groupBuckets[k]) groupBuckets[k] = { stockId: r.stockNm, stockNm: r.stockNm, descId: r.descId, names: new Set<string>(), inQty: 0, outQty: 0, inRows: 0, outRows: 0 };
    const g = groupBuckets[k];
    if (r.descNm) g.names.add(r.descNm);
    if (r.type === 'in') {
      const useQ = r.finalqnty != null && r.finalqnty !== r.qnty ? r.finalqnty : r.qnty;
      g.inQty += Math.abs(useQ); g.inRows += 1;
    } else {
      g.outQty += Math.abs(r.qnty); g.outRows += 1;
    }
  });
  const groupRows: AuditGroup[] = Object.values(groupBuckets).map((g: any) => ({
    ...g, names: [...g.names].join(' / '), net: +(g.inQty - g.outQty).toFixed(3),
  }));

  const over = groupRows.filter((g) => g.outQty > g.inQty + 0.1 && g.outRows > 0 && g.inRows > 0)
    .sort((a, b) => (b.outQty - b.inQty) - (a.outQty - a.inQty));
  const orphan = groupRows.filter((g) => g.inRows === 0 && g.outRows > 0).sort((a, b) => b.outQty - a.outQty);
  const zeroIn = enriched.filter((r) => r.type === 'in' && r.qnty === 0 && r.unitPrc > 0).sort((a, b) => b.unitPrc - a.unitPrc);

  return { dupes, over, orphan, zeroIn, total: enriched.length };
}
