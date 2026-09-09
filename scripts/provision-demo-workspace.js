#!/usr/bin/env node
/**
 * Build an isolated demo workspace for the App Store reviewer.
 *
 * WHY THIS EXISTS
 * ---------------
 * A user's workspace is the `uidCollection` custom claim on their Firebase
 * account, and `actions/pass.js` assigns new users the claim of whichever admin
 * created them. So a demo account created from Settings -> Users lands in the
 * real IMS workspace and shows live customer data — which is what happened.
 *
 * This script gives the demo account a workspace of its own and fills it with a
 * structural clone of IMS in which every identifying name is replaced and every
 * commercial figure is rescaled. Cloning rather than hand-writing fixtures is
 * deliberate: the document shapes stay exactly right, so every screen renders,
 * while no real party or real number survives.
 *
 * Record ids are deliberately NOT changed. Contracts reference suppliers by id,
 * so keeping ids while replacing display names preserves every cross-reference
 * and still leaves nothing identifiable on screen.
 *
 * USAGE
 *   node scripts/provision-demo-workspace.js                  # dry run, writes nothing
 *   node scripts/provision-demo-workspace.js --commit         # actually writes
 *   node scripts/provision-demo-workspace.js --commit --password 'Str0ng-Pass'
 *
 * FLAGS
 *   --commit              Actually write. Omit for a dry run.
 *   --email <address>     Demo account to provision. Default: test@ims-tech.com.
 *   --create              Create the account if it does not exist yet. Needs
 *                         --password. Refuses to guess a password for you.
 *   --password <value>    Set (or, with --create, initialise) the account's
 *                         password.
 *   --role <role>         Custom-claim role to give the account. Default: 'user'.
 *                         Refusing to silently change an EXISTING account's role
 *                         is deliberate — this warns instead if it would.
 *   --use-test-workspace  Point the claim at an already-populated throwaway test
 *                         workspace instead of cloning IMS fresh. Nothing is
 *                         written to Firestore in this mode — just the claim.
 *
 * Needs ./serviceAccountKey.json (gitignored) at the repo root.
 *
 * THIS IS NOT ENOUGH ON ITS OWN. The Firestore rules that are live today are
 *     match /{document=**} { allow read, write: if request.auth.uid != null; }
 * which lets ANY signed-in account read every workspace regardless of its claim.
 * Until the hardened rules in firestore.rules are published, the demo account can
 * still reach real data. See firestore.rules and mobile/APP_STORE.md.
 */

const path = require('path');
const admin = require(path.join(__dirname, '..', 'node_modules', 'firebase-admin'));

// ── Configuration ───────────────────────────────────────────────────────────

const SOURCE_WORKSPACE = 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2'; // IMS, from utils/activeAccount.js
const DEMO_WORKSPACE = 'DEMO_WORKSPACE_APPSTORE';
const DEMO_EMAIL = 'test@ims-tech.com';
const DEMO_DISPLAY_NAME = 'App Review Demo';

// A test workspace that predates this script, holding ~39 contracts, 76 invoices
// and 225 stock lots of throwaway data ("AAA Sup2", "RotZZZ", order "zxcvvb").
// Checked 2026-09-10: one supplier name overlaps with live IMS, no client names
// do, so it carries no meaningful customer data. Preferring it with
// --use-test-workspace is the cheap path — one claim change and nothing written
// to Firestore at all, versus cloning several thousand documents.
const EXISTING_TEST_WORKSPACE = '1wD74Rzav1PZ40MxXStjn9WgtJm2';

// Keys whose string value is shown to a user as somebody's name or contact
// detail. These get replaced. Anything not listed here is left alone, so enum-ish
// values (currency codes, incoterms, statuses, units) survive untouched.
const NAME_KEYS = new Set([
  'nname', 'bankNname', 'name', 'companyName', 'company', 'supplierName',
  'clientName', 'customer', 'customerName', 'vendor', 'vendorName', 'consignee',
  'shipper', 'beneficiary', 'accountName', 'contact', 'contactName', 'attn',
  'displayName', 'warehouse', 'warehouseName',
]);

