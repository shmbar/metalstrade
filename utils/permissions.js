// ─────────────────────────────────────────────────────────────────────────────
// Access control: roles, per-page permissions, and the helpers that read them.
//
// Source of truth for "who can see what". Imported by the client (sidebar,
// route guard, settings UI) AND by the server actions in actions/pass.js, so
// keep it free of react/firebase imports.
//
// A user's access resolves in this order:
//   1. Super admin  → everything, always. Cannot be locked out.
//   2. An explicit `pages` claim (hand-picked in Settings → Users) → that list.
//   3. The role's default page set.
// ─────────────────────────────────────────────────────────────────────────────

// Page keys are the route segments under app/(root)/ — '/dashboard' → 'dashboard'.
// Groups mirror the sidebar sections so the permission checklist reads like the nav.
export const PAGE_GROUPS = [
  {
    ttl: 'Main Menu',
    pages: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'apps/Assistant', label: 'Assistant' },
    ],
  },
  {
    ttl: 'Shipments',
    pages: [
      { key: 'contracts', label: 'Contracts' },
      { key: 'salescontracts', label: 'Sales Contracts' },
      { key: 'shipment', label: 'Shipments Tracking' },
      { key: 'invoices', label: 'Invoices' },
      { key: 'expenses', label: 'Expenses' },
      { key: 'accounting', label: 'Accounting' },
      { key: 'ContractsReview&Statement', label: 'Contracts Review' },
      { key: 'InvoicesReview&Statement', label: 'Invoices Review' },
    ],
  },
  {
    ttl: 'Statements',
    pages: [
      { key: 'accstatement', label: 'Account Statement' },
      { key: 'stocks', label: 'Stocks' },
      { key: 'storagecosts', label: 'Storage Costs' },
    ],
  },
  {
    ttl: 'Miscellaneous',
    pages: [
      { key: 'specialinvoices', label: 'Misc Invoices' },
      { key: 'companyexpenses', label: 'Company Expenses' },
      { key: 'materialtables', label: 'Material Tables' },
      { key: 'incoterms', label: 'Incoterms' },
      { key: 'activity', label: 'Activity Log' },
    ],
  },
  {
    ttl: 'IMS Summary',
    pages: [
      { key: 'margins', label: 'Margins / Admin' },
      { key: 'cashflow', label: 'Cashflow' },
      { key: 'formulas', label: 'Formulas Calc' },
      { key: 'analysis', label: 'Analysis' },
      { key: 'settings', label: 'Settings' },
    ],
  },
];

export const PAGES = PAGE_GROUPS.flatMap((g) => g.pages.map((p) => ({ ...p, group: g.ttl })));
export const PAGE_KEYS = PAGES.map((p) => p.key);
export const pageLabel = (key) => PAGES.find((p) => p.key === key)?.label || key;

// Routes that exist but aren't gated on their own — print/detail views reached
// from a page the user already had to be allowed into.
const UNGATED = ['contractsstatement', 'invoicesstatement'];

// ── Roles ────────────────────────────────────────────────────────────────────
// `rank` decides who may administer whom: you can only manage a strictly lower
// rank. That is what stops an Admin from editing or deleting a Super Admin.
export const ROLES = [
  { key: 'superadmin', label: 'Super Admin', rank: 3, blurb: 'Full access. Manages users, roles and permissions.' },
  { key: 'admin', label: 'Admin', rank: 2, blurb: 'Full access to data. Manages Users and Accounting members.' },
  { key: 'user', label: 'User', rank: 1, blurb: 'Day-to-day access. No margins, formulas or user management.' },
  { key: 'accounting', label: 'Accounting', rank: 0, blurb: 'Restricted to the Accounting page.' },
];

// Accepts a role key, a legacy `title` claim ('Admin'/'User'/'Accounting'), or a
// label ('Super Admin'). Everything collapses to a lowercase, space-free key, so
// the old capital-A 'Accounting' claim finally matches the gate that checks it.
export function normalizeRole(value) {
  const v = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!v) return 'user';
  if (v === 'superadmin' || v === 'owner') return 'superadmin';
  if (v === 'admin' || v === 'administrator') return 'admin';
  if (v === 'accounting' || v === 'accountant') return 'accounting';
  return 'user';
}

export const roleMeta = (role) => ROLES.find((r) => r.key === normalizeRole(role)) || ROLES[2];
export const roleLabel = (role) => roleMeta(role).label;
export const roleRank = (role) => roleMeta(role).rank;

// ── Default page sets per role ───────────────────────────────────────────────
const ALL = PAGE_KEYS;
const ROLE_DEFAULT_PAGES = {
  superadmin: ALL,
  admin: ALL,
  // Matches what the sidebar already hid from non-admins — now enforced rather
  // than merely hidden.
  user: ALL.filter((k) => !['margins', 'formulas'].includes(k)),
  accounting: ['accounting'],
};

export const defaultPagesForRole = (role) =>
  ROLE_DEFAULT_PAGES[normalizeRole(role)] || ROLE_DEFAULT_PAGES.user;

