import { specBreakdown } from './grades.js';

/* Shared stock (SHARED_STOCK/data/stocks) as both workspaces read it.

   A shared lot is picked from one workspace's current stock, and it used to keep a COPY of
   that lot as it stood that day. When IMS then renamed the material in its Materials
   Breakdown, gave it a spec or moved it to another warehouse, the pool still showed the old
   name, no spec and the old warehouse — eight of the eleven Utica lots (client, 2026-10-06:
   "it doesn't sync description/grade fully with IMS when amended"). So what a shared lot IS
   is read from that lot each time the pool is read: the material, its spec, the warehouse,
   the supplier and the PO. What the two companies AGREED stays the shared lot's own: the
   quantity shared, the price and currency, the owners, who financed it, the shipment note.

   Pure — no Firebase — and copied byte for byte to mobile/src/shared/sharedStock.js. The
   loaders that feed it are loadSharedStockLive in utils/utils.js and mobile's
   data/firestore.ts. */

// What a shared lot takes from the lot it was picked from.
export const FOLLOWED = ['descriptionText', 'spec', 'stock', 'supplier', 'sourcePo'];

// The name a stock lot goes by on the Stocks page (stocks/page.js loadtStocks).
export const lotName = (lot) => (lot?.type === 'in' && lot.description
    ? lot.productsData?.find((p) => p.id === lot.description)?.description
    : lot?.descriptionText || lot?.descriptionName) || '';

// A lot's line: the lots of the same material in the same warehouse.
const lineOf = (lot, lots) => {
    const key = lot.description || lot.descriptionId;
    return (lots || []).filter((l) => l && (l.description || l.descriptionId) === key && l.stock === lot.stock);
};

// A line's spec as the Stocks page's Spec column reads it (stocks/specs.js specText).
export const lineSpec = (lineLots, name) => specBreakdown([{
    qnty: 1, value: 0, description: name,
    lots: (lineLots || []).filter((l) => l && l.type === 'in'),
}]).filter((p) => p.source !== 'name').map((p) => p.label).join(' · ');

// The source lots a loader must read, per workspace: { IMS: [ids], GIS: [ids] }.
export const sourceIds = (shared) => {
    const out = {};
    (shared || []).forEach((s) => {
        if (!s?.sourceId || !s.sourceAccount) return;
        const ids = (out[s.sourceAccount] ||= []);
        if (!ids.includes(s.sourceId)) ids.push(s.sourceId);
    });
    return out;
};

/* Each shared lot as its source has it now. `sources` — { IMS: lots[], GIS: lots[] }: the
   source lots and the lots on their lines, for each workspace that could be read. `link`:
     'live'  the source lot was found, and the followed fields are its own;
     'gone'  its workspace was read and the lot is not there any more — the shared lot
             keeps what it last had;
     ''      a lot typed in rather than picked, or a workspace that could not be read. */
export const followSources = (shared, sources) => (shared || []).map((s) => {
    const lots = s?.sourceId && s.sourceAccount ? sources?.[s.sourceAccount] : undefined;
    if (!lots) return { ...s, link: '' };
    const src = lots.find((l) => l && l.id === s.sourceId);
    if (!src) return { ...s, link: 'gone' };
    const name = lotName(src) || s.descriptionText || '';
    return {
        ...s,
        descriptionText: name,
        spec: lineSpec(lineOf(src, lots), name),
        stock: src.stock || s.stock,
        supplier: src.supplier || s.supplier,
        sourcePo: src.order || s.sourcePo,
        link: 'live',
    };
});

/* A warehouse or supplier id names an entry in ONE workspace's settings — the workspace the
   lot was picked from, or the one that shared it. Read in the other it named nothing: from
   GIS every IMS warehouse and supplier showed "—", so a search for "utica" found none of the
   eleven Utica lots. Looked up in the lot's own workspace first, then the reader's, then any.
   `settingsByWs` — { IMS: settings, GIS: settings }. */
export const sharedNames = (lot, settingsByWs, here) => {
    const order = [lot?.sourceAccount || lot?.sharedByAccount, here, ...Object.keys(settingsByWs || {})].filter(Boolean);
    const find = (list, id) => {
        if (!id) return null;
        for (const ws of order) {
            const hit = settingsByWs?.[ws]?.[list]?.[list]?.find((x) => x.id === id);
            if (hit) return hit;
        }
        return null;
    };
    const wh = find('Stocks', lot?.stock);
    const sup = find('Supplier', lot?.supplier);
    return {
        stockName: wh?.stock || wh?.nname || '—',
        stockShort: wh?.nname || wh?.stock || '—',
        supplierName: sup?.nname || '—',
    };
};
