import { db } from '../utils/firebase'
import {
  setDoc, doc, getDoc, collection, getDocs, query, where, deleteDoc, writeBatch, updateDoc,
  arrayUnion, arrayRemove, increment, or, and, deleteField, onSnapshot, orderBy, limit
} from "firebase/firestore";

import { getStorage, ref, uploadBytes, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import { getTtl } from './languages';
import { splitNotifId } from './splitUtils';

// Pure date / invoice-grouping helpers live in pureHelpers.js so they can be
// unit-tested without booting Firebase. We re-export them here for backward
// compatibility — every `import { resolveDueDate } from '../utils/utils'`
// across the app keeps working unchanged.
export { resolveDueDate, resolveInvoiceDate, groupInvoicesByNumber } from './pureHelpers';

const storage = getStorage();

export const getD = (array, value, item) => {
  const tmp = array.filter((x) => x.id === value[item]).length ?
    array.find((x) => x.id === value[item])[item] : ''
  return tmp;
}

export const validate = (value, fields) => {
  let errors = fields.map((x, i) => value[x] === '' || value[x] === null ? { [x]: true } : { [x]: false }).reduce((obj, item) => {
    return { ...obj, ...item };
  }, {});

  if (fields.includes('date')) {
    errors = value.dateRange.startDate === null ?
      { ...errors, date: true } : { ...errors, date: false }
  }

  return errors;
}

export const ErrDiv = ({ field, errors, ln }) => {
  return (
    <>
      {errors[field] &&
        <div className='text-xs text-red-600'>
          {getTtl('mustFilled', ln)}
        </div>
      }
    </>
  )
}

export const reOrderTableCon = (dt) => {
  const columnOrder = ['id', 'description', 'qnty', 'unitPrc']

  const reorderedData = dt.map((item) => {
    const reorderedItem = {};

    columnOrder.forEach((column, index) => {
      reorderedItem[column] = item[column];
    });

    return reorderedItem;
  });

  return reorderedData;
}

export const reOrderTableFinal = (dt) => {
  const columnOrder = ['id', 'descriptionText', 'remark', 'qnty', 'finalqnty', 'unitPrcFinal', 'finaltotal']

  const reorderedData = dt.map((item) => {
    const reorderedItem = {};

    columnOrder.forEach((column, index) => {
      reorderedItem[column] = item[column];
    });

    return reorderedItem;
  });

  return reorderedData;
}

export const reOrderTableInv = (dt) => {

  const columnOrder = ['id', 'po', 'description', 'container', 'qnty', 'unitPrc', 'total']
  const reorderedData = dt.map((item) => {
    const reorderedItem = {};
    columnOrder.forEach((column, index) => {
      reorderedItem[column] = item[column];
    });

    return reorderedItem;

  });

  return reorderedData;
}

export const groupedArrayInvoice = (arrD) => {

  const groupedArray1 = arrD.sort((a, b) => {
    return a.invoice - b.invoice;
  }).reduce((result, obj) => {

    const group = result.find((group) => group[0]?.invoice === obj.invoice);

    if (group) {
      group.push(obj);
    } else {
      result.push([obj]);
    }

    return result;
  }, []); // Initialize result as an empty array

  return groupedArray1;
};

export const sortArr = (arr, name) => {
  if (!Array.isArray(arr)) {
    console.error("sortArr: Expected an array, but received:", arr);
    return []; // Return an empty array if the input is not valid
  }

  return arr.sort((a, b) => {
    const A = a[name]?.toString()?.toLowerCase(); // Convert to lowercase for case-insensitive sorting
    const B = b[name]?.toString()?.toLowerCase();

    if (A < B) return -1;
    if (A > B) return 1;
    return 0;
  });
}

export const filteredArray = (arr) => {

  const groupedByInvoice = arr.reduce((acc, obj) => {
    const invoiceNumber = obj.invoice;

    if (!acc[invoiceNumber]) {
      acc[invoiceNumber] = [];
    }

    acc[invoiceNumber].push(obj);

    return acc;
  }, {});

  // Filter objects based on both constraints
  const filteredArray = Object.values(groupedByInvoice).flatMap((group) => {
    const distinctInvTypes = new Set(group.map((obj) => parseInt(obj.invType, 10)));

    if (distinctInvTypes.size === 1) {
      // All invType fields are equal, include all objects
      return group;
    } else {
      // Eliminate items with lower invType
      const maxInvType = Math.max(...distinctInvTypes);
      return group.filter((obj) => parseInt(obj.invType, 10) === maxInvType);
    }
  });


  return filteredArray;
}

////////////// Firebase Funtions////////////////////////////////////

export const saveDataSettings = async (uidCollection, doc1, obj) => {
  return await setDoc(doc(db, uidCollection, doc1), obj).then(() => {
    return true;
  });
}

export const loadDataSettings = async (uidCollection, doc1) => {
  const docSnap = await getDoc(doc(db, uidCollection, doc1));
  return docSnap.exists() ? docSnap.data() : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity log / event feed  (foundation for #9 activity log, #4/#5 notifications,
// #6 task comments). Append-only collection per account at
// {uidCollection}/data/activity/{id}. Writes are best-effort and must NEVER block
// or fail a user's save — callers fire-and-forget.
// ─────────────────────────────────────────────────────────────────────────────
const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const logEvent = async (uidCollection, evt = {}) => {
  if (!uidCollection) return null;
  try {
    const id = evt.id || newId();
    const now = new Date();
    const record = {
      id,
      type: evt.type || 'activity',        // e.g. 'contract.created', 'invoice.finalized'
      entityType: evt.entityType || '',     // 'contract' | 'invoice' | 'expense' | 'stock' | 'settings'
      entityId: evt.entityId || '',
      entityLabel: evt.entityLabel || '',    // human ref, e.g. 'PO 280426' / 'Invoice #12'
      action: evt.action || '',              // 'created' | 'updated' | 'finalized' | 'paid' | 'deleted'
      message: evt.message || '',
      actorUid: evt.actorUid || '',
      actorName: evt.actorName || 'Unknown',
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),            // numeric sort key (no string parsing on read)
      notify: !!evt.notify,                  // also surface in the notification center?
      audience: evt.audience || 'all',       // 'all' | [uid, ...]
      meta: evt.meta || {},                  // optional extras (fromValue/toValue, amount, currency)
    };
    await setDoc(doc(db, uidCollection, 'data', 'activity', id), record);
    // Notify-worthy events also land in the (mutable) notifications collection,
    // which carries per-user read state + snooze. Same id links the two.
    if (evt.notify) {
      await setDoc(doc(db, uidCollection, 'data', 'notifications', id), {
        ...record, severity: evt.severity || 'info', readBy: [], readReceipts: {}, snoozedBy: {},
      });
    }
    return record;
  } catch (e) {
    console.warn('logEvent failed (non-fatal):', e?.message || e);
    return null;
  }
}

// Reads the activity feed, newest-first. Sorted client-side to avoid requiring a
// Firestore composite index while the feature is young. Pass entityType+entityId
// for a per-record History view; omit for the global log.
export const loadActivity = async (uidCollection, { entityType, entityId, max = 200 } = {}) => {
  if (!uidCollection) return [];
  try {
    const snap = await getDocs(collection(db, uidCollection, 'data', 'activity'));
    let rows = snap.docs.map(d => d.data());
    if (entityType) rows = rows.filter(r => r.entityType === entityType);
    if (entityId) rows = rows.filter(r => r.entityId === entityId);
    rows.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    return rows.slice(0, max);
  } catch (e) {
    console.warn('loadActivity failed:', e?.message || e);
    return [];
  }
}

// Per-user read state + snooze for notifications (the mutable companion to the
// append-only activity feed). All best-effort — never throw to the caller.
// `readBy` stays for the fast unread check; `readReceipts` is the tracking history —
// a map of uid → { name, at } recording WHO read it and WHEN (first read wins via
// arrayUnion on readBy; the receipt timestamp is the moment they marked it).
export const markNotificationRead = async (uidCollection, id, uid, name) => {
  if (!uidCollection || !id || !uid) return;
  try {
    await updateDoc(doc(db, uidCollection, 'data', 'notifications', id), {
      readBy: arrayUnion(uid),
      [`readReceipts.${uid}`]: { name: name || 'Unknown', at: new Date().toISOString() },
    });
  } catch (e) { console.warn('markNotificationRead failed:', e?.message || e); }
}

export const markAllNotificationsRead = async (uidCollection, ids, uid, name) => {
  if (!uidCollection || !uid || !ids?.length) return;
  try {
    const at = new Date().toISOString();
    const batch = writeBatch(db);
    ids.forEach(id => batch.update(doc(db, uidCollection, 'data', 'notifications', id), {
      readBy: arrayUnion(uid),
      [`readReceipts.${uid}`]: { name: name || 'Unknown', at },
    }));
    await batch.commit();
  } catch (e) { console.warn('markAllNotificationsRead failed:', e?.message || e); }
}

export const snoozeNotification = async (uidCollection, id, uid, untilMs) => {
  if (!uidCollection || !id || !uid) return;
  try {
    await updateDoc(doc(db, uidCollection, 'data', 'notifications', id), { [`snoozedBy.${uid}`]: untilMs });
  } catch (e) { console.warn('snoozeNotification failed:', e?.message || e); }
}

// Live subscription for the notification center. Single-field orderBy needs no
// composite index. Returns an unsubscribe fn.
export const subscribeNotifications = (uidCollection, cb) => {
  if (!uidCollection) return () => {};
  try {
    const q = query(
      collection(db, uidCollection, 'data', 'notifications'),
      orderBy('createdAtMs', 'desc'),
      limit(100)
    );
    return onSnapshot(q,
      (snap) => cb(snap.docs.map(d => d.data())),
      (err) => { console.warn('subscribeNotifications error:', err?.message || err); cb([]); }
    );
  } catch (e) {
    console.warn('subscribeNotifications failed:', e?.message || e);
    return () => {};
  }
}

// Idempotent system/derived notification for time-derived alerts (e.g. overdue
// settlements) that a scan may re-detect on every load. Create-if-absent keeps a
// stable id from duplicating AND preserves the user's read/snooze state across scans.
export const ensureNotification = async (uidCollection, id, payload = {}) => {
  if (!uidCollection || !id) return;
  try {
    const ref = doc(db, uidCollection, 'data', 'notifications', id);
    const snap = await getDoc(ref);
    if (snap.exists()) return; // already raised — don't reset readBy/snoozedBy
    const now = new Date();
    await setDoc(ref, {
      id, createdAt: now.toISOString(), createdAtMs: now.getTime(),
      actorUid: 'system', actorName: 'System', audience: 'all',
      readBy: [], readReceipts: {}, snoozedBy: {}, severity: 'info', notify: true,
      ...payload,
    });
  } catch (e) { console.warn('ensureNotification failed:', e?.message || e); }
}

// Hard-delete a notification — used to clear a derived/standing alert once it's
// resolved (e.g. an IMS/GIS split that's been calculated). Best-effort; the
// append-only activity log entry (if any) is intentionally left intact.
export const deleteNotification = async (uidCollection, id) => {
  if (!uidCollection || !id) return;
  try { await deleteDoc(doc(db, uidCollection, 'data', 'notifications', id)); }
  catch (e) { console.warn('deleteNotification failed:', e?.message || e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMS/GIS expense split (#) — "put an invoice under control" workflow.
// A pending split raises a standing, idempotent notification (same stable id on the
// action AND the page-load rescan, so it never duplicates and keeps the user's
// read/snooze state). Calculating the split clears it.
// ─────────────────────────────────────────────────────────────────────────────
export const ensureSplitNotification = async (uidCollection, evt = {}) => {
  const { entityType = 'expense', entityId, entityLabel, amount, currency, actorUid, actorName } = evt;
  if (!uidCollection || !entityId) return;
  const noun = entityType === 'invoice' ? 'Invoice' : 'Expense';
  await ensureNotification(uidCollection, splitNotifId(entityType, entityId), {
    type: `${entityType}.splitPending`,
    entityType, entityId, entityLabel: entityLabel || '',
    action: 'splitPending', severity: 'warning', notify: true,
    actorUid: actorUid || 'system', actorName: actorName || 'System',
    message: `${entityLabel || noun} — awaiting IMS/GIS split`,
    meta: { amount: amount ?? null, currency: currency || '' },
  });
}

export const clearSplitNotification = async (uidCollection, entityType, entityId) => {
  if (!uidCollection || !entityId) return;
  await deleteNotification(uidCollection, splitNotifId(entityType, entityId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Task comments (#6) — chat threads attached to a record. Stored at
// {uidCollection}/data/comments/{id}. `entityKey` ('type:id') lets us subscribe
// with a single-field equality query (no composite index) and sort client-side.
// ─────────────────────────────────────────────────────────────────────────────
export const addComment = async (uidCollection, { entityType, entityId, text, authorUid, authorName } = {}) => {
  if (!uidCollection || !entityId || !text?.trim()) return null;
  try {
    const id = newId();
    const now = new Date();
    const rec = {
      id, entityType: entityType || '', entityId, entityKey: `${entityType || ''}:${entityId}`,
      text: text.trim(), authorUid: authorUid || '', authorName: authorName || 'Unknown',
      createdAt: now.toISOString(), createdAtMs: now.getTime(),
    };
    await setDoc(doc(db, uidCollection, 'data', 'comments', id), rec);
    return rec;
  } catch (e) { console.warn('addComment failed:', e?.message || e); return null; }
}

export const subscribeComments = (uidCollection, entityType, entityId, cb) => {
  if (!uidCollection || !entityId) return () => {};
  try {
    const q = query(
      collection(db, uidCollection, 'data', 'comments'),
      where('entityKey', '==', `${entityType || ''}:${entityId}`)
    );
    return onSnapshot(q,
      (snap) => cb(snap.docs.map(d => d.data()).sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))),
      (err) => { console.warn('subscribeComments error:', err?.message || err); cb([]); }
    );
  } catch (e) {
    console.warn('subscribeComments failed:', e?.message || e);
    return () => {};
  }
}

export const saveData = async (uidCollection, path, obj) => {

  let m;
  let y;
  if (!obj.final) {
    m = obj.dateRange.startDate.substring(5, 7)
    y = obj.dateRange.startDate.substring(0, 4)
  } else {
    m = obj.m
    y = obj.dateRange.slice(-4);
  }

  return await setDoc(doc(db, uidCollection, "data", path + '_' + y, obj.id), { ...obj, m: m }).then(() => {
    return true;
  });
}

export const loadData = async (uidCollection, path, dateSelect) => {
  const startYr = parseInt(dateSelect.start?.substring(0, 4));
  const endYr = parseInt(dateSelect.end?.substring(0, 4));
  if (!startYr || !endYr) return [];

  const years = [];
  for (let i = startYr; i <= endYr; i++) years.push(i);

  const snapshots = await Promise.all(years.map(yr =>
    getDocs(query(
      collection(db, uidCollection, 'data', path + '_' + yr),
      where('date', '>=', dateSelect.start),
      where('date', '<=', dateSelect.end)
    ))
  ));

  return snapshots.flatMap(snap =>
    snap.docs.filter(doc => !doc.empty).map(doc => doc.data())
  );
}

export const loadDataWeightAnalysis = async (uidCollection, path, dateSelect, entity, name) => {
  const startYr = parseInt(dateSelect.start?.substring(0, 4));
  const endYr = parseInt(dateSelect.end?.substring(0, 4));
  if (!startYr || !endYr) return [];

  const years = [];
  for (let i = startYr; i <= endYr; i++) years.push(i);

  const snapshots = await Promise.all(years.map(yr =>
    getDocs(query(
      collection(db, uidCollection, 'data', path + '_' + yr),
      where('date', '>=', dateSelect.start),
      where('date', '<=', dateSelect.end),
      where(entity, '==', name)
    ))
  ));

  return snapshots.flatMap(snap =>
    snap.docs.filter(doc => !doc.empty).map(doc => doc.data())
  );
}

export const delDoc = async (uidCollection, path, obj) => {

  try {
    const y = obj.date.substring(0, 4)
    return await deleteDoc(doc(db, uidCollection, 'data', path + '_' + y, obj.id)).then(() => {
      return true;
    });
  } catch (error) {
    console.error(error);
  }
}

export const loadInvoice = async (uidCollection, path, obj) => {

  const y = obj.date.substring(0, 4)

  const docSnap = await getDoc(doc(db, uidCollection, 'data', path + '_' + y, obj.id));
  return docSnap.exists() ? docSnap.data() : {};
}



// export const saveDataFinalCancel = async (uidCollection, path, obj) => {
//   const y = obj.dateRange.substring(obj.dateRange.length - 4, obj.dateRange.length)
//   return await setDoc(doc(db, uidCollection, "data", path + '_' + y, obj.id), obj).then(() => {
//     return true;
//   });
// }

export const updatePoSupplierInv = async (uidCollection, val, invcs) => {
  const batch = writeBatch(db);

  for (let i = 0; i < invcs.length; i++) {
    const y = invcs[i].date.substring(0, 4)
    let ref = doc(db, uidCollection, 'data', 'invoices_' + y, invcs[i].id);
    batch.update(ref, { poSupplier: { id: val.id, order: val.order, date: val.dateRange.startDate } });
  }

  await batch.commit();

}

export const updatePoSupplierExp = async (uidCollection, val, exps) => {
  const batch = writeBatch(db);

  for (let i = 0; i < exps.length; i++) {
    const y = exps[i].date.substring(0, 4)
    let ref = doc(db, uidCollection, 'data', 'expenses_' + y, exps[i].id);
    batch.update(ref, { poSupplier: { id: val.id, order: val.order, date: val.dateRange.startDate } });
  }

  await batch.commit();

}

// Stock docs keep a denormalized copy of the contract's materials list (`productsData`),
// and the stock/warehouse view resolves each row's name from that copy. So when a contract's
// material descriptions are edited, push the updated list onto the contract's stock docs —
// otherwise they keep showing the pre-edit description. Merge-set so a missing id can't fail
// the batch, and chunk to stay under Firestore's 500-write limit.
export const updateStockProductsData = async (uidCollection, stockIds, productsData) => {
  const ids = (Array.isArray(stockIds) ? stockIds : []).filter(Boolean);
  if (ids.length === 0 || !Array.isArray(productsData) || productsData.length === 0) return;

  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    ids.slice(i, i + 450).forEach(id =>
      batch.set(doc(db, uidCollection, 'data', 'stocks', id), { productsData }, { merge: true })
    );
    await batch.commit();
  }
}

export const updateExpenseInContracts = async (uidCollection, valalExp, poData) => {

  const y = poData.date.substring(0, 4)

  const Ref = doc(db, uidCollection, "data", 'contracts_' + y, poData.id);

  // Atomically add a new region to the "regions" array field.
  await updateDoc(Ref, {
    expenses: arrayUnion(valalExp)
  });
}

export const delExpenseInContracts = async (uidCollection, valalExp, poData) => {

  const y = poData.date.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", 'contracts_' + y, poData.id);

  await updateDoc(Ref, {
    expenses: arrayRemove(valalExp)
  });

}

export const updateDocument = async (uidCollection, path, field, poData, newFieldData) => {

  const y = poData.date.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", path + '_' + y, poData.id);

  // Set the "capital" field of the city 'DC'
  await updateDoc(Ref, { [field]: newFieldData });
}

export const delField = async (uidCollection, path, field, obj) => {

  const y = obj.date.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", path + '_' + y, obj.id);

  // Remove the 'capital' field from the document
  await updateDoc(Ref, {
    [field]: deleteField()
  });
}

export const setNewInvoiceNum = async (uidCollection) => {
  const Ref = doc(db, uidCollection, "invoiceNum");

  await updateDoc(Ref, {
    num: increment(1)
  });
}

export const getInvoices = async (uidCollection, path, arrTmp) => {

  let arr = []

  for (let i = 0; i < arrTmp.length; i++) {
    let obj = arrTmp[i]
  
    if (obj.arrInv.length) {
      const q = query(
        collection(db, uidCollection, 'data', path + '_' + obj.yr),
        where('invoice', "in", obj.arrInv)
      );
      const querySnapshot = await getDocs(q);

      let tmp = querySnapshot.docs.map((doc) => {
        doc.empty && console.log('No matching documents');
        return !doc.empty && doc.data();
      });
      arr = [...arr, ...tmp]
    }
  }
  return arr;
}

// Batched sibling of getInvoices: instead of one query per contract, take the UNION
// of every contract's referenced invoice numbers grouped by year and load them all
// at once. Firestore caps `in` at 30 values, so each year's number set is chunked
// into ≤30-value queries that run in parallel. Returns { [year]: invoiceData[] } so
// the caller can index by year+invoice number and hand each contract its own slice —
// turning N (one-per-contract) round-trips into ~(distinct invoices / 30) per year.
export const getInvoicesBatched = async (uidCollection, path, needByYear) => {
  const CHUNK = 30;
  const entries = [];
  for (const [yr, numbers] of Object.entries(needByYear || {})) {
    const uniq = [...new Set(numbers)].filter(n => n != null);
    for (let i = 0; i < uniq.length; i += CHUNK) {
      const chunk = uniq.slice(i, i + CHUNK);
      if (chunk.length) entries.push({ yr, chunk });
    }
  }

  const snaps = await Promise.all(entries.map(e =>
    getDocs(query(
      collection(db, uidCollection, 'data', path + '_' + e.yr),
      where('invoice', 'in', e.chunk)
    ))
  ));

  const byYear = {};
  snaps.forEach((snap, idx) => {
    const yr = entries[idx].yr;
    (byYear[yr] ||= []);
    snap.docs.forEach(d => { if (!d.empty) byYear[yr].push(d.data()); });
  });
  return byYear;
};

// Load every contract's invoices in ONE batched pass and return a
// year → invoiceNumber → docs[] index. Pair with contractInvoicesFromIndex() to
// hand each contract its own invoice set in memory — the drop-in replacement for
// the per-contract loadInvoices()/getInvoices() N+1 (dashboard, review pages).
export const buildInvoiceIndex = async (uidCollection, contracts) => {
  const needByYear = {};
  (contracts || []).forEach(con => (con.invoices || []).forEach(ref => {
    if (ref?.date && ref.invoice != null) (needByYear[ref.date.substring(0, 4)] ||= []).push(ref.invoice);
  }));
  const invByYear = await getInvoicesBatched(uidCollection, 'invoices', needByYear);
  const index = {};
  Object.entries(invByYear).forEach(([yr, docs]) => {
    const m = (index[yr] = {});
    docs.forEach(d => (m[d.invoice] ||= []).push(d));
  });
  return index;
};

// One contract's invoice docs pulled from a buildInvoiceIndex() result, in memory.
// grouped=true (default) returns groupedArrayInvoice() output; false returns the flat
// list. Identical to what the old per-contract query produced for that contract.
export const contractInvoicesFromIndex = (con, index, grouped = true) => {
  const refs = con?.invoices || [];
  const yrs = [...new Set(refs.map(x => x.date.substring(0, 4)))];
  const collected = [];
  yrs.forEach(yr => {
    const nums = [...new Set(refs.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))];
    nums.forEach(n => (index[yr]?.[n] || []).forEach(d => collected.push({ ...d })));
  });
  return grouped ? groupedArrayInvoice(collected) : collected;
};

// Batched sibling of loadInvoice(): given a list of { id, date } refs, load all the
// referenced docs in one chunked pass (≤30-id `in` queries per year) and return an
// { [id]: data } index. Drop-in for code that does loadInvoice() once per row (e.g.
// loading each invoice-group's contract). Missing ids simply have no entry — callers
// should fall back to {} exactly like loadInvoice does.
export const loadDocsByIdBatched = async (uidCollection, path, refs) => {
  const CHUNK = 30;
  const byYear = {};
  (refs || []).forEach(r => {
    if (r?.id && r?.date) (byYear[r.date.substring(0, 4)] ||= new Set()).add(r.id);
  });
  const entries = [];
  for (const [yr, ids] of Object.entries(byYear)) {
    const arr = [...ids];
    for (let i = 0; i < arr.length; i += CHUNK) {
      const chunk = arr.slice(i, i + CHUNK);
      if (chunk.length) entries.push({ yr, chunk });
    }
  }
  const snaps = await Promise.all(entries.map(e =>
    getDocs(query(
      collection(db, uidCollection, 'data', path + '_' + e.yr),
      where('id', 'in', e.chunk)
    ))
  ));
  const index = {};
  snaps.forEach(snap => snap.docs.forEach(d => { if (!d.empty) { const data = d.data(); index[data.id] = data; } }));
  return index;
};

export const getExpenses = async (uidCollection, path, arrTmp) => {

  let arr = []

  for (let i = 0; i < arrTmp.length; i++) {
    let obj = arrTmp[i]

    const q = query(
      collection(db, uidCollection, 'data', path + '_' + obj.yr),
      where('id', "in", obj.arrInv)
    );
    const querySnapshot = await getDocs(q);

    let tmp = querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    arr = [...arr, ...tmp]
  }
  return arr;
}


export const updatePnl = async (uidCollection, path, field, shipData) => {

  const y = shipData.date.startDate !== undefined ? shipData.date.startDate.substring(0, 4) :
    shipData.date.slice(-4)

  const Ref = doc(db, uidCollection, "data", path + '_' + y, shipData.id);

  //  delete shipData.id
  // delete shipData.date

  return await updateDoc(Ref, { [field]: shipData }).then(() => {
    return true;
  });
}

export const updateDocumentContract = async (uidCollection, path, field, poData, newFieldData) => {
  const y = poData.dateRange.startDate.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", path + '_' + y, poData.id);

  return await updateDoc(Ref, { [field]: newFieldData }).then(() => {
    return true;
  });
}

export const uploadFile = async (id, imageUplaod, setList) => {
  if (imageUplaod == null) return;

  const Ref = ref(storage, `${id}/${imageUplaod.name}`);

  return await uploadBytes(Ref, imageUplaod).then(async (snapshot) => {
    await getDownloadURL(snapshot.ref).then((url) => {
      setList((prev) => [...prev, { name: imageUplaod.name, url: url }])
    })
  })
}

export const getAllfiles = async (id) => {

  const Ref = ref(storage, `${id}/`);
  const response = await listAll(Ref);

  const urlArr = await Promise.all(response.items.map(async (x) => {
    const url = { name: x.name, url: await getDownloadURL(x) };
    return url;
  }));

  return urlArr;
}

export const deleteFile = async (id, name) => {

  const Ref = ref(storage, `${id}/${name}`);

  // Delete the file
  deleteObject(Ref).then(() => {
    // File deleted successfully
  }).catch((error) => {
    // Uh-oh, an error occurred!
  });
}

export const saveStockIn = async (uidCollection, stockArr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < stockArr.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'stocks', stockArr[i].id);
    batch.set(ref, stockArr[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

}

export const loadStockData = async (uidCollection, key, stockArr) => {
  const chunkSize = 30; // Firestore limit for "in" operator
  const chunks = [];

  // Split stockArr into chunks of 30
  for (let i = 0; i < stockArr.length; i += chunkSize) {
    chunks.push(stockArr.slice(i, i + chunkSize));
  }

  const allDocs = [];

  // Run a separate query for each chunk
  for (const chunk of chunks) {
    const q = query(
      collection(db, uidCollection, 'data', 'stocks'),
      where(key, 'in', chunk)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      allDocs.push(doc.data());
    });
  }

  if (allDocs.length === 0) {
    console.log('No matching documents');
  }

  return allDocs;
  /*
    const q = query(
      collection(db, uidCollection, 'data', 'stocks'), where(key, 'in', stockArr));
  
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    */
}

export const loadAllStockData = async (uidCollection) => {

  const querySnapshot = await getDocs(collection(db, uidCollection, 'data', 'stocks'));

  return querySnapshot.docs.map((doc) => {
    doc.empty && console.log('No matching documents');
    return !doc.empty && doc.data();
  });
}

export const loadStockDataPerDescription = async (uidCollection, stock, description) => {

  const q = query(
    collection(db, uidCollection, 'data', 'stocks'), and(where('stock', '==', stock),
      or(where('description', '==', description), where('descriptionId', '==', description))));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    doc.empty && console.log('No matching documents');
    return !doc.empty && doc.data();
  });
}


export const delStock = async (uidCollection, delArr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < delArr.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'stocks', delArr[i]);
    batch.delete(ref);
  }

  // Commit the batch
  await batch.commit();

}

export const loadExpensesForAccounting = async (uidCollection, expArr) => { //for accounting

  let yrs = [...new Set(expArr.map(x => x.date.substring(0, 4)))]

  let dataExp = [];

  for (let i = 0; i < yrs.length; i++) { //loop each year in the Expenses array

    //filter objecst with the same year
    let filteredExpArr = expArr.filter(x => x.date.substring(0, 4) === yrs[i])

    let idArr = filteredExpArr.map(x => x.id)

    const maxxArr = 30;

    for (let k = 0; k < idArr.length; k += maxxArr) {
      const idChunkArr = idArr.slice(k, k + maxxArr);

      const q = query(
        collection(db, uidCollection, 'data', 'expenses_' + yrs[i]), where('id', 'in', idChunkArr));

      const querySnapshot = await getDocs(q);

      let tmp = querySnapshot.docs.map((doc) => {
        return !doc.empty && doc.data();
      });
      dataExp = [...dataExp, ...tmp]
    }
  }

  return dataExp;
}

export const loadAdditionalCNFN = async (uidCollection, CNFN) => { //for accounting

  let yrs = [...new Set(CNFN.map(x => x.date.substring(0, 4)))]

  let dataCNFN = [];

  for (let i = 0; i < yrs.length; i++) { //loop each year in the CNFN array

    //filter objecst with the same year
    let filteredInvArr = CNFN.filter(x => x.date.substring(0, 4) === yrs[i])

    let idArr = filteredInvArr.map(x => x.id)

    const maxxArr = 30;

    for (let k = 0; k < idArr.length; k += maxxArr) {
      const idChunkArr = idArr.slice(k, k + maxxArr);

      const q = query(
        collection(db, uidCollection, 'data', 'invoices_' + yrs[i]), where('id', 'in', idChunkArr));

      const querySnapshot = await getDocs(q);

      let tmp = querySnapshot.docs.map((doc) => {
        return !doc.empty && doc.data();
      });
      dataCNFN = [...dataCNFN, ...tmp]
    }
  }

  return dataCNFN;

}

export const saveMargins = async (uidCollection, data, yr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < data.length; i++) {
    let ref = doc(db, uidCollection, 'margins', String(yr), data[i].month);
    batch.set(ref, data[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

}


export const loadMargins = async (uidCollection, yr) => {

  let arr = []

  // Query a reference to a subcollection
  const querySnapshot = await getDocs(collection(db, uidCollection, 'margins', String(yr)));
  querySnapshot.forEach((doc) => {
    arr.push(doc.data());
  });

  return arr;
}

// Loads margin months across EVERY year in a dateSelect range, not just the
// current year. Used by the chat assistant + dashboard so profit/margin-alert
// answers stay correct when the active date filter points at a prior year.
export const loadMarginsRange = async (uidCollection, dateSelect) => {
  const startYr = parseInt(dateSelect?.start?.substring(0, 4));
  const endYr = parseInt(dateSelect?.end?.substring(0, 4));
  if (!startYr || !endYr) {
    return loadMargins(uidCollection, new Date().getFullYear());
  }
  const years = [];
  for (let y = startYr; y <= endYr; y++) years.push(y);
  const perYear = await Promise.all(
    years.map(y => loadMargins(uidCollection, y).catch(() => []))
  );
  return perYear.flat();
}

////////////////////////////////////////
export const speciaInvoices = async (uidCollection, data) => {

  const batch = writeBatch(db);

  for (let i = 0; i < data.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'specialInvoices', data[i].id);
    // Merge (not overwrite) so the manual IMS category tag set on the Misc Invoices
    // page survives every time the source contract is re-saved and the row is re-derived.
    batch.set(ref, data[i], { merge: true });
  }

  return await batch.commit().then(() => {
    return true;
  });

}

// Update individual fields on a Misc Invoice (specialInvoices) doc — used for the
// manual category tag (Personal / Random / Shipments) without touching derived fields.
export const updateSpecialInvoiceField = async (uidCollection, id, fields) => {
  await setDoc(doc(db, uidCollection, 'data', 'specialInvoices', id), fields, { merge: true });
  return true;
};

// Keep Misc Invoices (`specialInvoices`) paidNotPaid in sync with the contract's
// poInvoices payments. Status is otherwise only written on full contract save,
// so payments recorded via the cashflow popup or the contract payments tab can
// leave Misc Invoices stuck on "Not Paid".
//
// Matching is canonical: specialInvoices doc id === stock item id, and the
// stock item holds the poInvoice UUID. The `invoice` field on specialInvoices
// is only a label snapshot and can drift if the user renames a Purchase Inv#,
// so we don't rely on it for matching — but we refresh it here so the page
// shows the current label.
export const syncSpecialInvoicesPaidStatus = async (uidCollection, contract) => {
  if (!contract?.order || !Array.isArray(contract?.poInvoices)) return;

  const snap = await getDocs(query(
    collection(db, uidCollection, 'data', 'specialInvoices'),
    where('order', '==', contract.order)
  ));
  if (snap.empty) return;

  const stockIds = Array.isArray(contract.stock) ? contract.stock : [];
  const stockItems = stockIds.length > 0 ? await loadStockData(uidCollection, 'id', stockIds) : [];
  const poInvoiceByStockId = new Map();
  for (const s of stockItems) {
    if (s?.id && s?.poInvoice) poInvoiceByStockId.set(s.id, s.poInvoice);
  }

  const batch = writeBatch(db);
  let hasUpdate = false;

  snap.docs.forEach(d => {
    const data = d.data();

    // Canonical match: doc id → stock.poInvoice → contract.poInvoices.id
    let p = null;
    const poInvId = poInvoiceByStockId.get(d.id);
    if (poInvId) p = contract.poInvoices.find(x => x.id === poInvId);
    // Fallback for older rows whose stock link is missing
    if (!p && data.invoice) p = contract.poInvoices.find(x => x.inv === data.invoice);
    if (!p) return;

    const invValue = parseFloat(p.invValue);
    const ratio = invValue > 0 ? parseFloat(p.pmnt) / invValue : 0;
    const paidNotPaid = ratio > 0.95 ? 'Paid' : 'Not Paid';

    const update = {};
    if (data.paidNotPaid !== paidNotPaid) update.paidNotPaid = paidNotPaid;
    if ((data.invoice ?? '') !== (p.inv ?? '')) update.invoice = p.inv ?? '';

    if (Object.keys(update).length > 0) {
      batch.update(d.ref, update);
      hasUpdate = true;
    }
  });

  if (hasUpdate) await batch.commit();
};

export const loadDataInvoices = async (uidCollection, path, dateSelect) => {

  let arr = []

  let startYr = dateSelect.start?.substring(0, 4)
  let endYr = dateSelect.end?.substring(0, 4)

  for (let i = startYr; i < endYr; i++) {
    const q = query(
      collection(db, uidCollection, 'data', path),
      where('date', '>=', dateSelect.start),
      where('date', '<=', dateSelect.end)
    );

    const querySnapshot = await getDocs(q);

    let tmp = querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    arr = [...arr, ...tmp]
  }

  return arr;
}

export const loadCompanyExpense = async (uidCollection, path, obj) => {

  const y = obj.date.substring(0, 4)

  const docSnap = await getDoc(doc(db, uidCollection, 'data', path, obj.id));
  return docSnap.exists() ? docSnap.data() : {};
}

export const loadCompanyExpenses = async (uidCollection, path, dateSelect) => {


  const q = query(
    collection(db, uidCollection, 'data', path),
    where('date', '>=', dateSelect.start),
    where('date', '<=', dateSelect.end)
  );

  const querySnapshot = await getDocs(q);

  let tmp = querySnapshot.docs.map((doc) => {
    doc.empty && console.log('No matching documents');
    return !doc.empty && doc.data();
  });

  return tmp;
}

export const saveCompanyExpense = async (uidCollection, obj) => {
  try {
    await setDoc(doc(db, uidCollection, "data", "companyExpenses", obj.id), obj);
    return true;
  } catch (error) {
    console.error("Error saving company expense:", error);
    return false;
  }
};

export const delCompExp = async (uidCollection, path, obj) => {

  try {
    //  const y = obj.date.substring(0, 4)
    return await deleteDoc(doc(db, uidCollection, 'data', path, obj.id)).then(() => {
      return true;
    });
  } catch (error) {
    console.error(error);
  }
}

export const saveMaterials = async (uidCollection, data) => {

  const batch = writeBatch(db);

  for (let i = 0; i < data.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'materialtables', data[i].id);
    batch.set(ref, data[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

};

export const loadMaterials = async (uidCollection) => {
  let arr = []
  const querySnapshot = await getDocs(collection(db, uidCollection, 'data', 'materialtables'));
  querySnapshot.forEach((doc) => {
    arr.push(doc.data());
  });

  return arr;
};


export const saveCashflow = async (uidCollection, yr, data) => {
  const ref = doc(db, uidCollection, "cashflow");
  await setDoc(ref, { [yr]: data }, { merge: true });
  return true;
}

export const saveCashflowFinanced = async (uidCollection, data) => {
  const ref = doc(db, uidCollection, "cashflow");
  await setDoc(ref, { financed: data }, { merge: true });
  return true;
}

export const updateClientPayment = async (uidCollection, inv) => {

  const y = inv.date.substring(0, 4)

  const Ref = doc(db, uidCollection, "data", 'invoices_' + y, inv.id);

  // Atomically add a new payment to the "payments" array field.
  return await updateDoc(Ref, inv).then(() => {
    return 'success'
  });

}


export const saveMultipleData = async (uidCollection, path, arr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < arr.length; i++) {
    const y = arr[i].date.substring(0, 4)
    let ref = doc(db, uidCollection, 'data', path + '_' + y, arr[i].id);
    batch.set(ref, arr[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

}

export const updateExpPayments = async (uidCollection, arr) => {
  const batch = writeBatch(db);

  for (let i = 0; i < arr.length; i++) {
    if (arr[i].poSupplier) { //normal expense
      const y = arr[i].date.substring(0, 4)
      let ref = doc(db, uidCollection, 'data', 'expenses_' + y, arr[i].id);
      batch.update(ref, { paid: '111' });
    } else { //company expense
      let ref = doc(db, uidCollection, 'data', 'companyExpenses', arr[i].id);
      batch.update(ref, { paid: '111' });
    }
  }

  return await batch.commit().then(() => {
    return true;
  });

}

export const loadAcntStatement = async (uidCollection, year, clientId, date1) => {

  const docSnap = await getDoc(doc(db, uidCollection, 'actStatements', year, clientId, date1, date1));
  return docSnap.exists() ? docSnap.data() : [];
}
export const updateExpenseField = async (
  uidCollection,
  expenseId,
  expenseDate,
  patch
) => {
  const year = expenseDate.substring(0, 4);
  const ref = doc(db, uidCollection, "data", "expenses_" + year, expenseId);
  await updateDoc(ref, patch);
};

// Company expenses live in a flat (non year-bucketed) `companyExpenses` collection,
// so patching one needs only the id — no date → year resolution.
export const updateCompanyExpenseField = async (uidCollection, id, patch) => {
  await updateDoc(doc(db, uidCollection, "data", "companyExpenses", id), patch);
};


export const updateInvoiceField = async (
  uidCollection,
  invoiceId,
  invoiceDate,
  patch
) => {
  const year = invoiceDate.substring(0, 4);
  const ref = doc(db, uidCollection, "data", "invoices_" + year, invoiceId);
  await updateDoc(ref, patch);
};

export const updateContractField = async (
  uidCollection,
  contractId,
  contractDate,
  patch
) => {
  const year = contractDate.substring(0, 4);
  const ref = doc(db, uidCollection, "data", "contracts_" + year, contractId);
  await updateDoc(ref, patch);
};

export const loadContract = async (uidCollection, orderNum) => {

  function extractYear(str) {
    if (!/^\d{4}-?\d{2}/.test(str)) return null;

    const yy = str[4] === "-"
      ? str.slice(5, 7)
      : str.slice(4, 6);

    return 2000 + Number(yy);
  }

  const year = extractYear(orderNum);

  const q = query(
    collection(db, uidCollection, "data", `contracts_${year}`),
    where("order", "==", orderNum)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("No matching documents");
    return [];
  }

  return querySnapshot.docs.map(doc => doc.data());
};

export const updateOpenMonth = async (uidCollection, month, year, open) => {

  await setDoc(
    doc(db,
      uidCollection,
      "margins",
      String(year),
      String(month)),
    { openMonth: open, month: String(month) },
    { merge: true }
  );

}


export const saveDatatoServer = async (uidCollection, path, obj) => {

  let m;
  let y;
  if (!obj.final) {
    m = obj.dateRange.startDate.substring(5, 7)
    y = obj.dateRange.startDate.substring(0, 4)
  } else {
    m = obj.m
    y = obj.dateRange.slice(-4);
  }

  return await setDoc(doc(db, uidCollection, "data", path + '_' + y, obj.id), { ...obj, m: m }).then(() => {
    return true;
  });
}