const CONTACT_KEYS = new Set([
  'email', 'mail', 'phone', 'tel', 'mobile', 'fax', 'address', 'address1',
  'address2', 'street', 'city', 'postcode', 'zip', 'vat', 'taxId', 'iban',
  'swift', 'bic', 'accountNumber', 'accountNo', 'registration', 'website',
]);

// Free-form text a person typed, which is where a real name or a private aside
// most often hides. Deliberately NOT including `description`, `ref` or
// `reference`: those carry material grades and order numbers rather than
// personal data, and blanking them made every row on screen read identically —
// a demo that looks broken is its own kind of review risk.
const FREE_TEXT_KEYS = new Set([
  'notes', 'note', 'remarks', 'remark', 'comment', 'comments', 'memo',
]);

// Varied so a table of records still looks like a table of records.
const FAKE_NOTES = [
  'Demo record — figures are not real.',
  'Sample data for demonstration.',
  'Placeholder note.',
  'Demo entry, no action required.',
  'Example record.',
];

// Numeric keys that carry commercial value and must not leak. Scaled by a
// deterministic per-document factor so relationships inside a record stay
// plausible while the absolute figures stop being real.
const MONEY_KEYS = [
  'price', 'amount', 'total', 'cost', 'value', 'rate', 'freight', 'premium',
  'discount', 'qty', 'quantity', 'weight', 'net', 'gross', 'tonnage', 'mt',
  'balance', 'paid', 'due', 'margin', 'profit', 'unitPrice', 'sum', 'fee',
];

const FAKE_COMPANIES = [
  'Northwind Alloys', 'Cobalt Bay Metals', 'Aster Resources', 'Vantage Steel',
  'Meridian Alloys', 'Blue Harbour Metals', 'Kestrel Trading', 'Orbit Metals',
  'Silverline Commodities', 'Fairmont Alloys', 'Ridgeway Metals', 'Halcyon Trading',
  'Quarry Lane Metals', 'Beacon Alloys', 'Tallow Bay Resources', 'Ironvale Trading',
  'Copperfield Metals', 'Larkspur Commodities', 'Granite Peak Alloys', 'Selwyn Metals',
];

const FAKE_BANKS = [
  'Meridian Commercial Bank', 'Harbour Trust Bank', 'Northgate Bank',
  'Sterling Union Bank', 'Crescent Commercial Bank',
];

const FAKE_PEOPLE = [
  'A. Whitfield', 'M. Castellanos', 'R. Okonkwo', 'L. Bergstrom', 'S. Haddad',
  'D. Fairweather', 'N. Petrov', 'J. Lindqvist', 'T. Abubakar', 'K. Moreau',
];

// ── Deterministic pseudo-randomness ─────────────────────────────────────────
// Same input always yields the same replacement, so re-running the script does
// not reshuffle every name and a re-clone stays diffable against the last one.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = (arr, seed) => arr[hash(seed) % arr.length];

// 0.55x - 1.45x, stable per document.
const scaleFactor = (seed) => 0.55 + ((hash(seed) % 900) / 1000);

const isMoneyKey = (key) => {
  const k = key.toLowerCase();
  return MONEY_KEYS.some((m) => k === m || k.includes(m));
};

function fakeName(original, seed) {
  const s = `${seed}|${original}`;
  if (/bank/i.test(original)) return pick(FAKE_BANKS, s);
  // A short value with no space is more likely a person's initials-style label.
  if (original.length < 14 && !original.includes(' ')) return pick(FAKE_PEOPLE, s);
  return pick(FAKE_COMPANIES, s);
}

