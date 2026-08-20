import { describe, expect, it } from 'vitest';
import {
    PAGE_KEYS,
    assignableRoles,
    buildClaims,
    canAccess,
    canManageRole,
    canManageUsers,
    defaultPagesForRole,
    isProtectedAccount,
    isSuperAdmin,
    landingPage,
    normalizeRole,
    pageKeyFromPath,
    resolvePages,
} from '../../utils/permissions';

// The workspace id is a Firebase uid: the OWNER's own uid. Everyone else in the
// workspace carries it as a claim without matching it.
const WS = 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2';

const owner = { claims: { uidCollection: WS }, uid: WS };
const superAdmin = { claims: { uidCollection: WS, role: 'superadmin' }, uid: 'SA1' };
const adminUser = { claims: { uidCollection: WS, role: 'admin' }, uid: 'AD1' };
const plainUser = { claims: { uidCollection: WS, role: 'user' }, uid: 'US1' };
const accountant = { claims: { uidCollection: WS, role: 'accounting' }, uid: 'AC1' };

// Accounts created before roles existed carry only the legacy `title` claim.
const legacyAdmin = { claims: { uidCollection: WS, title: 'Admin' }, uid: 'LG1' };
const legacyAccounting = { claims: { uidCollection: WS, title: 'Accounting' }, uid: 'LG2' };

const can = (who, page) => canAccess(who.claims, page, who.uid);

describe('normalizeRole', () => {
    it('collapses legacy titles, labels and casing onto one key', () => {
        expect(normalizeRole('Admin')).toBe('admin');
        expect(normalizeRole('Accounting')).toBe('accounting');
        // The exact bug the old layout gate had: it compared against lowercase
        // 'accounting' while the stored claim was 'Accounting', so it never fired.
        expect(normalizeRole('accounting')).toBe('accounting');
        expect(normalizeRole('Super Admin')).toBe('superadmin');
        expect(normalizeRole('super_admin')).toBe('superadmin');
    });

    it('defaults unknown or missing values to the least-privileged role', () => {
        expect(normalizeRole(undefined)).toBe('user');
        expect(normalizeRole('')).toBe('user');
        expect(normalizeRole('wizard')).toBe('user');
    });
});

describe('super admin', () => {
    it('treats the workspace owner as super admin without any stored role', () => {
        expect(isSuperAdmin(owner.claims, owner.uid)).toBe(true);
    });

    it('does not promote a member who merely carries the workspace id', () => {
        expect(isSuperAdmin(plainUser.claims, plainUser.uid)).toBe(false);
        expect(isSuperAdmin(adminUser.claims, adminUser.uid)).toBe(false);
    });

    it('gives super admins every page, even against an empty explicit list', () => {
        const locked = { claims: { ...superAdmin.claims, pages: [] }, uid: superAdmin.uid };
        expect(resolvePages(locked.claims, locked.uid)).toEqual(PAGE_KEYS);
        expect(can(locked, 'margins')).toBe(true);
    });
});

describe('role defaults', () => {
    it('keeps margins and formulas away from a plain user', () => {
        expect(can(plainUser, 'margins')).toBe(false);
        expect(can(plainUser, 'formulas')).toBe(false);
        expect(can(plainUser, 'contracts')).toBe(true);
        expect(can(plainUser, 'cashflow')).toBe(true);
    });

    it('confines accounting to the accounting page', () => {
        expect(can(accountant, 'accounting')).toBe(true);
        expect(can(accountant, 'cashflow')).toBe(false);
        expect(can(accountant, 'contracts')).toBe(false);
        expect(can(accountant, 'settings')).toBe(false);
    });

    it('applies the same rules to legacy title-only accounts', () => {
        expect(can(legacyAdmin, 'margins')).toBe(true);
        expect(can(legacyAccounting, 'accounting')).toBe(true);
        expect(can(legacyAccounting, 'cashflow')).toBe(false);
    });

    it('gives admins the full page set', () => {
        expect(resolvePages(adminUser.claims, adminUser.uid)).toEqual(PAGE_KEYS);
    });
});

describe('per-user page overrides', () => {
    it('an explicit list wins over the role default, in both directions', () => {
        // Granted something the role normally withholds.
        const promoted = { claims: { ...plainUser.claims, pages: ['contracts', 'margins'] }, uid: 'US2' };
        expect(can(promoted, 'margins')).toBe(true);
        // ...and loses everything not on the list.
        expect(can(promoted, 'cashflow')).toBe(false);
    });

    it('ignores page keys that are not real pages', () => {
        const bogus = { claims: { ...plainUser.claims, pages: ['contracts', 'not-a-page'] }, uid: 'US3' };
        expect(resolvePages(bogus.claims, bogus.uid)).toEqual(['contracts']);
    });
});

