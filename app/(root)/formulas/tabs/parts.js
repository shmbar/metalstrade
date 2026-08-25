'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   The Formulas tabs, in one shell.

   The client's standing complaint about this page — raised on calls and again on
   2026-08-21 — was that "the Cost box and the Sales box are unequal size". The
   boxes measured identically (819 × 465.5 at 1688px, both sides, every
   breakpoint), so the literal claim was wrong; what was unequal was everything
   INSIDE them:

     · SuperAlloys put a Cost group and a Sales group side by side with no
       headings at all, in `w-fit` result boxes — so those two really did size
       themselves to whatever number they happened to hold, and no two matched.
     · Both sides repeated an identical "Ni Cr Mo Fe" header twice, once over
       Composition and once over Price, in `w-fit` tables that left a third of
       each card empty. A half-empty box reads as the wrong size even when it
       isn't.
     · The Sales side had lost its two Argus % inputs in the 2026-08-08 redesign
       while the Sales price maths went on reading them, so the two sides no
       longer even held the same number of controls.

   The fix is structural rather than cosmetic: every tab builds its cards from
   the components below, both sides pass through the SAME code path, and the
   grid stretches them to one height. Two cards cannot drift apart when neither
   one has a layout of its own.
   ───────────────────────────────────────────────────────────────────────────── */

/* One column width for every element cell, on every tab. Sized to the widest
   value any of them can hold — a price like "$57,408.30" at --fs-input with
   tabular figures measures ~78px, so 104px clears it with room. Content-sized,
   never a share of the screen: a percentage column that stretches to 190px
   because the monitor is wide is the thing this app has always got wrong. */
const CELL = '104px';
const ROW_LABEL = '140px';

export const gridCols = (n) => ({ gridTemplateColumns: `${ROW_LABEL} repeat(${n}, ${CELL})` });

/* Title Case, not block capitals, and no letter tracking — the same call Zak
   made for every table header on 2026-08-25 (see the .custom-table th and
   .text-caption rules in globals.css). This page was still shouting COMPOSITION /
   SOLIDS PRICE / NI LME at the client while the rest of the app had stopped,
   and "NI" is not how nickel is written. --ink-secondary is the colour those
   headers now carry. */
export const labelCls = 'responsiveTextTable font-semibold text-[var(--ink-secondary)]';

/* A figure you type. Red, because the page's own legend has always said "fill in
   the red" and the client reads the page that way. */
export const inputCell =
    'w-full h-8 rounded-control bg-[var(--bg-card)] border border-[var(--line-strong)] text-center responsiveTextInput tabular-nums font-medium text-[var(--bad-text)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors';

/* A figure the page works out for you. Lavender, no border, not focusable. */
export const computedCell =
    'w-full h-8 rounded-control bg-[var(--brand-soft)] border border-transparent flex items-center justify-center responsiveTextInput tabular-nums font-medium text-[var(--brand-strong)]';


/* Money, with thousands separators. This was copy-pasted into all three tabs
   with three different guards; the one here also catches NaN, which the copies
   rendered straight through as "$NaN" whenever a field was still empty. */
export const fmt = (num, symbol = '$') => {
    if (num === null || num === undefined || num === '' || Number.isNaN(Number(num))) return symbol + '0';
    const [whole, dec] = String(num).split('.');
    return symbol + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '');
};

/* ── Card ───────────────────────────────────────────────────────────────────
   h-full so the grid can stretch a pair to one height, and ResultRow below
   carries mt-auto — so even if one side ever grows an extra control, the two
   rows of headline figures still land on the same line. */
export const FormulaCard = ({ title, subtitle, aside, children }) => (
    <section className="h-full flex flex-col bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card overflow-hidden">
        <header className="px-4 py-3 border-b border-[var(--line)] bg-[var(--bg-subtle)] flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
                <h3 className="responsiveTextTitle font-semibold text-[var(--ink)]">{title}</h3>
                <p className="responsiveText text-[var(--ink-muted)] mt-0.5">{subtitle}</p>
            </div>
            {aside}
        </header>
        <div className="p-4 flex flex-col gap-4 flex-1">{children}</div>
    </section>
);

/* ── Element table ──────────────────────────────────────────────────────────
   One table where there used to be two. Composition and Price each carried the
   same Ni/Cr/Mo/Fe header, stacked one above the other — the header was printed
   twice and the eye had to re-find the columns. The rows are labelled instead,
   and the label column carries the unit the row is in, which nothing on the
   page used to state anywhere. */
