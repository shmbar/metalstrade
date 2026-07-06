// Daily push digest — notifies every registered mobile device about overdue
// receivables. Triggered by Vercel Cron (see vercel.json); protected by
// CRON_SECRET. Uses firebase-admin (FIREBASE_SERVICE_ACCOUNT env: the service
// account JSON) because it must read across account namespaces server-side.
//
// Money math reuses utils/finance.js — the same canonical module the dashboard
// and mobile app compute receivables with, so the numbers in the notification
// match what the user sees when they open the app.
import { groupInvoices, isIssued, invoiceBalance, invoicePaid, effectiveDueDate, resolveCur, num } from '../../../../utils/finance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let adminDb = null;
async function getAdminDb() {
    if (adminDb) return adminDb;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env not set');
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const creds = JSON.parse(raw);
    const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(creds) });
    adminDb = getFirestore(app);
    return adminDb;
}

const CUR_SYMBOL = (c) => {
    const s = String(c || '').toLowerCase();
    return s === 'eu' || s === 'eur' || s === '€' ? '€' : '$';
};
const fmtKM = (cur, n) => {
    const s = CUR_SYMBOL(cur);
    const a = Math.abs(n);
    if (a >= 1e6) return `${s}${(n / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}${(n / 1e3).toFixed(1)}K`;
    return `${s}${n.toFixed(0)}`;
};

// Overdue summary for one account: issued invoices with a balance whose
// effective due date is in the past. Reads this year + last year buckets.
async function overdueFor(db, uidCollection) {
    const now = new Date();
    const years = [now.getFullYear(), now.getFullYear() - 1];

    const docs = [];
    for (const y of years) {
        const snap = await db.collection(uidCollection).doc('data').collection(`invoices_${y}`).get();
        snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
    }

    let termDays = 30;
    try {
        const comp = await db.collection(uidCollection).doc('cmpnyData').get();
        const t = parseInt(comp.data()?.defaultTermDays, 10);
        if (t > 0) termDays = t;
    } catch { /* default */ }

    const overdue = groupInvoices(docs).filter((inv) => {
        if (!isIssued(inv)) return false;
        const balance = inv.debtBlnc != null ? num(inv.debtBlnc) : invoiceBalance(inv);
        if (balance <= 0.01) return false;
        const due = effectiveDueDate(inv, termDays);
        return due && new Date(due) < now;
    });

    const byCur = {};
    overdue.forEach((inv) => {
        const cur = resolveCur(inv);
        const balance = inv.debtBlnc != null ? num(inv.debtBlnc) : num(inv.totalAmount) - invoicePaid(inv);
        byCur[cur] = (byCur[cur] || 0) + balance;
    });
    const totalLine = Object.entries(byCur).map(([c, v]) => fmtKM(c, v)).join(' + ');
    return { count: overdue.length, totalLine };
}

async function sendExpoPush(messages) {
    if (!messages.length) return [];
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
    });
    const data = await res.json().catch(() => ({}));
    return data?.data || [];
}

export async function GET(request) {
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET> automatically.
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = await getAdminDb();

        // All registered devices, grouped per account namespace.
        const tokensSnap = await db.collectionGroup('pushTokens').get();
        const byAccount = new Map();
        tokensSnap.forEach((d) => {
            const { token, uidCollection } = d.data() || {};
            if (!token || !uidCollection) return;
            if (!byAccount.has(uidCollection)) byAccount.set(uidCollection, []);
            byAccount.get(uidCollection).push({ token, ref: d.ref });
        });

        const messages = [];
        const results = {};
        for (const [uidCollection, devices] of byAccount) {
            const { count, totalLine } = await overdueFor(db, uidCollection);
            results[uidCollection] = { devices: devices.length, overdue: count };
            if (count === 0) continue;
            for (const { token } of devices) {
                messages.push({
                    to: token,
                    title: 'Overdue receivables',
                    body: `${count} invoice${count === 1 ? '' : 's'} past due — ${totalLine} outstanding`,
                    data: { screen: '/invoices', filter: 'Unpaid' },
                });
            }
        }

        const tickets = await sendExpoPush(messages);

        // Best-effort cleanup of dead tokens.
        const allDevices = [...byAccount.values()].flat();
        await Promise.all(
            tickets.map((t, i) =>
                t?.details?.error === 'DeviceNotRegistered' && allDevices[i]
                    ? allDevices[i].ref.delete().catch(() => {})
                    : Promise.resolve()
            )
        );

        return Response.json({ ok: true, sent: messages.length, accounts: results });
    } catch (err) {
        console.error('push/daily error:', err);
        return Response.json({ error: err.message || 'Digest failed' }, { status: 500 });
    }
}
