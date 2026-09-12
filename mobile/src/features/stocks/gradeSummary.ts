// Avg cost price per grade — faithful port of web
// app/(root)/stocks/sumtables/gradeTable.js computeGradeSummary.
//
// Rows are folded to the GRADE they represent, not to the spelling typed on the PO
// line: a declared grade (the shared registry) wins, otherwise spellings that reduce
// to the same assay fold together and the row is labelled with its Ni span. Web made
// this change in three steps (2026-09-03 fold spellings, 2026-09-06 one breakdown per
// chevron, 2026-09-12 declared registry); mobile was still on the pre-fold version, so
// a 230 MT position that reads as one row on web read as twenty-one 9 MT rows here,
// ordered alphabetically instead of by money.
import { resolveGrade, GradeIndex } from '@shared/grades';
import { gradeKeyOf, niRangeLabel, gradeLabel } from '@shared/gradeKey';

/** One lot line behind a grade row: this description, from this supplier. */
export interface GradeLot {
  description: string;
  supplier: string;
  qnty: number;
  value: number;
  lots: any[];
}

export interface GradeRow {
  descriptionName: string;
  curId: string;
  totalQnty: number;
  totalValue: number;
  avgPrice: number;
  isoCode: 'EUR' | 'USD';
  /** true when the fold came from the declared registry rather than the assay key. */
  declared: boolean;
  /** every spelling folded into this row */
  spellings: string[];
  /** the 'in' lots behind the row, for the chemistry breakdown */
  inLots: any[];
  lots: GradeLot[];
}

export function computeGradeSummary(
  dataTable: any[],
  settings: any,
  gradeIndex: GradeIndex | null = null
): GradeRow[] {
  if (!dataTable || dataTable.length === 0) return [];

  const gCur = (id: string) => settings?.Currency?.Currency?.find((q: any) => q.id === id)?.cur || id;
  const supName = (id: string) =>
    settings?.Supplier?.Supplier?.find((q: any) => q.id === id)?.nname ||
    (id && id !== '-' ? String(id) : '(no supplier)');

  const groups: Record<string, any> = {};
  dataTable.forEach((row: any) => {
    const name = row.descriptionName || '-';
    const curId = row.cur || '';
    const inLots = (row.data || []).filter((l: any) => l && l.type === 'in');
    const declared = resolveGrade(gradeIndex, {
      description: name,
      lineId: inLots.find((l: any) => l.description)?.description,
    });
    const { key: gradeKey, label: synthLabel, ni } = gradeKeyOf(name);
    const key = declared ? `grade:${declared.id}|${curId}` : `${gradeKey || name}|${curId}`;
    if (!groups[key]) {
      groups[key] = {
        curId,
        grade: declared || null,
        synthLabel: declared ? null : synthLabel,
        totalQnty: 0,
        totalValue: 0,
        byLot: {} as Record<string, GradeLot>,
        spellings: new Set<string>(),
        niValues: [] as number[],
        inLots: [] as any[],
      };
    }
    const g = groups[key];
    const qty = parseFloat(row.qnty) || 0;
    const val = row.total === '-' ? 0 : parseFloat(row.total) || 0;
    g.totalQnty += qty;
    g.totalValue += val;
    g.spellings.add(name);
    if (ni !== null) g.niValues.push(ni);
    g.inLots.push(...inLots);

    /* One breakdown, not two. A row used to open on suppliers, and a folded one on
       spellings, so the same chevron meant different things depending on the row. A
       LOT (this description, from this supplier) carries both facts, so there is now
       a single list behind every chevron. */
    const supplier = supName(row.supplier);
    const lotKey = `${name}|${supplier}`;
    if (!g.byLot[lotKey]) g.byLot[lotKey] = { description: name, supplier, qnty: 0, value: 0, lots: [] };
    g.byLot[lotKey].qnty += qty;
    g.byLot[lotKey].value += val;
    g.byLot[lotKey].lots.push(...inLots);
  });

  return Object.values(groups)
    .filter((r: any) => r.totalQnty > 0.1)
    .map((r: any) => {
      const curCode = gCur(r.curId);
      const isoCode: 'EUR' | 'USD' = curCode?.toLowerCase() === 'eur' ? 'EUR' : 'USD';
      const base = r.grade ? r.grade.name : gradeLabel(r.synthLabel, [...r.spellings]);
      const span = r.synthLabel ? niRangeLabel(r.niValues) : '';
      return {
        ...r,
        spellings: [...r.spellings] as string[],
        declared: !!r.grade,
        // Keeps the name under the key the Excel sheet already writes.
        descriptionName: span ? `${base} · ${span}` : base,
        avgPrice: r.totalQnty > 0 ? r.totalValue / r.totalQnty : 0,
        isoCode,
        lots: (Object.values(r.byLot) as GradeLot[])
          .filter((l) => l.qnty > 0.0005)
          .sort((a, b) => b.value - a.value),
      };
    })
    /* Biggest position first. Alphabetical put an $857k line in the middle of 85
       rows; this table is read to find where the money is. */
    .sort((a: any, b: any) => b.totalValue - a.totalValue);
}