describe('canAccess edge cases', () => {
    it('does not gate routes it has never heard of', () => {
        // A page added to app/(root)/ before it is listed here must not 404 everyone.
        expect(can(plainUser, 'some-brand-new-page')).toBe(true);
    });

    it('lets statement sub-views through — their parent page is the real gate', () => {
        expect(can(accountant, 'contractsstatement')).toBe(true);
    });
});

describe('pageKeyFromPath', () => {
    it('maps app paths to page keys, including nested and encoded ones', () => {
        expect(pageKeyFromPath('/dashboard')).toBe('dashboard');
        expect(pageKeyFromPath('/apps/Assistant')).toBe('apps/Assistant');
        expect(pageKeyFromPath('/contracts/abc123?tab=2')).toBe('contracts');
        expect(pageKeyFromPath('/ContractsReview&Statement')).toBe('ContractsReview&Statement');
        expect(pageKeyFromPath('/')).toBe('');
    });
});

describe('landingPage', () => {
    it('sends each role somewhere it is actually allowed to be', () => {
        expect(landingPage(accountant.claims, accountant.uid)).toBe('/accounting');
        expect(landingPage(plainUser.claims, plainUser.uid)).toBe('/dashboard');
        expect(landingPage(owner.claims, owner.uid)).toBe('/dashboard');
    });
});

describe('who may administer whom', () => {
    it('only admins and above manage users at all', () => {
        expect(canManageUsers(owner.claims, owner.uid)).toBe(true);
        expect(canManageUsers(superAdmin.claims, superAdmin.uid)).toBe(true);
        expect(canManageUsers(adminUser.claims, adminUser.uid)).toBe(true);
        expect(canManageUsers(plainUser.claims, plainUser.uid)).toBe(false);
        expect(canManageUsers(accountant.claims, accountant.uid)).toBe(false);
    });

    it('stops an admin from creating or touching another admin', () => {
        expect(canManageRole(adminUser.claims, 'user', adminUser.uid)).toBe(true);
        expect(canManageRole(adminUser.claims, 'accounting', adminUser.uid)).toBe(true);
        expect(canManageRole(adminUser.claims, 'admin', adminUser.uid)).toBe(false);
        expect(canManageRole(adminUser.claims, 'superadmin', adminUser.uid)).toBe(false);
    });

    it('lets super admins manage each other, so promotion stays reversible', () => {
        expect(canManageRole(superAdmin.claims, 'superadmin', superAdmin.uid)).toBe(true);
        expect(canManageRole(owner.claims, 'admin', owner.uid)).toBe(true);
    });

    it('offers each actor only the roles they may hand out', () => {
        expect(assignableRoles(adminUser.claims, adminUser.uid).map((r) => r.key))
            .toEqual(['user', 'accounting']);
        expect(assignableRoles(superAdmin.claims, superAdmin.uid).map((r) => r.key))
            .toEqual(['superadmin', 'admin', 'user', 'accounting']);
        expect(assignableRoles(plainUser.claims, plainUser.uid)).toEqual([]);
    });

    it('protects the owner account so a workspace can never be left headless', () => {
        expect(isProtectedAccount(WS, { uidCollection: WS })).toBe(true);
        expect(isProtectedAccount('SA1', { uidCollection: WS })).toBe(false);
    });
});

describe('buildClaims', () => {
    it('stamps role and the legacy title together', () => {
        const c = buildClaims({ uidCollection: WS, role: 'Admin' });
        expect(c.role).toBe('admin');
        expect(c.title).toBe('Admin');
        expect(c.uidCollection).toBe(WS);
    });

    it('omits `pages` when the selection is just the role default', () => {
        const c = buildClaims({ uidCollection: WS, role: 'user', pages: defaultPagesForRole('user') });
        expect(c.pages).toBeUndefined();
    });

    it('persists `pages` only when the selection actually differs', () => {
        const c = buildClaims({ uidCollection: WS, role: 'user', pages: ['contracts', 'margins'] });
        expect(c.pages).toEqual(['contracts', 'margins']);
    });

    it('stays inside the 1000-byte Firebase custom-claims limit at worst case', () => {
        const c = buildClaims({ uidCollection: WS, role: 'accounting', pages: PAGE_KEYS });
        expect(JSON.stringify(c).length).toBeLessThan(900);
    });

    it('drops unknown keys, so a padded list cannot inflate the claim', () => {
        // Filtering to real pages happens before the size check, which is why the
        // 900-byte guard can only ever fire if PAGE_KEYS itself grows too large —
        // and then it throws rather than silently truncating someone's permissions.
        const padded = [
            'contracts',
            ...Array.from({ length: 200 }, (_, i) => `page-number-${i}`),
        ];
        const c = buildClaims({ uidCollection: WS, role: 'user', pages: padded });
        expect(c.pages).toEqual(['contracts']);
        expect(JSON.stringify(c).length).toBeLessThan(900);
    });
});
