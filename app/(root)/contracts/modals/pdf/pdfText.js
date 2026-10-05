/* What the screen shows is what prints.

   A browser collapses a run of spaces into one, so a description typed
   "30Ni  25Ti   Turnings" reads normally everywhere in the app — and a PDF draws every
   one of those spaces. Invoice 1480 went out with a different gap on each of its two
   lines (client, 2026-10-05: "why in pdf the words are having bigger space?"); 115 of
   603 IMS PO line descriptions carry doubled or stray spaces, so it was never one
   invoice. Runs of spaces, tabs and the look-alike Unicode spaces (a no-break space
   pasted in from a document) become one space, and each line's ends are trimmed. Line
   breaks are kept: a remark or an address is allowed its lines.

   Pure — no jsPDF, no React — so it is tested on its own (__tests__/pdfText.test.js).
   pdfFonts.js puts every drawn string through pdfText; each generator hands its table
   body to pdfRows, so a cell is MEASURED as it will be drawn (a centred cell measured
   with its extra spaces would sit off-centre once they are gone). */

const SPACES = /[ \t   -   　]+/g;

export const pdfText = (s) => (typeof s === 'string'
    ? s.split('\n').map((line) => line.replace(SPACES, ' ').trim()).join('\n')
    : s);

/* A table body, cell by cell. Rows are arrays of cells here; a sparse row (the totals rows
   leave their leading cells out) keeps its holes, and anything that is not a string — a
   number, an object cell — is passed through as it is. */
export const pdfRows = (rows) => (Array.isArray(rows)
    ? rows.map((row) => (Array.isArray(row) ? row.map(pdfText) : row))
    : rows);
