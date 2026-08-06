// Avg cost price per grade — faithful port of web
// app/(root)/stocks/sumtables/gradeTable.js computeGradeSummary.
//
// Group stock rows by grade (descriptionName + currency), returning total quantity
// and the weighted average cost per MT for each grade, plus a per-supplier split so
// a row can expand to show who supplied how much.

export interface GradeSupplier {
  supplier: string;
  qnty: number;
  value: number;
}

export interface GradeRow {
  descriptionName: string;
  curId: string;
  totalQnty: number;
  totalValue: number;
  avgPrice: number;
  isoCode: 'EUR' | 'USD';
  suppliers: GradeSupplier[];
}

export function computeGradeSummary(dataTable: any[], settings: any): GradeRow[] {
  if (!dataTable || dataTable.length === 0) return [];

  const gCur = (id: string) => settings?.Currency?.Currency?.find((q: any) => q.id === id)?.cur || id;
  const supName = (id: string) =>
    settings?.Supplier?.Supplier?.find((q: any) => q.id === id)?.nname ||
    (id && id !== '-' ? String(id) : '(no supplier)');

  const groups: Record<string, any> = {};
  dataTable.forEach((row: any) => {
    const name = row.descriptionName || '-';
    const curId = row.cur || '';
    const key = `${name}|${curId}`;
    if (!groups[key]) {
      groups[key] = { descriptionName: name, curId, totalQnty: 0, totalValue: 0, bySupplier: {} };
    }
    const qty = parseFloat(row.qnty) || 0;
    const val = row.total === '-' ? 0 : parseFloat(row.total) || 0;
    groups[key].totalQnty += qty;
    groups[key].totalValue += val;
    const sup = supName(row.supplier);
    if (!groups[key].bySupplier[sup]) groups[key].bySupplier[sup] = { supplier: sup, qnty: 0, value: 0 };
    groups[key].bySupplier[sup].qnty += qty;
    groups[key].bySupplier[sup].value += val;
  });

  return Object.values(groups)
    .filter((r: any) => r.totalQnty > 0.1)
    .sort((a: any, b: any) => a.descriptionName.localeCompare(b.descriptionName))
    .map((r: any) => {
      const curCode = gCur(r.curId);
      const isoCode: 'EUR' | 'USD' = curCode?.toLowerCase() === 'eur' ? 'EUR' : 'USD';
      return {
        descriptionName: r.descriptionName,
        curId: r.curId,
        totalQnty: r.totalQnty,
        totalValue: r.totalValue,
        avgPrice: r.totalQnty > 0 ? r.totalValue / r.totalQnty : 0,
        isoCode,
        suppliers: (Object.values(r.bySupplier) as GradeSupplier[])
          .filter((s) => s.qnty > 0.0005)
          .sort((a, b) => b.value - a.value),
      };
    });
}
