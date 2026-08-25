// Counterparty resolution for /api/ai/document-reader.
//
// A buyer-issued document — Oryx's "PURCHASE CONFIRMATION", where THEY bought and we
// sold — carries our own name in the addressee block. On a scrambled OCR text layer
// that block can land right under the document title, and the model then hands
// "IMS Metals & Alloys" back as the counterparty despite the PARTIES rule.
//
// So the model is asked only to TRANSCRIBE issuerName / addresseeName, and the choice
// of which one is the counterparty is made here, in code.

// Our own trading entities, under any spelling OCR produces
// ("IMS Metals & Alloys OÜ" scans as "IMS Metals & Alloys 00").
export function isOurCompany(name) {
    const n = String(name || '').toLowerCase();
    return /\b(ims|gis)\b/.test(n) && /(metal|stainless|alloy)/.test(n);
}

// Legal-form suffixes are the first thing OCR mangles ("BV" → "BY", "OÜ" → "00"),
// so they are dropped before comparing rather than matched on.
const SUFFIXES = /\b(bv|by|nv|gmbh|ag|kg|ltd|limited|inc|llc|llp|plc|oy|ou|ab|as|sa|srl|spa|co|corp|corporation|company|group|holding|holdings|international|trading)\b/g;

export function normalizeCompanyName(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(SUFFIXES, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Match a read name against the user's supplier/client list. Exact on the normalised
// form always; partial only once both sides carry enough signal to be distinctive, so
// a residue like "metals" can never pick a company out of the list.
export function matchEntity(name, list) {
    const target = normalizeCompanyName(name);
    if (target.length < 3) return null;

    const cands = (list || [])
        .map(e => ({ e, n: normalizeCompanyName(e.nname) }))
        .filter(x => x.n);

    const exact = cands.find(x => x.n === target);
    if (exact) return exact.e;

    if (target.length < 5) return null;
    const loose = cands.find(x => x.n.length >= 5
        && (x.n.startsWith(target) || target.startsWith(x.n) || x.n.includes(target) || target.includes(x.n)));
    return loose ? loose.e : null;
}

// Mutates `result` in place (it is the parsed model output the route is about to return).
// Returns the same object for convenience.
export function resolveCounterparty(result, { documentType, suppliers, clients }) {
    const isSupplierSide = documentType === 'contract' || documentType === 'expense';
    const nameKey = isSupplierSide ? 'supplierName' : 'clientName';
    const idKey = isSupplierSide ? 'supplierId' : 'clientId';
    const confKey = isSupplierSide ? 'supplier' : 'client';
    const known = isSupplierSide ? suppliers : clients;

    if (isOurCompany(result[nameKey])) {
        // Keep whichever of the two named parties is not us. If both are ours
        // (an IMS↔GIS document), there is no counterparty to offer.
        const other = [result.issuerName, result.addresseeName].find(n => n && !isOurCompany(n));
        const matched = other ? matchEntity(other, known) : null;
        result[nameKey] = other || null;
        result[idKey] = matched ? matched.id : null;
        result.confidence = { ...(result.confidence || {}), [confKey]: matched ? 'medium' : 'low' };
        result.selfPartyCorrected = true;
    } else if (result[nameKey] && !result[idKey]) {
        // The name read fine but the model didn't tie it to the list — usually an
        // OCR'd suffix ("Oryx Stainless BY"). Normalised matching recovers it.
        const matched = matchEntity(result[nameKey], known);
        if (matched) result[idKey] = matched.id;
    }

    return result;
}
