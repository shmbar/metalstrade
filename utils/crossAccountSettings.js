// Translating a contract's dropdown values between the IMS and GIS workspaces.
//
// Every dropdown on a contract — port of loading, packing, payment terms — stores a
// settings id rather than the text, and those ids are per workspace: the two
// accounts forked from one seed list, so the entries they both inherited share an
// id ('A4', 'P6') while anything added since carries a uuid that exists on one side
// only. "Copy to IMS/GIS" used to carry them across verbatim, so a copied contract
// arrived holding an id its new account cannot explain: the table printed the raw
// uuid where a port name belongs, and the PDF — which blanks whatever it cannot
// resolve — printed the field empty, including the payment-terms clause.
//
// Lives here rather than in the modal so it can be tested against the real settings
// documents: it decides what gets written into the OTHER account.

// contract field -> the settings section holding its options
export const COPIED_ID_FIELDS = {
    shpType: 'Shipment',
    origin: 'Origin',
    delTerm: 'Delivery Terms',
    pol: 'POL',
    pod: 'POD',
    packing: 'Packing',
    contType: 'Container Type',
    size: 'Size',
    deltime: 'Delivery Time',
    termPmnt: 'Payment Terms',
    qTypeTable: 'Quantity',
};

// A settings entry is { id, deleted, <one field naming it> } and that naming field
// differs per section ('pol', 'delTerm', …), so read it positionally.
export const entryKey = (entry) => Object.keys(entry || {}).find(k => k !== 'id' && k !== 'deleted');
export const entryLabel = (entry) => (entryKey(entry) ? entry[entryKey(entry)] : null);
export const normLabel = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Placeholders from the settings editor's "Add" button, never renamed. Copying one
// across would only spread the debris.
const JUNK = /^!?_?new /i;

// 'empty' is not a missing origin — the contract and invoice forms inject it
// themselves ({ id: 'empty', origin: '...Empty' }) to mean "deliberately blank", and
// the PDF checks for it by name before deciding whether to print an origin at all.
// It belongs in no settings list.
const SENTINELS = new Set(['empty']);

/**
 * Rewrite a contract's settings ids for the account it is being copied into.
 *
 * @param  con             the contract being copied
 * @param  sourceSettings  settings of the account it is copied FROM
 * @param  targetSettings  settings of the account it is copied INTO
 * @returns { values, additions }
 *          values    — fields to override on the copy (target's own id for the same label)
 *          additions — settings entries the target account is missing, by section
 */
export const translateIdFields = (con, sourceSettings, targetSettings) => {
    const values = {};
    const additions = {};

    for (const [field, section] of Object.entries(COPIED_ID_FIELDS)) {
        // Free-typed payment terms are the clause itself, not an id to look up.
        if (field === 'termPmnt' && con?.isTermPmntText) continue;

        const id = con?.[field];
        if (!id || typeof id !== 'string') continue;
        if (SENTINELS.has(id)) continue;

        const targetList = targetSettings?.[section]?.[section] || [];
        if (targetList.some(x => String(x?.id) === id)) continue;   // already means the same thing there

        const source = (sourceSettings?.[section]?.[section] || []).find(x => String(x?.id) === id);
        const label = entryLabel(source);
        // Nothing on this side explains the id either — an older copy's leftover, or
        // plain text somebody typed. Carry it across untouched rather than guess.
        if (!label || JUNK.test(label)) continue;

        const twin = targetList.find(x => normLabel(entryLabel(x)) === normLabel(label));
        if (twin) {
            values[field] = twin.id;
            continue;
        }

        // The target has no entry with this name. Give it one, keeping the id the
        // contract already carries, so both accounts converge on a single id for
        // that name and the next copy of the same value needs no repair at all.
        const pending = additions[section] || [];
        if (!pending.some(x => String(x.id) === id)) {
            additions[section] = [...pending, { id, [entryKey(source)]: label, deleted: false }];
        }
    }

    return { values, additions };
};
