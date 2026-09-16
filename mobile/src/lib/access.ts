// Per-page access on mobile — the same rule web enforces (utils/permissions.js,
// b783925b), read from the same claims through the byte-identical @shared copy.
//
// Web gates by route segment under app/(root): '/cashflow' → 'cashflow'. Mobile's
// routes are named differently and some answer to more than one web page (Expenses
// holds both the supplier and the company tab), so each mobile route lists the web
// page keys it stands for. A route is open when ANY of its keys is allowed; an
// empty list is ungated (the More hub, the notification inbox).
import { canAccess, landingPage } from '@shared/permissions';

export const ROUTE_PAGES: Record<string, string[]> = {
  index: ['dashboard'],
  contracts: ['contracts'],
  invoices: ['invoices'],
  stocks: ['stocks'],
  'stock-audit': ['stocks'],
  cashflow: ['cashflow'],
  assistant: ['apps/Assistant'],
  activity: ['activity'],
  'sales-contracts': ['salescontracts'],
  'sales-contract-edit': ['salescontracts'],
  shipment: ['shipment'],
  expenses: ['expenses', 'companyexpenses'],
  'expense-edit': ['expenses', 'companyexpenses'],
  accounting: ['accounting'],
  'contracts-review': ['ContractsReview&Statement'],
  'invoices-review': ['InvoicesReview&Statement'],
  // Mobile-only screen built from the invoices-review statement data.
  balances: ['InvoicesReview&Statement', 'invoices'],
  'acc-statement': ['accstatement'],
  'misc-invoices': ['specialinvoices'],
  materials: ['materialtables'],
  incoterms: ['incoterms'],
  formulas: ['formulas'],
  margins: ['margins'],
  analysis: ['analysis'],
  settings: ['settings'],
  'settings-entity': ['settings'],
  'settings-company': ['settings'],
  'settings-setup': ['settings'],
  'settings-grades': ['settings'],
  'settings-email': ['settings'],
  'settings-users': ['settings'],
  'config-editor': ['settings'],
  more: [],
  notifications: [],
};

/** Where each web page key lives on mobile — the first route that answers to it. */
const PAGE_ROUTE: Record<string, string> = Object.entries(ROUTE_PAGES).reduce<Record<string, string>>(
  (acc, [route, keys]) => {
    keys.forEach((k) => {
      if (!acc[k]) acc[k] = route === 'index' ? '/(app)' : `/(app)/${route}`;
    });
    return acc;
  },
  {}
);

/** '/(app)/contracts/edit?id=1' → 'contracts'; '/(app)' → 'index'. */
export const routeKeyOf = (href: string): string => {
  const clean = String(href || '')
    .split('?')[0]
    .replace(/^\/+/, '')
    .replace(/^\(app\)\/?/, '');
  return clean.split('/')[0] || 'index';
};

export function canOpenRoute(claims: Record<string, any> | null, uid: string, route: string): boolean {
  const keys = ROUTE_PAGES[route];
  // A route not listed here is not gated — the same "adding a page must not lock
  // everyone out of it" rule web's canAccess applies to an unknown key.
  if (!keys || keys.length === 0) return true;
  if (!claims) return false;
  return keys.some((k) => canAccess(claims, k, uid));
}

/** The mobile route for web's landingPage(): an Accounting member lands on Accounting. */
export function landingHrefFor(claims: Record<string, any> | null, uid: string): string {
  if (!claims) return '/(app)';
  const key = landingPage(claims, uid).replace(/^\/+/, '');
  return PAGE_ROUTE[key] || '/(app)/more';
}