// ── Claim shape ──────────────────────────────────────────────────────────────
// claims = { uidCollection, title, role, pages } — `pages` is present only when
// an admin hand-picked a set that differs from the role default.
//
// The workspace owner (their own uid IS the uidCollection every member's data
// hangs off) is always super admin. That is the bootstrap: no env var, no
// chicken-and-egg, and no way to end up with a workspace nobody can administer.
export function isSuperAdmin(claims = {}, uid = '') {
  if (normalizeRole(claims.role || claims.title) === 'superadmin') return true;
  const own = uid || claims.uid || '';
  return Boolean(own && claims.uidCollection && own === claims.uidCollection);
}

// The effective page list for a user, as an array.
export function resolvePages(claims = {}, uid = '') {
  if (isSuperAdmin(claims, uid)) return ALL;
  const role = normalizeRole(claims.role || claims.title);
  const custom = Array.isArray(claims.pages)
    ? claims.pages.filter((k) => PAGE_KEYS.includes(k))
    : null;
  return custom && custom.length ? custom : defaultPagesForRole(role);
}

export function canAccess(claims = {}, pageKey, uid = '') {
  if (!pageKey) return true;
  if (UNGATED.includes(pageKey)) return true;
  if (isSuperAdmin(claims, uid)) return true;
  // A route we don't know about isn't gated — adding a page shouldn't lock
  // everyone out of it until someone remembers to list it here.
  if (!PAGE_KEYS.includes(pageKey)) return true;
  return resolvePages(claims, uid).includes(pageKey);
}

// '/apps/Assistant?x=1' → 'apps/Assistant'. Returns '' for the app root.
export function pageKeyFromPath(pathname = '') {
  const clean = decodeURIComponent(String(pathname).split('?')[0]).replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  // Longest key first, so 'apps/Assistant' wins over a hypothetical 'apps'.
  const match = [...PAGE_KEYS]
    .sort((a, b) => b.length - a.length)
    .find((k) => clean === k || clean.startsWith(k + '/'));
  return match || clean.split('/')[0];
}

// Where to send someone who has no access to where they landed: their first
// allowed page, so an Accounting member lands on /accounting, not a wall.
export function landingPage(claims = {}, uid = '') {
  const allowed = resolvePages(claims, uid);
  const preferred = ['dashboard', 'contracts', 'accounting'].find((k) => allowed.includes(k));
  return '/' + (preferred || allowed[0] || 'dashboard');
}

// ── Who may administer whom ──────────────────────────────────────────────────
export function canManageUsers(claims = {}, uid = '') {
  if (isSuperAdmin(claims, uid)) return true;
  return normalizeRole(claims.role || claims.title) === 'admin';
}

// An actor may create/edit/delete a member of strictly lower rank — so only a
// super admin can mint an admin, and only a super admin can mint another super
// admin.
//
// Super admins are the one peer exception: they can manage each other. Without
// that, promoting someone to Super Admin would be irreversible — nobody would
// outrank them enough to demote them again. Two things keep this safe: nobody
// can act on their own account (checked at the call sites), and the workspace
// owner is protected outright by isProtectedAccount() below, so there is always
// exactly one account that cannot be demoted or deleted from the UI.
export function canManageRole(actorClaims = {}, targetRole, actorUid = '') {
  if (!canManageUsers(actorClaims, actorUid)) return false;
  const superActor = isSuperAdmin(actorClaims, actorUid);
  const actorRank = superActor ? roleRank('superadmin') : roleRank(actorClaims.role || actorClaims.title);
  if (superActor && normalizeRole(targetRole) === 'superadmin') return true;
  return actorRank > roleRank(targetRole);
}

// The workspace owner — the account whose uid IS the uidCollection — is the root
// of the whole account and is never editable or deletable through the users UI.
// It is the guarantee that a workspace can't be left with nobody in charge.
export function isProtectedAccount(targetUid, targetClaims = {}) {
  return Boolean(targetUid && targetClaims.uidCollection && targetUid === targetClaims.uidCollection);
}

// Roles the actor is allowed to hand out, for the role picker in the users modal.
export function assignableRoles(actorClaims = {}, actorUid = '') {
  return ROLES.filter((r) => canManageRole(actorClaims, r.key, actorUid));
}

// Firebase caps custom claims at 1000 bytes. Build the claim here so every
// caller agrees on the shape, and fail loudly rather than silently truncating
// somebody's permissions.
export function buildClaims({ uidCollection, role, pages }) {
  const normRole = normalizeRole(role);
  const claims = {
    uidCollection,
    role: normRole,
    title: roleLabel(normRole), // legacy claim — older code still reads `title`
  };
  const wanted = Array.isArray(pages) ? pages.filter((k) => PAGE_KEYS.includes(k)) : null;
  const dflt = defaultPagesForRole(normRole);
  const differs =
    wanted && (wanted.length !== dflt.length || wanted.some((k) => !dflt.includes(k)));
  // Persist a `pages` list only when it actually departs from the role default,
  // which keeps the claim small in the overwhelmingly common case.
  if (differs) claims.pages = wanted;

  const size = JSON.stringify(claims).length;
  if (size > 900) {
    throw new Error(
      'Permission set too large (' + size + ' bytes, max 900). Remove a few pages or use a role default.'
    );
  }
  return claims;
}