export const ElementTable = ({ columns, rows }) => (
    <div className="rounded-2xl border border-[var(--line)] overflow-hidden bg-[var(--bg-card)] overflow-x-auto">
        <div className="w-fit">
            <div className="grid bg-[var(--bg-subtle)] border-b border-[var(--line)]" style={gridCols(columns.length)}>
                <div className="bg-[var(--bg-subtle)]" aria-hidden="true" />
                {columns.map((c) => (
                    <div key={c} className={`py-1.5 text-center ${labelCls}`}>{c}</div>
                ))}
            </div>
            {rows.map((row, i) => (
                <div
                    key={row.label}
                    className={`grid items-stretch ${i ? 'border-t border-[var(--line)]' : ''}`}
                    style={gridCols(columns.length)}
                >
                    <div className="px-2.5 py-1 flex items-center justify-between gap-2 bg-[var(--bg-subtle)]">
                        <span className={labelCls}>{row.label}</span>
                        {row.unit && (
                            <span className="responsiveText text-[var(--ink-muted)] whitespace-nowrap">{row.unit}</span>
                        )}
                    </div>
                    {row.cells.map((cell, j) => (
                        <div key={j} className="p-1">{cell}</div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

/* ── Field ──────────────────────────────────────────────────────────────────
   A labelled control. `hint` sits on the label's own line — it is the per-pound
   readout the Sales side used to print under its Ni price and lost in the
   redesign, put back somewhere it costs no height. */
export const Field = ({ label, hint, children }) => (
    <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-1 mb-1.5">
            <span className={`${labelCls} truncate`}>{label}</span>
            {hint && (
                <span className="responsiveText text-[var(--ink-muted)] tabular-nums whitespace-nowrap">{hint}</span>
            )}
        </div>
        {children}
    </div>
);

export const ReadOnlyField = ({ value }) => (
    <div className="h-8 px-2.5 rounded-control bg-[var(--brand-soft)] border border-[var(--brand-border)] flex items-center justify-center responsiveTextInput tabular-nums font-medium text-[var(--brand-strong)]">
        {value}
    </div>
);

/* ── Results ────────────────────────────────────────────────────────────────
   The three numbers the whole page exists to produce. They used to render in
   the same 28px pill as every input on the screen, so nothing on the card said
   which figures were the answer. Label above, figure on the page rung. */
export const ResultTile = ({ label, value, note }) => (
    <div className="min-w-0 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-2">
        <div className="flex items-center justify-between gap-2 min-h-[var(--h-cell-control)]">
            <span className={`${labelCls} truncate`}>{label}</span>
            {note}
        </div>
        <p className="responsiveTextPage font-medium tabular-nums text-[var(--brand-strong)] mt-0.5 truncate">{value}</p>
    </div>
);

export const ResultRow = ({ tiles }) => (
    <div className="mt-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiles.map((t) => (
            <ResultTile key={t.label} label={t.label} value={t.value} note={t.note} />
        ))}
    </div>
);

/* The rate or percentage a tile's figure was worked out from, shown on the
   tile itself (Zak, 2026-08-25). Two shapes: an editable one — the turnings
   discount, which used to be a 0.92 buried in the source with nothing on
   screen saying so — and a plain readout for the EUR rate. Both sit on the
   label's line at the 24px in-cell height so the tile keeps its size. */
export const TileInput = (props) => (
    <input
        type="text"
        className="cell-control w-14 shrink-0 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-center responsiveTextTable tabular-nums font-medium text-[var(--bad-text)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] transition-colors"
        {...props}
    />
);

export const TileNote = ({ children }) => (
    <span className="shrink-0 responsiveTextTable tabular-nums text-[var(--ink-muted)] whitespace-nowrap">{children}</span>
);

/* ── Legend ─────────────────────────────────────────────────────────────────
   Replaces the two asterisked sentences that explained the colour coding in
   words ("* Fill in the red and + Formula x Ni"). Same information, shown in
   the colours it is about. */
export const Legend = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 responsiveText text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--bad-text)]" aria-hidden="true" />
            You fill in
        </span>
        <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--brand)]" aria-hidden="true" />
            Calculated (Fe is the balance)
        </span>
    </div>
);