function fakeContact(key, original, seed) {
  const k = key.toLowerCase();
  const s = `${seed}|${key}|${original}`;
  const n = hash(s);
  if (k.includes('mail')) return `contact${n % 900 + 100}@example.com`;
  if (k.includes('phone') || k.includes('tel') || k.includes('mobile') || k.includes('fax')) {
    return `+44 20 7${String(n % 9000000 + 1000000)}`;
  }
  if (k.includes('iban')) return `GB29 DEMO 6016 1331 ${String(n % 9000 + 1000)} 19`;
  if (k.includes('swift') || k.includes('bic')) return 'DEMOGB2LXXX';
  if (k.includes('city')) return pick(['Rotterdam', 'Antwerp', 'Hamburg', 'Bilbao', 'Genoa'], s);
  if (k.includes('post') || k.includes('zip')) return `DM${n % 90 + 10} ${n % 9}AB`;
  if (k.includes('vat') || k.includes('tax')) return `GB${n % 900000000 + 100000000}`;
  if (k.includes('account')) return `${n % 90000000 + 10000000}`;
  if (k.includes('website')) return 'https://example.com';
  return `${n % 900 + 100} Demo Wharf, Dockside`;
}

// ── Value walker ────────────────────────────────────────────────────────────

const touched = new Map();
const note = (kind) => touched.set(kind, (touched.get(kind) || 0) + 1);

function scrub(value, key, docSeed) {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) return value.map((v) => scrub(v, key, docSeed));

  // Firestore Timestamps, GeoPoints, DocumentReferences etc. must pass straight
  // through — rebuilding them as plain objects would corrupt the document.
  if (typeof value === 'object') {
    const ctor = value.constructor && value.constructor.name;
    if (ctor && ctor !== 'Object') return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrub(v, k, docSeed);
    return out;
  }

  if (typeof value === 'number') {
    if (isMoneyKey(key) && Number.isFinite(value) && value !== 0) {
      note('numbers rescaled');
      const scaled = value * scaleFactor(docSeed);
      return Number.isInteger(value) ? Math.round(scaled) : Number(scaled.toFixed(2));
    }
    return value;
  }

  if (typeof value !== 'string' || value.trim() === '') return value;

  const k = key.toLowerCase();

  // Never touch anything that identifies a record — ids are what hold the
  // cross-references between contracts, invoices, stock and settings together.
  if (k === 'id' || k.endsWith('id') || k.endsWith('_id')) return value;

  if (NAME_KEYS.has(key) || NAME_KEYS.has(k)) {
    note('names replaced');
    return fakeName(value, docSeed);
  }
  if (CONTACT_KEYS.has(key) || CONTACT_KEYS.has(k)) {
    note('contact details replaced');
    return fakeContact(key, value, docSeed);
  }
  if (FREE_TEXT_KEYS.has(key) || FREE_TEXT_KEYS.has(k)) {
    note('free text cleared');
    return pick(FAKE_NOTES, `${docSeed}|${key}|${value}`);
  }
  // A numeric string in a money field is still a money field.
  if (isMoneyKey(key) && /^-?\d+(\.\d+)?$/.test(value)) {
    note('numbers rescaled');
    const scaled = parseFloat(value) * scaleFactor(docSeed);
    return String(Number(scaled.toFixed(2)));
  }
  return value;
}

// ── Recursive clone ─────────────────────────────────────────────────────────
//
// Reading document-by-document is far too slow here: a workspace holds years of
// contracts and invoices, and a per-document get() plus listCollections() is two
// network round trips each. Instead each collection is read in ONE query, and
// subcollection discovery is bounded.
//
// The bound is safe for this schema, and the exact value matters. Subcollections
// hang off the workspace-level documents only — `data` holds contracts_YYYY,
// invoices_YYYY, stocks and the rest, and the records inside those are leaves.
// At depth 1 we therefore stop, which is what keeps us from spending a
// listCollections() round trip on every single contract and invoice.
// Raise this only if a record document ever gains a subcollection of its own.
const MAX_SUBCOLLECTION_DEPTH = 1;

