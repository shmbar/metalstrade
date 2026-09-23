/**
 * WRITE SMOKE TEST — runs mobile's own write paths against a TEST workspace and reads
 * every result back from Firestore.
 *
 * WHAT IT COVERS (the parity pass of 2026-09-14): contract remarks / price basis /
 * original supplier and the PO PDF; cargo status + alert dismiss; Close balance and
 * its sync onto the stock lot; the duplicate-line trap; draft vs issued invoice stock
 * movements; invoice header fields; credit notes (number reuse + cnORfl); delete
 * guards and delete; comments + notification.
 *
 * SAFETY
 * - Skipped unless WRITE_SMOKE_EMAIL, WRITE_SMOKE_PASSWORD and WRITE_SMOKE_UID are all
 *   set. It never falls back to the IMS_TEST_* login the read-only smoke check uses.
 * - Refuses to write unless the signed-in account's uidCollection claim EQUALS
 *   WRITE_SMOKE_UID — you name the workspace you mean to write to.
 * - Everything it creates is tagged ZZTEST-<timestamp> and removed in afterAll; the
 *   invoice counter is put back.
 *
 * WHY IT LIVES UNDER mobile/
 * The repo root has firebase 10, mobile has firebase 12. From here 'firebase/*'
 * resolves to mobile's copy — the same SDK @/lib/firebase initialises — so signing in
 * on `auth` authenticates the `db` that writes.ts uses.
 *
 * RUN (PowerShell, from the repo root):
 *   $env:WRITE_SMOKE_EMAIL='…'; $env:WRITE_SMOKE_PASSWORD='…'; $env:WRITE_SMOKE_UID='…'
 *   npx vitest run --config vitest.smoke.config.js mobile/__tests__/smoke/writes.smoke.ts
 *   Remove-Item Env:WRITE_SMOKE_PASSWORD
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, collection, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  saveContract,
  updateContractField,
  closePoInvoiceBalance,
  saveStockIn,
  delStock,
  createInvoiceForContract,
  deleteInvoiceForContract,
  updateInvoiceDoc,
  nextInvoiceNumber,
  newId,
} from '@/data/writes';
import { addComment } from '@/features/comments/useComments';
import { loadStockRowsByLine } from '@/features/stocks/onHand';
import { duplicateLineTrap } from '@shared/stockGuards';
import { contractPoHtml } from '@/lib/pdfTemplates';

const EMAIL = process.env.WRITE_SMOKE_EMAIL;
const PASSWORD = process.env.WRITE_SMOKE_PASSWORD;
const EXPECT_UID = process.env.WRITE_SMOKE_UID;
const enabled = !!(EMAIL && PASSWORD && EXPECT_UID);

const TAG = `ZZTEST-${Date.now()}`;
const today = new Date().toISOString().slice(0, 10);
const YEAR = today.slice(0, 4);
const WH = 'zz-test-warehouse';

const L1 = newId(); // contract line that receives stock
const L2 = newId(); // sibling line with nothing under it
const P1 = newId(); // purchase invoice
const S1 = newId(); // stock-in lot
const IL1 = newId(); // draft invoice line
const IL2 = newId(); // issued invoice line
const IL3 = newId(); // credit note line

let uid = '';
let counterBefore = 0;
let counterCreated = false;
let bumps = 0;
let contractId = '';
let draft: any = null;
let issued: any = null;
let note: any = null;
const invoiceIds: string[] = [];

const conRef = () => doc(db, uid, 'data', `contracts_${YEAR}`, contractId);
const readContract = async (): Promise<any> => {
  const s = await getDoc(conRef());
  return s.exists() ? { id: s.id, ...s.data() } : null;
};
const readInv = async (id: string): Promise<any> => {
  const s = await getDoc(doc(db, uid, 'data', `invoices_${YEAR}`, id));
  return s.exists() ? s.data() : null;
};
const readLot = async (id: string): Promise<any> => {
  const s = await getDoc(doc(db, uid, 'data', 'stocks', id));
  return s.exists() ? s.data() : null;
};

const line = (id: string, descriptionId: string, qnty: number) => ({
  id,
  po: '',
  container: '',
  descriptionId,
  description: 'ZZ Ni plate',
  mtrlStatus: 'select',
  stock: WH,
  qnty,
  unitPrc: 1200,
  total: qnty * 1200,
});

const invoiceFor = (extra: Record<string, unknown>) =>
  ({
    id: '',
    invoice: undefined,
    date: today,
    dateRange: { startDate: today, endDate: today },
    delDate: { startDate: null, endDate: null },
    client: 'zz-test-client',
    cur: 'us',
    shpType: 'zz-test-shipment',
    invType: '1111',
    totalAmount: '',
    final: false,
    canceled: false,
    payments: [],
    expenses: [],
    comments: '',
    productsDataInvoice: [],
    ...extra,
  }) as any;

describe.skipIf(!enabled)('write smoke — test workspace only', () => {
  beforeAll(async () => {
    const cred = await signInWithEmailAndPassword(auth, EMAIL as string, PASSWORD as string);
    const token = await cred.user.getIdTokenResult();
    uid = String((token.claims as any).uidCollection || '');
    if (!uid || uid !== EXPECT_UID) {
      await signOut(auth);
      throw new Error(`Refusing to write: signed-in workspace "${uid}" is not WRITE_SMOKE_UID.`);
    }
    const counter = await getDoc(doc(db, uid, 'invoiceNum'));
    if (!counter.exists()) {
      await setDoc(doc(db, uid, 'invoiceNum'), { num: 0 });
      counterCreated = true;
    }
    counterBefore = (await nextInvoiceNumber(uid)) - 1;
    console.log(`\n  write smoke · workspace ${uid.slice(0, 7)}… · tag ${TAG} · invoice counter ${counterBefore}\n`);
  });

  afterAll(async () => {
    if (!uid) return;
    const tryDo = async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (e: any) {
        console.warn(`  cleanup: ${label} failed — ${e?.message || e}`);
      }
    };
    await tryDo('stock lots', () => delStock(uid, [S1, IL1, IL2, IL3]));
    for (const id of invoiceIds) await tryDo(`invoice ${id}`, () => deleteDoc(doc(db, uid, 'data', `invoices_${YEAR}`, id)));
    if (contractId) {
      await tryDo('contract', () => deleteDoc(conRef()));
      for (const coll of ['comments', 'activity', 'notifications']) {
        await tryDo(coll, async () => {
          const snap = await getDocs(query(collection(db, uid, 'data', coll), where('entityId', '==', contractId)));
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        });
      }
    }
    await tryDo('invoice counter', async () => {
      if (counterCreated) return deleteDoc(doc(db, uid, 'invoiceNum'));
      const now = (await nextInvoiceNumber(uid)) - 1;
      if (now === counterBefore + bumps) await updateDoc(doc(db, uid, 'invoiceNum'), { num: counterBefore });
      else console.warn(`  cleanup: counter is ${now}, expected ${counterBefore + bumps} — left as is`);
    });
    await signOut(auth);
    console.log(`  write smoke · cleaned up ${TAG}\n`);
  });

  it('saves original supplier, price basis and remarks, and the PO prints them', async () => {
    const { contract } = await saveContract(
      uid,
      {
        id: '',
        order: TAG,
        date: today,
        dateRange: { startDate: today, endDate: today },
        supplier: 'zz-test-supplier',
        originSupplier: 'zz-test-mill',
        cur: 'us',
        qTypeTable: '',
        productsData: [
          { id: L1, description: 'ZZ Ni plate', qnty: 10, unitPrc: 1000, contentPrc: 'Ni 99% at LME' },
          { id: L2, description: 'ZZ Ni plate (second line)', qnty: 5, unitPrc: 1000 },
        ],
        remarks: [{ id: newId(), rmrk: 'Free-text remark', isRmrkText: true }],
        priceRemarks: [{ id: newId(), rmrk: 'Ni paid at LME cash settlement' }],
        priceMode: 'content',
        poInvoices: [{ id: P1, inv: 'ZZ-PI-1', invValue: 5000, pmnt: 2000, blnc: 3000, cur: 'us' }],
        invoices: [],
        expenses: [],
        stock: [],
        termPmnt: '',
        conStatus: '',
      } as any,
      undefined
    );
    contractId = contract.id;

    const saved = await readContract();
    expect(saved.originSupplier).toBe('zz-test-mill');
    expect(saved.priceMode).toBe('content');
    expect(saved.remarks[0]).toMatchObject({ rmrk: 'Free-text remark', isRmrkText: true });
    expect(saved.priceRemarks[0].rmrk).toBe('Ni paid at LME cash settlement');

    const html = contractPoHtml(saved, { currency: 'us', supplierName: 'ZZ supplier', totalMT: 15 }, {}, {});
    expect(html).toContain('Price per content');
    expect(html).toContain('Ni 99% at LME');
    expect(html).toContain('See below*');
    expect(html).toContain('Ni paid at LME cash settlement');
    expect(html).toContain('Free-text remark');
    expect(html).not.toContain('<span>Total</span>');
  });

  it('saves cargo status and dismisses the delayed-response alert', async () => {
    await updateContractField(uid, contractId, today, { cargoStatus: 'RDY', alert: false });
    const c = await readContract();
    expect(c.cargoStatus).toBe('RDY');
    expect(c.alert).toBe(false);
  });

  it('Close balance books the residual as an adjustment and syncs the stock lot', async () => {
    await saveStockIn(uid, [
      {
        id: S1,
        type: 'in',
        description: L1,
        descriptionId: L1,
        qnty: 10,
        unitPrc: 1000,
        stock: WH,
        order: TAG,
        cur: 'us',
        date: today,
        poInvoice: P1,
        poInvoices: [],
        contractData: { id: contractId, date: today },
      },
    ]);
    await updateContractField(uid, contractId, today, { stock: [S1] });

    await closePoInvoiceBalance(uid, { contractId, contractDate: today, poInvoiceId: P1 });

    const pi = (await readContract()).poInvoices[0];
    expect(pi.blnc).toBe(0);
    expect(pi.pmnt).toBe(5000);
    expect(pi.payments).toHaveLength(2);
    expect(pi.payments[0].pmnt).toBe(2000);
    expect(pi.payments[1]).toMatchObject({ pmnt: 3000, adjustment: 'closeBalance' });

    const lot = await readLot(S1);
    expect(lot.poInvoices[0].blnc).toBe(0);
  });

  it('duplicate-line trap blocks the empty sibling line and allows the stocked one', async () => {
    const contract = await readContract();
    const loader = (ids: string[]) => loadStockRowsByLine(uid, ids);

    const onEmpty = await duplicateLineTrap({ productsDataInvoice: [{ descriptionId: L2, qnty: 3, stock: WH }] }, contract, loader);
    expect(onEmpty).toMatch(/has nothing in stock/);

    const onStocked = await duplicateLineTrap({ productsDataInvoice: [{ descriptionId: L1, qnty: 3, stock: WH }] }, contract, loader);
    expect(onStocked).toBeNull();

    const asDraft = await duplicateLineTrap(
      { draft: true, productsDataInvoice: [{ descriptionId: L2, qnty: 3, stock: WH }] },
      contract,
      loader
    );
    expect(asDraft).toBeNull();
  });

  it('a draft invoice takes a number but books no stock movement', async () => {
    draft = await createInvoiceForContract(uid, await readContract(), invoiceFor({ draft: true, productsDataInvoice: [line(IL1, L1, 2)] }), 'ZZ Test Client');
    invoiceIds.push(draft.id);
    bumps += 1;

    expect(draft.invoice).toBe(counterBefore + 1);
    expect((await readInv(draft.id)).draft).toBe(true);
    expect(await readLot(IL1)).toBeNull();
    expect((await readContract()).invoices).toContainEqual(expect.objectContaining({ id: draft.id, invType: '1111' }));
  });

  it('an issued invoice books a stock-out and keeps its header fields', async () => {
    issued = await createInvoiceForContract(
      uid,
      await readContract(),
      invoiceFor({
        productsDataInvoice: [line(IL2, L1, 3)],
        origin: 'zz-origin',
        delTerm: 'zz-terms',
        pol: 'zz-pol',
        pod: 'zz-pod',
        bankNname: 'zz-bank',
        hs1: 'zz-hs',
        clientContractNo: 'ZZ-CC-1',
        ttlGross: '3100',
        ttlPackages: '4',
        completed: true,
      }),
      'ZZ Test Client'
    );
    invoiceIds.push(issued.id);
    bumps += 1;

    expect(issued.invoice).toBe(counterBefore + 2);
    const lot = await readLot(IL2);
    expect(lot).toMatchObject({ type: 'out', invoice: issued.invoice, invType: '1111', stock: WH });

    // Edit invoice saves the header through a patch.
    await updateInvoiceDoc(uid, issued.id, YEAR, { packing: 'zz-packing', comments: 'edited by smoke test' });
    expect(await readInv(issued.id)).toMatchObject({
      origin: 'zz-origin',
      delTerm: 'zz-terms',
      bankNname: 'zz-bank',
      hs1: 'zz-hs',
      clientContractNo: 'ZZ-CC-1',
      ttlGross: '3100',
      completed: true,
      packing: 'zz-packing',
      comments: 'edited by smoke test',
    });
  });

  it('a credit note reuses the original number, takes no new one, and links back', async () => {
    note = await createInvoiceForContract(
      uid,
      await readContract(),
      invoiceFor({
        invType: '2222',
        invoice: issued.invoice,
        originalInvoice: { id: issued.id, date: today },
        productsDataInvoice: [line(IL3, L1, 3)],
      }),
      'ZZ Test Client'
    );
    invoiceIds.push(note.id);

    expect(note.invoice).toBe(issued.invoice);
    expect(note.invType).toBe('2222');
    expect(await nextInvoiceNumber(uid)).toBe(counterBefore + 3);
    expect((await readInv(issued.id)).cnORfl).toEqual({ id: note.id, date: today });
    expect((await readContract()).invoices).toContainEqual(expect.objectContaining({ id: note.id, invType: '2222', invoice: issued.invoice }));
  });

  it('delete refuses an invoice that still carries materials', async () => {
    await expect(deleteInvoiceForContract(uid, note.id, YEAR)).rejects.toThrow(/contains materials/);
    expect(await readInv(note.id)).not.toBeNull();
  });

  it('delete removes an emptied note and clears the original link', async () => {
    await updateInvoiceDoc(uid, note.id, YEAR, { productsDataInvoice: [] });
    await delStock(uid, [IL3]);

    await deleteInvoiceForContract(uid, note.id, YEAR);

    expect(await readInv(note.id)).toBeNull();
    expect((await readInv(issued.id)).cnORfl).toBeUndefined();
    expect((await readContract()).invoices.some((x: any) => x.id === note.id)).toBe(false);
    invoiceIds.splice(invoiceIds.indexOf(note.id), 1);
  });

  it('delete refuses an invoice named by a purchase invoice', async () => {
    const c = await readContract();
    await updateContractField(uid, contractId, today, {
      poInvoices: c.poInvoices.map((p: any) => ({ ...p, invRef: [String(draft.invoice)] })),
    });
    await updateInvoiceDoc(uid, draft.id, YEAR, { productsDataInvoice: [] });

    await expect(deleteInvoiceForContract(uid, draft.id, YEAR)).rejects.toThrow(/purchase invoices/);
    expect(await readInv(draft.id)).not.toBeNull();
  });

  it('a comment is saved and raises a notification', async () => {
    const rec = await addComment(uid, {
      entityType: 'contract',
      entityId: contractId,
      entityLabel: `PO ${TAG}`,
      text: 'ZZ smoke-test comment',
      authorUid: auth.currentUser?.uid || '',
      authorName: 'Smoke test',
    });
    expect(rec).not.toBeNull();
    expect((await getDoc(doc(db, uid, 'data', 'comments', rec!.id))).exists()).toBe(true);
    const notes = await getDocs(query(collection(db, uid, 'data', 'notifications'), where('entityId', '==', contractId)));
    expect(notes.docs.some((d) => d.data().type === 'comment.added')).toBe(true);
  });
});
