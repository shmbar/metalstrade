// Real fonts for the PDFs.
//
// Every generator called `doc.addFont('/fonts/Calibri.ttf', 'Poppins', 'normal')`
// and then `doc.setFont('Plus Jakarta Sans')`. Neither did anything: addFont only
// registers a file that is ALREADY in jsPDF's virtual filesystem, and nothing ever
// called addFileToVFS — so every document silently fell back to jsPDF's built-in
// Helvetica, and 'Plus Jakarta Sans' was never a registered name at all.
//
// Helvetica in jsPDF is cp1252, which has no ń, ł or ą. A Polish supplier address
// came out as "ul. Droga StarotoruDska 5, 87-100 ToruD" on documents sent to that
// supplier. This loads the font properly so those characters survive.
//
// Poppins is used because it is already in public/fonts, it carries the Latin
// Extended-A glyphs these addresses need, and it is openly licensed — Calibri,
// the other font sitting there, is Microsoft's and cannot be embedded in a PDF
// we distribute.
//
// The TTF is fetched at generation time rather than bundled as base64: the file is
// already served from /fonts, so this costs nothing in the page bundle, and the
// result is cached for the life of the tab.

import { fileToBase64 } from '@utils/utils';

// Two real files, registered under every name the generators already ask for.
// Aliases rather than a rename on purpose: the six modules contain some two
// hundred setFont calls between them, naming 'Plus Jakarta Sans', 'Poppins',
// 'PoppinsB', 'Cal' and 'CalB'. Rewriting all of them to one name would be a
// large, silent diff across every document we send out, and any call missed would
// fall back to Helvetica and reintroduce exactly the bug this fixes. Pointing the
// existing names at the real files makes every one of them correct at once.
const FILES = {
    regular: 'Poppins.ttf',
    bold: 'Poppins-bold.ttf',
};

const FACES = [
    { file: FILES.regular, name: 'Plus Jakarta Sans', weight: 'normal' },
    { file: FILES.regular, name: 'Poppins', weight: 'normal' },
    { file: FILES.regular, name: 'Cal', weight: 'normal' },
    { file: FILES.bold, name: 'PoppinsB', weight: 'bold' },
    { file: FILES.bold, name: 'CalB', weight: 'bold' },
];

let cache = null;

// Each file is fetched once, however many names point at it.
const loadFiles = async () => {
    if (cache) return cache;
    const names = [...new Set(Object.values(FILES))];
    const loaded = await Promise.all(names.map(async (file) => {
        const res = await fetch(`/fonts/${file}`);
        if (!res.ok) throw new Error(`${file}: ${res.status}`);
        return [file, await fileToBase64(await res.blob())];
    }));
    cache = Object.fromEntries(loaded);
    return cache;
};

// Registers the faces on `doc` and returns true when the document can be drawn in
// them. On failure it returns false rather than throwing: a PDF in the wrong font
// is a far better outcome than no PDF at all, and the caller falls back to the
// built-in font exactly as before.
export const registerPdfFonts = async (doc) => {
    try {
        const files = await loadFiles();
        for (const [file, base64] of Object.entries(files)) doc.addFileToVFS(file, base64);
        for (const f of FACES) doc.addFont(f.file, f.name, f.weight);
        return true;
    } catch (e) {
        cache = null;   // a failed load must not be cached as success
        console.warn('PDF fonts could not be loaded, falling back to the built-in font:', e?.message || e);
        return false;
    }
};

// A NEW generator should draw with 'Poppins' / 'PoppinsB'. The other names above
// exist only because the current six already use them.