async function recurseSubcollections(srcRef, destRef, ctx, depth) {
  if (depth >= MAX_SUBCOLLECTION_DEPTH) return;
  const subs = await srcRef.listCollections();
  for (const sub of subs) {
    await cloneCollection(sub, destRef.collection(sub.id), ctx, depth + 1);
  }
}

async function cloneCollection(srcCol, destCol, ctx, depth = 0) {
  // Every document that actually holds fields, in a single round trip.
  const snap = await srcCol.get();
  const withData = new Set();

  for (const doc of snap.docs) {
    withData.add(doc.id);
    const data = scrub(doc.data(), '', doc.ref.path);
    if (ctx.commit) ctx.writer.set(destCol.doc(doc.id), data);
    ctx.stats.docs += 1;
    if (ctx.stats.docs % 500 === 0) {
      process.stdout.write(`  ...${ctx.stats.docs} documents\n`);
    }
    await recurseSubcollections(doc.ref, destCol.doc(doc.id), ctx, depth);
  }

  // Documents that exist ONLY as parents of a subcollection carry no fields and
  // so never come back from get(). `data` is exactly such a shell, and missing it
  // would mean cloning none of the contracts beneath it.
  if (depth < MAX_SUBCOLLECTION_DEPTH) {
    const refs = await srcCol.listDocuments();
    for (const ref of refs) {
      if (withData.has(ref.id)) continue;
      ctx.stats.shells += 1;
      await recurseSubcollections(ref, destCol.doc(ref.id), ctx, depth);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const commit = argv.includes('--commit');
  const useExisting = argv.includes('--use-test-workspace');
  const createMissing = argv.includes('--create');
  const pwIndex = argv.indexOf('--password');
  const newPassword = pwIndex !== -1 ? argv[pwIndex + 1] : null;
  const emailIndex = argv.indexOf('--email');
  const email = emailIndex !== -1 ? argv[emailIndex + 1] : DEMO_EMAIL;
  // Explicit, because silently rewriting the role of an account that already
  // exists is a good way to demote a colleague's login. 'Admin' shows a reviewer
  // the whole app, which is harmless in a throwaway workspace.
  const roleIndex = argv.indexOf('--role');
  const role = roleIndex !== -1 ? argv[roleIndex + 1] : 'user';

  // Point at the workspace that already exists rather than building a new one.
  const targetWorkspace = useExisting ? EXISTING_TEST_WORKSPACE : DEMO_WORKSPACE;

  let serviceAccount;
  try {
    serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
  } catch {
    console.error('Could not read serviceAccountKey.json at the repo root.');
    console.error('Download it from Firebase console -> Project settings -> Service accounts.');
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const auth = admin.auth();

  console.log(commit
    ? '*** COMMIT MODE — this will write to Firebase ***\n'
    : 'DRY RUN — nothing will be written. Re-run with --commit to apply.\n');

  // 1. The demo user.
  let user = null;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Found demo user ${email} (uid ${user.uid})`);
    const currentWs = user.customClaims && user.customClaims.uidCollection;
    console.log(`  current workspace claim: ${currentWs || '(none)'}`);
    if (currentWs === SOURCE_WORKSPACE) {
      console.log('  ^ this is the live IMS workspace — the reason real data is showing.');
    } else if (currentWs === targetWorkspace) {
      console.log('  ^ already the target workspace; the claim below is a no-op.');
    }
  } catch (e) {
    // A credential, permission or network failure is NOT a missing user, and
    // saying so sent me chasing the wrong thing once already.
    if (e.code !== 'auth/user-not-found') {
      console.error(`Could not look up ${email}: ${e.code || ''} ${e.message}`);
      process.exit(1);
    }
    console.log(`No account exists for ${email}.`);
    if (!createMissing) {
      console.error('\nEither pass --create to make it, or --email <address> to point');
      console.error('this at an account that already exists.');
      process.exit(1);
    }
    if (!newPassword) {
      console.error('\n--create needs --password <value> to set the initial password.');
      process.exit(1);
    }
    console.log(`Would create it${commit ? '' : ' (dry run)'} in workspace ${targetWorkspace}.`);
    if (commit) {
      user = await auth.createUser({
        email,
        password: newPassword,
        displayName: DEMO_DISPLAY_NAME,
        emailVerified: true,
        disabled: false,
      });
      console.log(`  created (uid ${user.uid})`);
    }
  }

  // Nothing further to do in a dry run that would have created the account.
  if (!user) {
    console.log('\nDry run stops here — re-run with --commit to create the account.');
    return;
  }

  // 2. Repoint its claim at the demo workspace, and keep it a plain user.
  const claims = {
    uidCollection: targetWorkspace,
    role,
    title: role,
    pages: null,
  };
  const previousRole = (user.customClaims || {}).role || (user.customClaims || {}).title;
  if (previousRole && previousRole.toLowerCase() !== role.toLowerCase()) {
    console.log(`\nNOTE: this changes the account's role ${previousRole} -> ${role}.`);
    console.log('      Pass --role to keep the one it has.');
  }
  console.log(`\nClaim to set: ${JSON.stringify(claims)}`);
  if (commit) {
    await auth.setCustomUserClaims(user.uid, claims);
    const update = { displayName: DEMO_DISPLAY_NAME, emailVerified: true };
    if (newPassword) update.password = newPassword;
    await auth.updateUser(user.uid, update);
    console.log('  claim + profile written.');
    if (newPassword) console.log('  password changed.');
  }

  // 3. Data. With --use-test-workspace there is nothing to do: the workspace is
  // already populated, so the claim change above is the whole job.
  if (useExisting) {
    const existing = await db.collection(EXISTING_TEST_WORKSPACE).doc('cmpnyData').get();
    console.log(`\nUsing the existing test workspace ${EXISTING_TEST_WORKSPACE}`);
    console.log(`  company name on file: ${JSON.stringify(existing.data()?.name || '(unset)')}`);
    console.log('  no documents written — it is already populated.');
    console.log(commit
      ? '\nDone. The demo user must sign out and back in — custom claims are read\nfrom the ID token, so an existing session keeps the old workspace.'
      : '\nNothing was written. Re-run with --commit when the above looks right.');
    console.log('\nREMINDER: publish the hardened rules in firestore.rules. Until then the');
    console.log('live rule allows any signed-in account to read every workspace.');
    return;
  }

  console.log(`\nCloning ${SOURCE_WORKSPACE} -> ${DEMO_WORKSPACE}`);
  const ctx = {
    commit,
    stats: { docs: 0, shells: 0 },
    // BulkWriter batches and parallelises the writes; setting documents one at a
    // time would make a workspace-sized clone take far longer than it needs to.
    writer: commit ? db.bulkWriter() : null,
  };

  await cloneCollection(
    db.collection(SOURCE_WORKSPACE),
    db.collection(DEMO_WORKSPACE),
    ctx,
  );

  if (ctx.writer) await ctx.writer.close();

  const { docs, shells } = ctx.stats;
  console.log(`\n${docs} document(s) ${commit ? 'written' : 'would be written'}.`);
  if (shells) console.log(`${shells} parent-only document(s) traversed for subcollections.`);
  if (touched.size) {
    console.log('Scrubbing summary:');
    for (const [kind, n] of touched) console.log(`  ${kind}: ${n}`);
  }

  if (!commit) {
    console.log('\nNothing was written. Re-run with --commit when the above looks right.');
  } else {
    console.log('\nDone. The demo user must sign out and back in — custom claims are');
    console.log('read from the ID token, so an existing session keeps the old workspace.');
  }

  console.log('\nREMINDER: publish the hardened rules in firestore.rules. Until then the');
  console.log('live rule allows any signed-in account to read every workspace.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
