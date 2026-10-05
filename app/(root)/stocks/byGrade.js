import { gradeKeyOf, gradeLabel, niRangeLabel } from './sumtables/gradeKey'

/* Lines vs grades.

   The table has always listed stock LINES, while the summary cards think in
   grades — so DMT's `Hast X`, `Hast X (47Ni 21Cr8Mo)` and `Hast X (47Ni 21Cr 8Mo)`
   read as three positions here and one there, and an export of this table could
   never be reconciled against the card beside it. By grade folds the rows on the
   same grade key the cards use, keeping every line as a subRow so nothing is lost.

   Grouping happens on the FORMATTED rows (names, not ids) because a grade can span
   suppliers and warehouses — a parent's supplier cell is the set of them.

   The table folds only the lines its search and column filters keep (newTable.js
   `group`), so a grade is always exactly the lines under it: "698 triart" is Triart's
   698, not every line of a grade that one Triart line is in (client, 2026-10-06).
   Pure and at module level, so the table can hold on to it across renders. */
export const groupByGrade = (rows) => {
  const groups = {};
  rows.forEach(row => {
    const name = row.descriptionName || '-';
    // Grouped by the material's own name (the fold in gradeKey.js). The separate grade
    // list that used to override it is retired — see sumtables/gradeTable.js.
    const { key: gKey, label: synth, ni } = gradeKeyOf(name);
    const key = `${gKey || name}|${row.cur || ''}`;
    if (!groups[key]) groups[key] = { key, synth, spellings: new Set(), niValues: [], lines: [] };
    groups[key].spellings.add(name);
    if (ni !== null) groups[key].niValues.push(ni);
    groups[key].lines.push(row);
  });

  // Trim: several supplier names are stored with a trailing space, which turned
  // a joined cell into "Shalex , Lobis".
  const uniq = (arr) => [...new Set(arr.map(v => typeof v === 'string' ? v.trim() : v)
    .filter(v => v !== undefined && v !== null && v !== ''))];
  const join = (arr) => arr.length <= 2 ? arr.join(', ') : `${arr[0]} +${arr.length - 1}`;

  return Object.values(groups).map(g => {
    const qnty = g.lines.reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);
    const total = g.lines.reduce((s, r) => s + (r.total === '-' ? 0 : parseFloat(r.total) || 0), 0);
    const base = gradeLabel(g.synth, [...g.spellings]);
    const span = g.synth ? niRangeLabel(g.niValues) : '';
    return {
      id: `grade:${g.key}`,
      order: join(uniq(g.lines.map(r => r.order))),
      date: '',
      supplier: join(uniq(g.lines.map(r => r.supplier))),
      originSupplier: join(uniq(g.lines.map(r => r.originSupplier))),
      stock: join(uniq(g.lines.map(r => r.stock))),
      descriptionName: span ? `${base} · ${span}` : base,
      qnty,
      qTypeTable: uniq(g.lines.map(r => r.qTypeTable))[0] || '',
      // Weighted, not the mean of the lines' own unit prices.
      unitPrc: qnty > 0 ? total / qnty : 0,
      total,
      sType: join(uniq(g.lines.map(r => r.sType))),
      cur: g.lines[0]?.cur,
      _lines: g.lines.length > 1 ? g.lines : undefined,
      // Every line, even for a single-line grade — the chemistry cell reads lots from here.
      _all: g.lines,
      _lotCount: g.lines.length,
      /* Every underlying line id, even for a single-line grade. A grade row's own
         id is synthetic ("grade:<key>") and exists nowhere in `data`, so anything
         that resolves the filtered rows back to raw lines — the Summary card, the
         Avg Cost per Grade card, the Excel export — has to expand through this.
         Without it, switching to By grade emptied all three. */
      _lineIds: g.lines.map(l => l.id),
    };
  }).sort((a, b) => b.total - a.total);
};
