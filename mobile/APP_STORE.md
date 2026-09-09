# App Store submission — IMS (ASC app 6783294305)

Everything the App Store listing needs, plus the steps that must happen in App
Store Connect. Keep this current; the next release is much cheaper if it is.

`eas submit` only **delivers a binary** to App Store Connect. It is the same
action that fills TestFlight. Submitting for **review** is a separate step on the
version page in ASC ("Add for Review") and cannot be done from the CLI.

---

## 1. Version alignment

The ASC version page was created as **1.0**; every uploaded build is **1.0.3**.
ASC filters the build picker by version train, so 1.0.3 builds will not appear
under a 1.0 version.

Fix in ASC — no rebuild needed: open the version page, and in **General
Information** change the version number field to `1.0.3` so it matches
`app.json`'s `expo.version`.

## 2. A new build is required

`ios.supportsTablet` was `true`, which ships a universal binary and obliges us to
supply a **full iPad screenshot set**. There is no tablet-specific layout
anywhere in `src/` or `app/`, so an iPad reviewer would see a stretched phone UI
— a Guideline 4.0 risk on top of the screenshot work, and we have no iPad or
simulator to capture on.

It is now `false`. That only takes effect in a **new build** — builds ≤29 are
still universal.

```bash
cd mobile
npx eas-cli build --platform ios --profile production   # -> build 30
npx eas-cli submit --platform ios --latest
```

Attach **build 30**, not 29. With an iPhone-only binary the iPad screenshot slot
disappears from the listing.

## 3. Screenshots

Required: iPhone 6.5" — 1284 × 2778 (or 1242 × 2688). Only the **first three**
appear on the install sheet, so lead with the strongest screens.

We have no Mac, so capture on a physical iPhone via TestFlight, drop the files in
a folder, then normalise them to the exact size:

```bash
node mobile/scripts/prepare-screenshots.js --in ./raw --out ./shots
```

The script rescales any iPhone resolution to the exact target **and strips the
alpha channel** — ASC rejects screenshots that still carry one, with an error
that does not say so clearly. Use `--mode cover` to fill the frame by cropping
the edges instead of padding.

Suggested order: Dashboard → Contracts list → Cashflow → Stock → Invoice detail.
Sign in as a demo account first so no real customer names are visible.

## 4. Listing copy

**Name** (30): `IMS` — already set
**Subtitle** (30): `Metals trading operations`

**Promotional text** (170):
`Run contracts, stock, invoices and cashflow from your phone — with AI document reading that turns a supplier PDF into a filled-in record.`

**Keywords** (100, no spaces — the title and subtitle are already indexed, so
they are not repeated here):
`alloys,inventory,contracts,invoices,cashflow,stock,commodity,scrap,shipment,supplier,margin,B2B`

**Description**:

```
IMS is the operations platform for metals and alloys trading. It keeps
contracts, inventory, shipments, invoicing and cashflow in one place, so the
numbers your team works from are the same numbers wherever they are.

CONTRACTS AND SALES
Track purchase contracts and sales orders from agreement to delivery, with
per-line quantities, pricing formulas and the shipment status attached to each.

INVENTORY AND SHIPMENTS
See what is in each warehouse, what it cost, how long it has been sitting and
what it is worth today. Follow shipments from loading to arrival.

CASHFLOW
One view of money in and money out — client balances, supplier balances, stock
value and expenses — with forecasting for what is still to come.

INVOICING AND EXPENSES
Raise client invoices against the contract lines they cover, record supplier
expenses, and keep both reconciled against the underlying trades.

MARGINS AND ANALYSIS
Margin per contract, per material and per period, calculated from the same
records the rest of the app runs on.

AI ASSISTANCE
Upload a supplier document or material certificate and IMS reads it, extracts
the values and prepares the record for you to confirm. Ask the built-in
assistant questions about your own data in plain language.

SECURITY
Sign in with Face ID or Touch ID. Access follows the role your administrator
assigns, so people see the parts of the business they are responsible for.

IMS is a subscription product for trading companies. Accounts are provided by
your organisation's administrator; the app does not offer public sign-up.
```

