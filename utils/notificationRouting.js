// Where a notification's entity lives in the app — shared by the bell dropdown
// and the arrival pop-ups so both navigate identically. Kept dependency-free to
// avoid component import cycles (bell -> context -> popups -> bell).
const ROUTES = {
    contract: (id) => `/contracts?openId=${id}`,
    invoice: (id) => `/invoices?openId=${id}`,
    expense: (id) => `/expenses?openId=${id}`,
    companyexpense: () => `/companyexpenses`,
    stock: () => `/stocks`,
    settings: () => `/settings`,
};

export const routeFor = (entityType, entityId) =>
    (ROUTES[entityType] || (() => `/activity`))(entityId);