**Category**: Business (primary), Productivity (secondary)
**Age rating**: 4+
**Price**: Free (access is controlled by the customer's account)
**Copyright**: `2026 IMS Inc.`
**Support URL**: `https://www.ims-tech.io/support`
**Privacy Policy URL**: `https://www.ims-tech.io/privacy`
**Marketing URL** (optional): `https://www.ims-tech.io`

> Both URLs are new pages in this repo — `app/(public)/privacy/` and
> `app/(public)/support/`. **They must be deployed to production before you
> submit**; a reviewer clicks them and a 404 is an immediate rejection.
> The support page publishes `SUPPORT_EMAIL` from `utils/publicContact.js`
> (currently `info@ims-metals.com`) — make sure that mailbox actually receives
> mail, since a reviewer may write to it. The address is on a different domain
> to the site, which is fine; Apple does not require them to match.

## 5. App Privacy questionnaire

Answer in ASC under **App Privacy**. Based on what the code actually does:

| Data | Collected | Linked to user | Purpose | Tracking |
|---|---|---|---|---|
| Email address | Yes | Yes | App Functionality | No |
| User ID | Yes | Yes | App Functionality | No |
| Other User Content (business records, uploaded documents) | Yes | Yes | App Functionality | No |

Everything else — location, contacts, health, financial info *about the user*,
browsing history, advertising data, diagnostics — is **not collected**. Answer
**No** to "Do you use data for tracking purposes?"; there is no ad SDK and no
cross-app tracking.

Note the AI features: content is sent to OpenAI for processing (eight routes
under `app/api/ai/` plus the assistant). That is disclosed in section 4 of the
privacy policy. It stays "App Functionality" — it is processing on our behalf,
not third-party advertising or analytics.

Encryption: `ITSAppUsesNonExemptEncryption` is already `false` in `app.json`, so
export-compliance questions are answered automatically and no documentation is
needed.

## 6. App Review information — the part that gets apps rejected

The app is entirely behind a login and there is **no public sign-up**. Without
working credentials the reviewer sees only a sign-in screen and rejects under
Guideline 2.1. Fill in the demo account fields with a **real, working account
that has representative data in it**, and keep it enabled until the app is live.

Suggested notes to paste into "Notes":

```
IMS is a B2B subscription platform for metals and alloys trading companies.
Accounts are provisioned by each customer's own administrator, so the app has
no public sign-up screen by design.

Please sign in with the demo account provided above. It is a populated
demonstration workspace, not live customer data.

The app is sold commercially to trading companies rather than being an
internal tool for a single organisation; product information is at
https://www.ims-tech.io.

Face ID / Touch ID sign-in is optional and only appears after a first
successful password sign-in on the device. Email and password work throughout.

Some screens use AI to read uploaded trade documents. Sample documents are
already present in the demo workspace under Contracts and Stock.
```

**Two known review risks**

- *Guideline 2.1 — incomplete information.* Mitigated only by supplying demo
  credentials that actually work. Test them on a fresh device before submitting.
- *Guidelines 4.2 / 3.2 — business apps.* Apple sometimes pushes company-internal
  tools to Apple Business Manager custom distribution instead of the public
  store. The defence is that IMS is a commercial product sold to multiple
  trading companies, which is why the review note says so and points at the
  marketing site. If Apple still objects, the fallback is a Custom App
  distributed privately through Apple Business Manager.

## 7. Order of operations

1. Deploy the web app so `/privacy` and `/support` are live.
2. `eas build --platform ios --profile production` → build 30.
3. `eas submit --platform ios --latest`, wait for processing.
4. In ASC: change the version number 1.0 → 1.0.3.
5. Capture screenshots on device, run `prepare-screenshots.js`, upload.
6. Paste the listing copy, set category, age rating, price and the URLs.
7. Complete App Privacy.
8. Fill in App Review demo credentials and notes.
9. Attach **build 30**.
10. **Add for Review**.
