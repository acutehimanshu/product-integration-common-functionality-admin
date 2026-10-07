> **Split repo (admin app).** This repo is one of four: `product-integration-common-functionality-shared`
> (shared packages `@acutehimanshu/*`, mock API, API contract, e2e tests) and
> `product-integration-common-functionality-buyer`, `product-integration-common-functionality-seller`, `product-integration-common-functionality-admin` (one app each).
> Shared code is changed in `product-integration-common-functionality-shared` and installed here as
> versioned packages from GitHub Packages, never edited in an app repo. The
> rest of this file was written for the original monorepo: `apps/<name>` and
> `packages/<name>` paths refer to those repos.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

This is **Marketbase**, a marketplace where one account can both buy and sell:
a frontend calling an **external backend** (no ORM/DB/API routes as data
layer live here). It was started from the
[nextjs-basecode](https://github.com/faizan-micro/nextjs-basecode) template, so every convention below is inherited
from it. The basecode's demo features (`src/features/example`,
`src/features/my-todos`, the `/todos` and `/dashboard` pages) were removed
here; where this file points to them as the reference pattern, read them in
the basecode repo until a real Marketbase feature replaces the reference
(the basecode's `src/features/<name>` is Marketbase's `src/modules/<id>`).

## Marketbase structure

- **A monorepo of independent apps.** `apps/buyer` (:3200) and
  `apps/seller` (:3300) are separate Next.js portals for the marketplace,
  `apps/admin` (:3400) is the Marketbase team's admin portal (a React
  single-page app), and
  `apps/mock-api` (:3100) is the dev backend. Each app
  builds and deploys on its own and could move to its own repository: an
  app never imports another app — only `packages/*`. Root `pnpm dev` starts
  them all. Shared code lives in packages that ship TypeScript source
  (each Next app lists them in `transpilePackages`):
  - `@acutehimanshu/core` — domain types and rules, no React: money
    (`money.ts`), `domain/order-rules.ts`, `domain/listing-stock.ts`,
    `marketplace-settings.ts`, `safe-redirect.ts`, `legal-pages.ts`,
    `domain/*` types, `types/*`.
  - `@acutehimanshu/ui` — the design system: `components/ui/*` (shadcn),
    `Heading`, `Text`, `PageContainer`, `FormField`, `NativeSelect`,
    `ListingImage`, order badges, providers, `styles/globals.css` and
    `styles/sizes.css`, `utils` (`cn`, `plural`).
  - `@acutehimanshu/web` — Next plumbing every portal needs: `api/client`
    (`api` + `bff`), `api/server` (`getUserApi`, `authedApi`),
    `api/reference` (countries, categories), `auth/*` (session cookie,
    session hooks), `routes/*` (auth + BFF route handlers), `env`
    (backend URL, cookie domain) and shared components (login and
    profile forms, `CancelOrderDialog`).
  - `@acutehimanshu/config` — base tsconfig and ESLint presets.

  Put code in a package only when a second app needs it; until then it
  stays in the app. Import packages by name (`@acutehimanshu/ui/components/…`);
  `@/…` means "this app's own src".

- **Every feature is a module** (`src/modules/<id>/` in each portal), so
  any feature can be switched off, or deleted, without breaking the rest.
  - A module's `module.ts` manifest declares the routes it owns, the menu
    links it adds (`nav`, per slot: buyer `header`/`account`, seller
    `sections`), its public `sitemap` pages, `dependsOn` and whether it's
    `required`. The engine is `@acutehimanshu/core/modules`.
  - **`src/modules/index.ts` is the one switchboard** per portal: every
    module with `true`/`false`. Per deployment, override with
    `NEXT_PUBLIC_MODULES_OFF=offers,rfq` / `NEXT_PUBLIC_MODULES_ON=…` (build
    time — they're inlined). A bad combination (unknown id, a required
    module off, a module whose dependency is off) fails the start with a
    clear error rather than half-working.
  - **Off means:** its routes answer 404 (`proxy.ts` rewrites them to a
    missing page), its links leave every menu and the sitemap, and shared
    pages hide what points at it. Anything that links into a module asks
    first — `modules.isEnabled("rfq")`, `modules.nav("account")` — never
    hard-codes a link to a toggleable page.
  - **Boundaries (lint-enforced, `@acutehimanshu/config/eslint-modules`):** a
    module never imports another module, only `@/components`, `@/lib`,
    the `@acutehimanshu/*` packages, and the registry itself (`@/modules`,
    `@/modules/types`). Pages under `src/app` compose modules — that's the
    only place two modules meet. Something two modules need moves to
    `src/components` or a package.
  - **Adding a module:** folder + `module.ts`, its id in `types.ts`, a line
    in `index.ts`, pages in `src/app`. `src/modules/index.test.ts` fails
    if a module claims a route with no page, links to a missing page, or a
    page belongs to no module (only login/welcome/start are shared).
  - **Removing one for good:** delete its folder, its pages, its line in
    `index.ts` and its id in `types.ts`; the compiler lists anything left.
  - Buyer modules: catalog*, cart* (cart + checkout), orders, offers, rfq,
    saved, notifications, account*, seller-profiles, plan, legal*, selling
    (the Sell button). Seller: dashboard*, listings, offers, rfq, orders,
    payouts, notifications, plan, settings* (* = required).
- **Portal CSS:** each app's `src/app/globals.css` imports the shared
  theme by relative path and adds `@source` lines for `packages/ui` and
  `packages/web` — Tailwind only scans the app folder by default, and it
  can't resolve the package name under Turbopack. A new package with
  Tailwind classes needs its own `@source` line in every app.
- **One account, two portals.** A user is a buyer by default; selling
  happens in the seller portal after a one-time Start selling step
  (`apps/seller` `/start`). The buyer header's **Sell** button and the
  account menu open the seller portal in a new tab (`SellLink`,
  `NEXT_PUBLIC_SELLER_PORTAL_URL`); the seller header's "Go to buying"
  links back (`NEXT_PUBLIC_BUYER_PORTAL_URL`). **The login is shared:** the
  httpOnly session cookie is readable by every portal — automatically on
  localhost (cookies aren't scoped by port), and via `SESSION_COOKIE_DOMAIN`
  (e.g. `.marketbase.com`) in production. Each portal still has its own
  `/login` for people who arrive there directly.
- **Auth is a dialog, never a page.** Log in = sign up, all in
  `AuthDialogProvider` (`@acutehimanshu/web/components/auth-dialog`, in each
  portal's root layout): views `sign-in` (social buttons, then tabs
  One-time code | Password), `forgot` (emailed code → new password) and
  `profile` (name + country for a new account). Open it with
  `useAuthDialog().open({ view, from })`, or `<AuthLink href>` for a link
  that needs login (guests get the dialog, then go to `href`). It stays on
  the current page unless `from` says otherwise. Redirects (the buyer
  `proxy.ts`, `/login`, `/welcome`) point at `/?auth=<view>&from=<path>`
  (`authUrl` in `apps/buyer/src/lib/login-required.ts`); the dialog opens
  from those params and tidies them out of the URL. The seller portal's
  `/login` and `/welcome` show the dialog in `required` mode over a
  backdrop (the whole portal needs login).
  - Every sign-in goes through a portal route that puts the backend's
    token in the httpOnly cookie (`sessionExchange` in
    `@acutehimanshu/web/routes/session-exchange`): `/api/auth/verify` (code),
    `/api/auth/password`, `/api/auth/reset`, `/api/auth/social`.
  - **Passwords are optional, in addition to codes** (`Me.hasPassword`,
    `passwordProblem` in `@acutehimanshu/core/domain/auth`); set via
    `POST /me/password` or "Forgot password?".
  - **Google, Apple and Facebook buttons always show**
    (`SocialSignIn`); without `NEXT_PUBLIC_GOOGLE_CLIENT_ID` /
    `NEXT_PUBLIC_APPLE_CLIENT_ID` / `NEXT_PUBLIC_FACEBOOK_APP_ID` they say
    "coming soon". The CSP opens a provider's hosts only when its key is set.
- **Settings** (buyer, account module): `/account/profile`, `/account/addresses`,
  `/account/security` and `/account/delete` share one layout with a tab row
  (`app/(buyer)/account/(settings)/layout.tsx`, `SettingsTabs`); the
  Notifications tab points at the notifications module's page.
  - **One address book:** `apps/buyer/src/lib/addresses.ts` (api +
    `addressKeys`) is used by both checkout and Settings › Addresses, so
    they share a cache. `AddressForm` is in `@acutehimanshu/web` because the
    seller's return address uses it too.
  - `SecuritySettings` and `DeleteAccount` are in `@acutehimanshu/web`; the seller
    portal's settings link to the buyer's for them (one account). Deleting
    is blocked while orders or payouts are open (`GET /me/deletion`).
  - Sellers have an optional `returnAddress` (Seller settings); without it
    returns go to the pickup address.
- **Skip for now:** Start selling can be skipped with just a shop name
  (`POST /me/seller/onboarding/skip`). Such sellers (`Me.sellerSetupComplete`
  / `SellerProfile.setupComplete` false) see `SetupBanner` on every seller
  page and can save drafts only; `/start` becomes "Finish setting up". The
  backend refuses publishing and quoting with `code: "setup_incomplete"`.
- **Quick sell** (`QuickSell` in `@acutehimanshu/web`): a floating button on every
  buyer page (when the `selling` module is on) and seller page (`listings`
  on) → one dialog: log in if needed, name a shop if not selling yet (the
  skip call), then photo, title, category, condition, price and package
  size. Set-up sellers publish; others save a draft. Toasts sit at the top
  so they don't cover the button.
- **Local pickup:** a listing's `fulfilment` is `delivery` (default),
  `pickup` or `both` (`methodsOf`/`sharedMethods` in
  `@acutehimanshu/core/domain/listings`). At checkout the buyer chooses per seller
  (`methods` on quote and pay); pickup costs no delivery. Pickup orders go
  `paid` → `ready_for_pickup` → `delivered` (label "Collected" —
  `orderStatusLabel`, `OrderStatusBadge`'s `fulfilment`) → `completed`; the
  seller confirms collection with the buyer's 4-digit code, which only the
  buyer's order view carries.
- **Seller menu layout:** `SellerProfile.menuLayout` ("top" | "sidebar"),
  chosen in Seller settings. The `(portal)` layout reads it through
  `getSellerProfile()` (`apps/seller/src/lib/seller-api.ts`, cached per
  request, so pages can share the same fetch); the sidebar shows from `md`
  up, phones keep the scrolling row.
- **Site content** (`@acutehimanshu/core/domain/site-content`, admin › Content):
  the footer (`SiteFooter` in `@acutehimanshu/web`, every portal; the legal column
  is always added) and the home page (banners, sections, category tile
  order). Portals read them with `getFooterContent` / `getHomeContent`
  (`@acutehimanshu/web/api/content`), which fall back to the defaults when the
  backend can't be reached, so static pages still build. Admin links are
  `/path` or `https://` only (`isAllowedHref`).
- **Help centre and search & sharing** (admin › Content, batch 19a): `/help`
  reads `getHelpContent()` (published topics only; `@acutehimanshu/core/domain/help-content`),
  and the fixed pages (home, sell, deals, help, shops, blog, legal) build their
  metadata with `withSeo(key, ownMetadata)` (`@acutehimanshu/web/api/content`,
  keys in `SEO_PAGES`) so the team's title, description and share image
  replace the page's own. A new fixed public page gets a `SEO_PAGES` entry
  and `withSeo`. The sitemap lists every shop with something on sale.
- **Blog** (buyer `blog` module, admin › Content › Blog): posts are plain
  text rendered by `blogBlocks` (`@acutehimanshu/core/domain/blog`) — never HTML.
  `/blog` and `sitemap.ts` read the backend per request so a new post shows
  at once; a post page is cached for 5 minutes. Admin uploads covers with
  `api.upload` (`apps/admin/src/lib/api.ts`, multipart).
- **Shop profiles** (`@acutehimanshu/core/domain/shop-profile`; seller module
  `shop-profile`, buyer `ShopPage` in `seller-profiles`, admin module
  `shop-profiles` for trust & safety). Bio for everyone; everything else is
  the `shopProfile` package perk and `/shop/{slug}` the `customShopUrl` perk
  — no credits route. No phone numbers or emails anywhere
  (`contactDetailsProblem`, checked by form and backend). The backend sends
  `SellerPublicPage.profile` already filtered by perk and moderation; don't
  re-gate in the UI. `ShopPage` takes a `renderListings` prop so the catalog's
  grid is passed in by the page (modules don't import each other).
- **Charts** (`@acutehimanshu/ui/components/charts`: `TimeSeriesChart`,
  `CategoryBarChart`, `MonthlyColumnChart`, `RangePicker`) on shadcn's
  `chart` (recharts). Series colours are the theme's `--chart-1..5` in fixed
  order — validated for colour blindness and contrast in light and dark;
  re-validate if you change one, and use at most three together. One axis
  per chart (two units → two charts); every chart has a "Show as table"
  view and an `aria-label`; text never wears a series colour. Stats come
  from `GET /me/seller/stats` and `GET /admin/stats` (range in the URL).
- **Buyer header:** a browse row under the top bar — `CategoryMenu`
  (categories fetched in the browser so the header stays static) plus every
  module's `header` nav link (Deals, Featured shops, Request an item, Blog,
  Help, by `order`). `SellLink` says "Start selling" (→ `/sell`) to
  non-sellers and "Your shop" (→ seller portal) to sellers.
- **Who's a seller:** `getCurrentUser()` (`@acutehimanshu/web/auth/session`)
  calls the backend's `GET /me` (cached per request) → `Me` with
  `isSeller`. The seller portal's `(portal)` layout sends non-sellers to
  `/start`, and every seller page fetches through `getSellerApi()`
  (`apps/seller/src/lib/seller-api.ts`), which does the same check first —
  **layouts and pages render concurrently in Next**, so a page can't rely
  on its layout's redirect having happened. `GET /api/auth/session`
  returns `{ loggedIn, isSeller }` for client components (and clears a
  cookie the backend no longer accepts).
- **Login required:** in the buyer portal only for `/account/*`,
  `/checkout`, `/requests/*` and `/welcome` (`apps/buyer/src/proxy.ts`) —
  browsing, product pages and `/cart` stay public, people log in when they
  act. Keep `robots.ts`'s disallow list in sync with that matcher. The
  seller portal requires login everywhere except `/login` and is never
  indexed.
- **Placeholders:** pages whose feature isn't built yet render
  `PagePlaceholder`, which lists what the page will hold (a checklist from
  the product plan). Real so far: log in/sign up, the buying path (home,
  search, category, product, cart, checkout, orders) and the seller portal
  (Start selling, dashboard, listings with photos and stock, orders with
  labels, payouts, settings), plus offers and buyer requests (RFQ) on both sides —
  accepted offers and quotes are held in the cart — and after delivery:
  problem reports (buyer reports, seller answers, Marketbase decides the rest),
  ratings and public seller pages (`/sellers/[id]`), notifications (a
  header bell and inbox per portal, settings in the buyer account), and
  subscriptions and credits (Plan & credits in both portals, admin
  Subscriptions), and saved items (a heart on cards and product pages,
  `SaveButton` in the buyer's `src/components` because the catalog module
  shows it). No page is a placeholder any more, so `PagePlaceholder` was
  deleted as this file said to.
- **Backend = contract + mock.** `docs/api-contract.md` is what the backend
  must implement. Until it exists, `apps/mock-api` implements that contract
  in memory at http://localhost:3100, and every portal's
  `NEXT_PUBLIC_API_BASE_URL` points at it. Switching to the real backend =
  changing that env var and not running the mock. **When you add or change
  an endpoint, update the contract, the mock (`apps/mock-api/src/router.ts`
  and `routes/*`) and the types in `@acutehimanshu/core` together.** The mock's
  state resets on restart; its orders advance one status per minute
  (`MOCK_ORDER_STEP_MS`) so tracking can be demoed, and E2E tests jump an
  order straight to delivered with the mock-only
  `POST /__mock/orders/{id}/deliver` (not part of the contract). Browser calls to it
  need its CORS allow-list (`MOCK_ALLOWED_ORIGINS`) to include the portal.
- **Three ways to call the backend** (all through `@acutehimanshu/web/api/client`):
  - public data → `api.get(...)` (from Server or Client Components);
  - logged-in data in a Server Component → `getUserApi(returnTo)`
    (`@acutehimanshu/web/api/server`), which attaches this request's session
    token and redirects to login without one (sellers: `getSellerApi`);
  - logged-in calls from a Client Component → `bff.get("/me/...")`, which
    goes through the portal's same-origin proxy `api/bff/[...path]`
    (attaches the httpOnly token; forwards only `/me/*`).
- **Shared route handlers:** a portal's `src/app/api/**/route.ts` files are
  one-line re-exports of `@acutehimanshu/web/routes/*`. Fix auth or BFF behaviour
  in the package, never in one portal's copy.
- **The cart** has one hook, `useCart()`
  (`apps/buyer/src/modules/cart/use-cart.ts`), hiding guest
  (localStorage, `guest-cart.ts`) vs logged-in (backend). `GuestCartMerger`
  in the buyer layout moves a guest cart into the account after login.
  Every cart change returns the backend's recomputed `Cart`, written
  straight into the query cache.
- **Listing photos** go through `ListingImage` (`@acutehimanshu/ui`), which skips
  Next's optimizer unless the photo's host is in its
  `OPTIMIZED_IMAGE_HOSTS` list (empty for now). next/image throws on an
  unconfigured host and refuses localhost entirely, so uploads served by
  the mock/backend must stay unoptimized. When real photos come from a CDN,
  add its host to that list AND to `images.remotePatterns` in each portal's
  `next.config.ts` AND to CSP `img-src`.
- **Seller forms' rules** live beside them, component-free, so they're
  unit-tested: `listing-form-schema.ts` (price typed in major units →
  Money, custom package dimensions, detail rows) and
  `seller-shop-schema.ts` (seller `modules/listings` and `modules/settings`).
- **Domain types** for the agreed flows live in `@acutehimanshu/core/domain/*`
  (listings, inventory, cart, offers, rfq, orders, returns, reviews,
  notifications, seller, categories) plus `types/money.ts` and
  `types/address.ts`. Money is integer minor units (paise/cents), never a
  float. `Listing.saleType` is only `"fixed_price"` today; auctions are the
  planned extension, so don't hard-code fixed pricing where a listing is
  read.
- **Subscriptions and credits** (`@acutehimanshu/core/domain/subscriptions`, charged through the payments layer since batch 15,
  contract "Subscriptions and credits"). Hybrid and optional: packages
  (monthly/yearly) set limits and include monthly credits, and **credits
  work without any package** — every limit can be lifted with credits or by
  upgrading, so never build a flow where subscribing is the only way out.
  Buying and selling have separate packages and balances. Everything —
  packages, prices per country, limits, perks, features, credit packs,
  credit costs — is edited in admin; never hard-code a number from it.
  - **The live switch** (admin: master + buyer + seller) is a backend
    setting, not the build-time module switch. Off = no limits, nothing
    costs credits, and the portals hide Plan & credits
    (`useSubscriptionsOn`) and promote/boost buttons (they read
    `Entitlements.enabled` and `costs`).
  - **Limited actions answer 402 with a `CreditGate`.** Run them through
    `useGatedAction` + `<CreditGateDialog>` (`@acutehimanshu/web`): the dialog
    offers "Use N credits" (retries with `payWithCredits: true`), buying
    credits, or the packages. Today: publishing/resuming a listing past
    the limit, quotes past the monthly limit, requests past the open limit.
  - `<PlanAndCredits side>` (`@acutehimanshu/web`) is the whole Plan & credits
    page for both portals; `<PlanCard>` (`@acutehimanshu/ui`) is the pricing
    card, also the admin preview. Entitlements always refetch on mount.
  - The mock simulates billing (every charge succeeds); real recurring
    billing comes with the payment partner.
- **Admin-configurable rules** (hold durations, offer rounds, ship-by,
  problem window, platform fee) are `MarketplaceSettings` in
  `@acutehimanshu/core/marketplace-settings` — the **global** values. Since batch
  19b a **rule** (`@acutehimanshu/core/domain/rules`, admin › Settings › Rules) can
  change one for a country, category, seller type or seller, from a date
  (never backdated); the most specific rule in force wins (`resolveRule`).
  The backend works out the value for each listing, request or order — the
  portals still show the global `GET /settings` values in their copy. An
  order stores its `rules` snapshot when placed and is worked out from it
  for good (ship-by, problem window, reply deadline, fee); an admin can
  change one rule on one order (a big action). In the mock use
  `ruleValue(key, listingContext(listing))` and friends
  (`apps/mock-api/src/rules.ts`) — never read `db.settings.limits` directly
  for a buyer's or seller's value. Never hard-code these numbers in a
  component.
- **Payments** (batch 15, admin › Settings › Payments): any number of
  gateways, ordered per country. Adapters live in `packages/payments`
  (`stripeConnect`, `testGateway()`, `createCheckoutWithFailover`,
  `verifyStripeSignature`; plain fetch, no SDK — the Node backend uses the same
  code). **Failover only before money moves**; each order keeps its `gateway`
  for refunds, payouts and disputes. **Card details only on the gateway's
  hosted pages** (Stripe Checkout, card setup, Express onboarding) — never in
  our forms; we keep only references. `POST /me/checkout/pay` answers `next`:
  `complete`, or `redirect` to the gateway (back to `/checkout/return`).
  Buyers manage cards in Settings › Payment methods; sellers set up payouts in
  Seller settings › Payouts. The mock simulates real gateways unless
  `MOCK_SEND_REAL=1`; a Test gateway is the default. Refunds
  (`refundThroughGateway`) and seller transfers (`transferToSeller`, when the
  ledger pays out) go through the order's gateway.
- **Email and SMS** (batch 20, admin › Settings › Messaging): any number of
  providers per channel, ordered globally and per country, with fallback.
  Adapters live in `packages/messaging` (plain TypeScript, no SDKs, `fetch`
  passed in — the Node backend uses the same code): `ADAPTER_IMPLEMENTATIONS`
  (Twilio, SendGrid, Resend), `testOutbox`, `sendWithFallback`. A new
  provider = an adapter there + an `ADAPTER_INFO` entry in
  `@acutehimanshu/core/domain/messaging`. Keys are write-only (last 4 shown) and
  never reach a portal, log or audit entry. The mock sends notifications
  (per preferences) and login codes through `deliver()`
  (`apps/mock-api/src/messaging.ts`); real providers dry-run unless
  `MOCK_SEND_REAL=1`, and a Test outbox catches everything by default. Tests
  never send for real: adapter tests use a fake fetch; mock tests await
  `flushDeliveries()`.
- **Ledger** (batch 19c, admin › Payouts › Ledger, finance): append-only money
  record (`@acutehimanshu/core/domain/ledger`). Each entry moves a positive amount
  between Marketbase's books; `totals.difference` is 0 when they balance. Never
  edit or delete an entry — manual adjustments and reversals of adjustments
  are new entries (big actions). The mock writes entries from order events on
  each read (`syncLedger`, `apps/mock-api/src/ledger.ts`); payout holds and
  releases post markers.
- **Reports and CSV** (batch 19c, admin module `reports`): six reports are
  tables (`Report`: columns + rows) built by the backend; `toCsv`
  (`@acutehimanshu/core/domain/reports`) makes the CSV (BOM, CRLF, formula text
  defused). Each report follows its section's access; scheduled runs are kept
  for download until there's an email provider. Main lists export with
  `<CsvButton path filename>` (`src/components/csv-button.tsx`, uses
  `downloadCsv`) against `/admin/<list>/export`. In the mock, export routes
  are registered before the list routes so `/export` isn't read as an id.
- **Country Master** (batch 19b, admin › Settings › a country):
  `CountryProfile` (`@acutehimanshu/core/domain/country-profile`) — status
  (live/pilot/coming soon/off), buyer sign-up and selling switches,
  cross-border, currencies, time zone, tax label/rate (a placeholder until the
  tax partner), support, partner slots, and its own legal pages
  (`/legal/{slug}?country=`, falling back to the global text; the buyer
  legal page renders per request in the viewer's country). `GET /countries`
  leaves out `off` countries; profile pickers list only `buyersCanRegister`.
- **Admin portal** (`apps/admin`, :3400) — the Marketbase team's tool. **A
  plain React single-page app (Vite + React Router + TanStack Query), not
  Next.js**: no server, no SEO, builds to static files (`dist/`) served with
  an index.html fallback. So the Next-only sections of this file (Server
  Components, proxy.ts, next/font, next/image, route handlers) don't apply
  there. Don't add admin screens to the buyer or seller apps.
  - **Env:** `VITE_API_BASE_URL`, `VITE_MODULES_OFF/ON`, read only in
    `src/lib/env.ts` and inlined at build time (rebuild after a change).
  - **Session = a cookie the backend sets.** With no server of our own, the
    backend sets an httpOnly, SameSite=Strict `marketbase_admin` cookie
    (`Path=/admin`, 8 hours) at login, and every call in `src/lib/api.ts`
    sends it with `credentials: "include"`. The token never reaches our
    JavaScript. Never put an admin token in localStorage or a JS-readable
    cookie. Admin accounts and sessions are separate from the marketplace
    ones.
  - **Login:** two tabs side by side, Password | One-time code
    (`src/components/login-form.tsx`); the email carries across. The backend
    answers unknown emails exactly like known ones.
  - **Screens live in their module** (`src/modules/<id>/page.tsx`, loaded
    lazily through the manifest's `load`), and each module owns everything
    under its route (`/users/*`): sub-pages are the module's own `<Routes>`.
    `src/router.tsx` only mounts enabled modules, so a switched-off module
    is simply "Page not found".
  - **One super admin, sub-admins with per-section access.** Each manifest
    names its `section` (`AdminSection` from `@acutehimanshu/core/domain/admin`,
    or `"super"` for settings/admins/activity, `"any"` for the dashboard).
    A sub-admin's `permissions` give each section No access / View only /
    View and act, set by the super admin (`PermissionsEditor`). The sidebar
    shows what's on AND not "none" (`sidebarFor`); `ModuleScreen` shows "You
    don't have access" outside it, and on View only provides the level
    (`useCanAct()`, `ModuleAccessContext`) with a banner — `ReasonDialog`
    renders nothing then, so every action button disappears without each
    screen checking. That's presentation only: **the backend checks access on
    every `/admin/*` call** (mock: `requireAccess`, from the URL and method).
  - **Activity log** (super admin only, `ActivityLog`, module `activity`
    and each admin's page): everything from login to logout, kept 90 days.
    The mock logs it in one route hook (`apps/mock-api/src/admin-activity.ts`)
    plus the login/logout routes — a new admin endpoint is logged
    automatically; give `recordName` a case if its records need a readable
    name. Sub-admins see record `history` only in
    `SHARED_HISTORY_SECTIONS`.
  - **Big actions need an internal note** (deletes, suspensions, refunds and
    cancellations, dispute decisions, payout holds, take-downs, price/limit
    and credit changes, marketplace settings — the list is
    `apps/mock-api/src/big-actions.ts` and the contract's "Big actions"
    table). Pass `noteRequired` to `ReasonDialog`; its
    `onConfirm(reason, note)` sends `note` with the reason. The note is admins-only: never put it
    in anything a user sees. A new big action = a rule in that file, a row in
    the contract, and `noteRequired` on its dialog.
  - **Before/after values** (BRD §6.2): a configuration change records
    `changes: FieldChange[]` on its audit entry (and the request's activity
    entry) — work them out with `diffChanges(before, after)`
    (`@acutehimanshu/core/domain/audit-changes`) and pass them to the mock's
    `audit()`. `ChangeList` (`src/components`) shows them in record history,
    the audit log and the activity log. Status actions (suspend, refund…)
    don't carry changes; their reason and note say it.
  - **Internal notes** (`InternalNotes kind id`, `src/components`): an
    append-only thread on orders, users, sellers, disputes and payouts, under
    each record's own path (`/admin/{kind}/{id}/notes`), so section access
    applies.
  - Data: TanStack Query with the `api` client; a 401 from any query clears
    the admin and `RequireAdmin` sends them to /login. Shared UI comes from
    `@acutehimanshu/ui` — keep it framework-free (next/link etc. only in
    components the admin never uses; `StatCard` takes a `linkAs`, e.g.
    `RouterLink`).
  - **Screens (step 5):** seller verification and listing moderation
    (trust & safety), users (trust & safety, operations), orders and
    disputes (operations), payouts (finance), categories and content
    (content), settings and admin accounts with the audit log (super
    admin), subscriptions (finance: switches, packages, credit packs,
    credit costs, subscribers), reviews moderation (trust & safety),
    notification templates (content: the wording of every message, from
    `NOTIFICATION_TEMPLATES` in `@acutehimanshu/core`; the mock sends through
    `notifyWith(templateId, values)` — never write notification text at a
    call site), plus every admin's own `/account` (set/change password).
    Shared pieces: `ReasonDialog` (every action needs a reason, audited),
    `FilterTabs`/`SearchBox`/`Pager` (state in the URL), `AuditHistory`.
    Each screen owns its sub-routes (`/users/:id`).
  - Test admins (mock only), password `marketbase-admin-test`: admin@ (the super
    admin), ops@, trust@, finance@, content@ `marketbase.test` (sub-admins with
    the matching `PERMISSION_PRESETS`).
- **International by design — never assume one country.** Country
  (`CountryCode`, ISO 3166-1) decides currency, tax and consumer rules.
  Tax is calculated per order by a tax partner via the backend and arrives
  as `Order.taxLines` — never compute tax, pick a rate, or format a price
  with a fixed currency in the frontend. Addresses use the international
  `Address` shape (optional region, free-form postal code), plus each
  country's own rules from `@acutehimanshu/core/address-rules` (`addressRulesFor`:
  labels, state list, postcode format, phone example, tax-number name;
  `addressProblems` for validation — forms and the mock both use it).
  **Launch country: Australia** (AUD, GST 10% included, states, 4-digit
  postcodes, ABN); other countries are configured but closed for selling.
- **Dates and time zones** (batch 19a): timestamps are UTC; show them in the
  viewer's zone with `formatInZone(iso, pattern, timeZone)`
  (`@acutehimanshu/core/dates`) — never plain `format()`, which uses the
  server's zone. The zone: `Me.timeZone` (their own choice in Settings ›
  Profile, else their country's `SupportedCountry.timeZone`). Server
  Components: `await getUserTimeZone()` (`@acutehimanshu/web/auth/session`);
  Client Components: `useTimeZone()` (`@acutehimanshu/web/auth/use-session`,
  from the session status, default until it loads so hydration matches);
  shared UI takes a `timeZone` prop. Public pages showing a calendar date
  (blog, legal, reviews) use the default zone. Admin screens use the
  admin's browser zone. Plain calendar dates ("2026-10-12", chart days)
  aren't instants — don't convert them.
- **Translations** (batch 19a, `use-intl`): text that has moved off the
  screens lives in `packages/ui/src/messages/en-AU.ts` and is read with
  `t("problem.escalated")` from `@acutehimanshu/ui/i18n` (keys type-checked; ICU
  `{value}`, `select`, `plural`). `t` is a plain function, so it works in
  Server and Client Components, the admin SPA and module manifests. Moved so
  far: every menu label (`nav.*` in the manifests) and the shared
  components in `@acutehimanshu/ui`. Write new shared text there; move a screen's
  text when you next work on it. Only en-AU exists; a second language is a
  file with the same keys in `MESSAGES` plus per-request locale selection.
- **Inventory:** stock is held only while paying (`checkoutHoldMinutes`) and
  for accepted offers/quotes (`acceptedHoldHours`) — never for a cart. A
  paid order sells stock; cancellation, refund or an expired hold returns
  it. Use `canBuy`/`isSoldOut` (`@acutehimanshu/core/domain/listing-stock`) to gate UI; the
  backend re-checks.
- **Returns:** an agreed return (seller or Marketbase) is `return_in_transit`
  with the decision recorded, but **the refund goes out only when the item
  is back** — the seller's "Mark return received", or admin closing a stuck
  return (`settleReturn` in the mock). Delivered orders complete when the
  problem window closes with nothing reported, which pays the seller.
- **Order actions** are gated by `@acutehimanshu/core/domain/order-rules`: buyer cancels
  only before the label is printed, seller only before shipping, problems
  only within the window after delivery, one rating per completed order.
  Business sellers follow the buyer's country's consumer law on returns;
  private sellers take no change-of-mind returns.
- **Product rules worth knowing before building a feature:** Buy Now adds to
  the cart and opens it; the cart groups items per seller (each ships and is
  paid separately); one checkout payment becomes one order per seller;
  offers have limited rounds and an accepted offer holds the price;
  "Request an item" (RFQ, `@acutehimanshu/core/domain/rfq`) quotes are visible only to the
  requesting buyer, and an accepted quote enters the cart like an accepted
  offer. Open business decisions (partners, fee, countries, limits) are
  tracked in the project's decisions document, outside this repo.

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (Base UI primitives, not Radix — see below)
- TanStack Query for all server/remote state
- react-hook-form + zod for forms and validation
- Vitest + React Testing Library for tests
- date-fns for date formatting/math — never hand-roll date arithmetic
- pnpm as the only package manager (commit `pnpm-lock.yaml`, never `package-lock.json`/`yarn.lock`)

Known gap: shadcn's `form` wrapper component is not yet published for the
`base-nova`/Base UI style (confirmed empty in the registry as of this
project's setup). Build forms by composing `Label` + `Input`/`Textarea`/
`Select` + `Button` directly with `useForm`/`Controller` from
react-hook-form. Re-check `pnpm dlx shadcn@latest add form` periodically —
add it properly once shadcn ships it, don't hand-roll a permanent
replacement.

## Theming

`packages/ui/src/styles/globals.css` is the single source of truth for color. Every
`components/ui/*` primitive reads its colors from the CSS variables defined
in its `:root` (light) and `.dark` blocks — nothing is hardcoded per
component. **To rebrand a project copied from this template**, change only
the lines marked `/* brand color */` in both blocks (`--primary`,
`--primary-foreground`, `--ring`, and the `--sidebar-primary*`/
`--sidebar-ring` equivalents) — that alone repaints every button, link,
focus ring, and active state across the whole app. Leave
`background`/`foreground`/`card`/`popover`/`secondary`/`muted`/`accent`/
`border` as the neutral grayscale they are unless you're deliberately
restyling the neutral palette too, not just the brand color. `chart-*` is
the validated chart palette (see "Charts" above) — change it only by
re-running a colour-blindness check on the new set.
Colors are OKLCH (`oklch(L C H)`): lightness 0–1, chroma (0 = gray, higher
= more saturated), hue angle in degrees — a color picker like
[oklch.com](https://oklch.com) converts a hex brand color to this format.
The current values are a placeholder blue, not a real brand color.

**When picking a brand color's dark-mode lightness, check contrast, don't
just eyeball it or follow "make it a bit lighter" convention.** This
template's dark-mode `--primary` was originally lighter than light mode's
(a common dark-UI convention), which looked fine but only reached 3.24:1
contrast against white button text — below WCAG AA's 4.5:1 minimum for
normal text. Caught by the `e2e/accessibility.spec.ts` dark-mode axe scan,
not by eye; fixed by matching dark mode's lightness to light mode's rather
than guessing a new value, then re-running the scan to confirm rather than
trusting the arithmetic. If you pick a real brand color, run
`pnpm test:e2e --grep Accessibility` after — a color that passes in light
mode is not guaranteed to pass in dark mode against the same text color.

**`--primary` cannot safely be both a solid background color and a
text-on-page color at once** — this is a real, computed limitation of the
current placeholder hue (263°), not something more brand-color tuning
fixed. It needs to be light enough to read as text on the dark-mode page
background (`oklch(0.145 0 0)`) but dark enough to hold white text as a
button background — those pull in opposite directions, and at this hue no
single lightness clears WCAG AA (4.5:1) for both simultaneously (checked
by computing actual contrast ratios across the lightness range, not
guessed). Fixed the two places this repo currently uses `--primary` as
body-text color (`page.tsx`, `not-found.tsx`) by switching them to
`text-foreground` — always safe, brand-color-independent. **Button's and
Badge's `variant="link"` still use `text-primary` as text color** and are
deliberately left that way (they're generic primitives; a real project's
actual brand color might not share this hue's specific problem) — but
don't assume they're safe. If you use `variant="link"` anywhere, or pick a
new brand color, run the accessibility scan in dark mode specifically.

## Typography

- Use `Heading` (`@acutehimanshu/ui/components/heading`) for every page-level heading
  instead of a hand-written `<h1 className="text-2xl font-semibold...">` —
  it takes a `size` (`h1`/`h2`/`h3`) and an optional `as` prop when the
  visual size and the semantic element need to differ. Use `Text`
  (`@acutehimanshu/ui/components/text`) for body copy (`variant`: `body`/`muted`/
  `lead`) instead of repeating `text-sm text-muted-foreground` per file.
  Same rationale as `PageContainer`: one owned place instead of copy-pasted
  class strings that quietly drift.
- These are plain presentational components (no logic beyond class
  composition) — no dedicated test needed, consistent with `PageContainer`.
- **`CardTitle`** (`components/ui/card.tsx`) **renders a plain `<div>`, not
  a semantic heading** — it has no `role="heading"` and isn't an `h1`-`h6`.
  Found via an E2E test's accessibility-tree snapshot showing `text: ...`
  instead of `heading: ...` for `not-found.tsx`'s title, which had used
  `CardTitle` alone since before `Heading` existed. If a `Card`'s title is
  a page's actual (only) heading, wrap it in `Heading` too (see
  `not-found.tsx`/`error-fallback.tsx` — `<Heading as="h1" size="h3">`
  inside `CardHeader`) rather than leaving `CardTitle` to carry it alone.

## Fonts

Fonts are loaded via `next/font/google` in each portal's `src/app/layout.tsx` (self-hosted
and optimized by Next, not a runtime Google Fonts request) and wired to
Tailwind's `font-sans`/`font-mono`/`font-heading` utilities through
`@theme inline` in `globals.css`. Three are loaded: Geist (body/`font-sans`),
Geist Mono (code/`font-mono`), and Lexend (headings/`font-heading`, used by
the `Heading` component) — two distinct fonts on purpose, to prove the
per-token wiring actually works rather than leaving it unverified.

**To add or swap a font:** import it from `next/font/google` in
`layout.tsx`, give it a `variable` (e.g. `--font-whatever`), add
`<fontVar>.variable` to the `<html>` `className`, then point the matching
`@theme inline` token at it in `globals.css` (`--font-sans`,
`--font-mono`, or `--font-heading`).

**Known-fixed footgun, don't reintroduce it:** `@theme inline` tokens must
point at the _actual_ `next/font` variable name (e.g.
`--font-sans: var(--font-geist-sans)`), never at themselves
(`--font-sans: var(--font-sans)`). The self-referential form looks
plausible and causes no build error, but resolves to nothing at runtime —
this shipped that way from the initial scaffold and silently rendered the
entire site in the browser's serif fallback (Times New Roman) for a while
before being caught by checking `getComputedStyle(document.body).fontFamily`
in a live browser, not by reading the CSS. If a font change doesn't visibly
apply after editing `layout.tsx`, check this first.

## Images

Use `next/image` (from `"next/image"`), never a plain `<img>` — it handles
responsive sizing, lazy loading, and format conversion automatically.
`sharp` is installed for this (needed for production image optimization on
a self-hosted/Docker deployment; Vercel handles it at the platform level
regardless, but don't assume every deployment target is Vercel). See
`apps/buyer/src/components/buyer-nav.tsx`'s logo for the reference pattern — a static local
asset with explicit `width`/`height` and `priority` (it's above the fold).
It's hidden below the `sm:` breakpoint — adding it to the mobile nav's
width budget reintroduced the exact wrapping bug already fixed twice (see
"Component sizing" above); re-verify at 375px before adding anything else
to `Nav`, don't assume it still fits.

`public/logo.svg` is a placeholder — replace it with a real logo for a
real project. It's a flat SVG with a hardcoded color, not tied to the
brand-color system in `globals.css` (a static asset file can't read a CSS
variable) — if you change the brand color, update this file to match by
hand, or replace it with a real brand asset entirely.

## SEO

- The buyer portal's `src/app/robots.ts` and `src/app/sitemap.ts` generate `/robots.txt` and
  `/sitemap.xml`. `sitemap.ts`'s route list is hand-maintained, not
  derived from the route tree — add a new page to it only once it's meant
  to be **publicly indexed**; keep auth-gated and API routes out of both
  files (see `/account`'s exclusion in both as the reference). The seller
  portal disallows everything and sets `noindex`.
- Every route's `<title>` should come from a page-level `export const
metadata: Metadata = { title: "..." }` (or `generateMetadata()` if the
  title depends on route params/fetched data) — never a hand-written
  `<title>` tag. The root layout's `title.template` turns a plain
  `"My orders"` into `"My orders | Marketbase"`
  automatically; don't repeat the site name in a page's own title.
- `SITE_URL` (each portal's `src/lib/env.ts`) is the one place the deployed origin is
  configured — `sitemap.ts`, `robots.ts`, and the root layout's
  `metadataBase` all read it. Set the real value in production; it
  defaults to the portal's local URL (:3200, :3300).

## Security headers

`next.config.ts`'s `headers()` sets CSP, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, and a locked-down default
`Permissions-Policy` on every response.

**Deliberately not using nonce-based CSP** (Next's own recommended
stricter pattern, generating a nonce in `proxy.ts` per request). That
approach requires **every page to be dynamically rendered** — no static
generation, no ISR — which would silently undo the static generation of
`/_not-found` and other static pages (see "Data fetching" above). The CSP here is Next's documented
alternative for apps that don't need nonces: `'unsafe-inline'` for
`script-src`/`style-src` instead of a nonce. It's weaker against XSS than
the nonce version, but doesn't force the whole app into dynamic rendering.
Reach for nonces instead only if a specific page's security requirements
genuinely justify losing static generation for it.

`connect-src` includes `NEXT_PUBLIC_API_BASE_URL` — if you add a call to a
**second** external host anywhere in the app, add it here too, or the
browser will silently block that fetch (check the console for a CSP
violation, not a normal network error, if a fetch mysteriously fails after
this file changes).

## Folder structure

```
apps/<portal>/src/
  app/                 routes only (layout, page, route handlers) — no business logic
  components/          this portal's own layout pieces (nav, header, menus)
  modules/<id>/        one feature, colocated (see "Every feature is a module"):
    module.ts          manifest: routes, nav links, sitemap, dependencies
    api.ts             thin wrappers around `api`/`bff` from @acutehimanshu/web
    keys.ts            TanStack Query keys
    use-<name>.ts      TanStack Query hooks
    <name>.tsx         components
    <name>.test.tsx    tests
  modules/index.ts     the on/off switchboard; modules/types.ts the ids
  lib/
    env.ts             this portal's own env vars (the only process.env reads)
  proxy.ts             switched-off modules → 404, then the login check
packages/
  core/src/            domain types and rules (no React, no Next)
  ui/src/components/   design system; ui/ holds shadcn primitives — don't
                       hand-edit beyond shadcn's own customization points
  web/src/             shared Next plumbing (api, auth, routes, env)
```

New features get a new module under the owning portal's `src/modules/`.
Don't add a feature's logic to `src/app/**` beyond the page/layout wiring
that renders it.

## Components

- Server Components by default. Add `"use client"` only when you need state,
  effects, or browser-only APIs — push it as low in the tree as possible.
- One component per file, named exports, PascalCase component name matching
  a kebab-case filename (`account-menu.tsx` exports `AccountMenu`).
- Compose from `components/ui/*` rather than rebuilding primitives.
- Dropdowns in forms: `NativeSelect` (`@acutehimanshu/ui/components/native-select`) —
  works in plain GET forms, gets the phone's own picker, and registers
  directly with react-hook-form. Form rows: `FormField` + `describedBy()`
  (`@acutehimanshu/ui/components/form-field`) for label, error and hint wiring.
- Name controls that repeat per row (Remove, Save stock, Pause…) with an
  `aria-label` that starts with the visible word ("Remove Kindle"), not a
  visually-hidden `sr-only` span — jsdom and some tools leave `sr-only` text
  out of the accessible name.
- `buttonVariants()` (for links styled as buttons) merges its classes with
  `cn()` — a local change to the shadcn file; without it outline-style links
  lost their border. Keep it if shadcn regenerates `button.tsx`.

## Component sizing

`Button`, `Input`, `Textarea`, and `SelectTrigger` all take a `size` prop
(`sm`/`default`/`lg`, plus `xs`/icon sizes on `Button`) — pick one per call
site instead of overriding height/padding with a one-off `className`.
`Badge` also takes `size` for visual scale, though it isn't a touch target.

The actual dimensions behind each size name live in **`packages/ui/src/styles/sizes.css`**
as CSS custom properties (`--size-control-*`, `--size-icon-*`,
`--size-badge-*`, `--size-textarea-*`), imported into `globals.css`.
Components reference them with Tailwind's arbitrary-value syntax
(`h-[var(--size-control-default)]`) — **never a raw `h-10`/`size-8`/etc.**
To change how big every button/input in the app is, edit `sizes.css`, not
the component files.

That file is also where mobile-vs-desktop responsiveness lives:
`default`/`lg` are bigger on mobile (`:root`, mobile-first) than on
desktop (overridden in a `@media (min-width: 640px)` block, matching the
values already shipped and verified) — since those are the sizes most
components use without a second thought, and mobile needs the full ~44px
touch-target guideline where desktop's mouse precision doesn't. `sm`/`xs`
are deliberately **constant** across viewports: choosing a compact size
(e.g. `LogoutButton` in `Nav`) is an intentional per-instance decision, and
letting it silently grow back on mobile is what broke `Nav`'s mobile
layout twice before this file existed — don't reintroduce that by making
`sm` viewport-responsive.

Scope, deliberately: this only covers dimensions (height/size/min-height).
Padding, gap, and font-size inside components stay as plain Tailwind
utilities (`px-3`, `gap-1.5`, `text-sm`) — that's already a consistent,
centralized scale via Tailwind itself, not the kind of hardcoding this
file exists to fix. Extend `sizes.css` the same way if paddings need to
become viewport-responsive too; don't hand-tune one component's instead.

## Data fetching

- All HTTP calls go through `api` (`@acutehimanshu/web/api/client`) — never call
  `fetch` directly in a component or hook.
- Client Components: wrap `api` calls in a TanStack Query hook in the
  feature's `use-*.ts` (see `src/features/example/use-todos.ts`). Never fetch
  in a bare `useEffect`.
- Server Components: call `api.get`/`api.post` etc. directly, no
  TanStack Query needed since there's no client-side cache to manage.
- Handle `ApiError` explicitly (it carries `status` and `payload`) rather
  than a generic catch-all.
- A Server Component route with no dynamic params (no `[slug]`, no
  `searchParams` usage) gets statically prerendered **at build time** by
  default — its `api.get` call runs once during `next build`, not per
  request. Fine for genuinely static content; wrong for anything backed by
  data that changes, where it silently bakes in a stale snapshot forever.
  Add `export const dynamic = "force-dynamic"` (or a bounded
  `export const revalidate = <seconds>` if periodic staleness is
  acceptable) to any such route. See `src/app/todos/page.tsx`.
- Query keys: define a `<feature>Keys` object in the feature's `keys.ts`
  (see `src/features/example/keys.ts`) with an `all` root key and derived
  list/detail/page key functions built by spreading `all`. This keeps
  related query keys addressable together via prefix matching — a mutation
  touches every variant (list, any paginated page, etc.) in one call instead
  of only the one key it happens to know about.
- After a mutation, update every cached query the `all` prefix matches with
  `queryClient.setQueriesData({ queryKey: <feature>Keys.all }, updater)`
  (see `useCreateTodo` in `src/features/example/use-todos.ts`) — **not**
  `invalidateQueries`. `invalidateQueries` forces an immediate refetch, and
  if the backend doesn't actually persist the write the mutation just made
  (jsonplaceholder's `POST /todos` returns 201 but never stores it — true of
  many placeholder/mock APIs, and worth checking for a real one too), that
  refetch silently overwrites the correct optimistic state with stale server
  data and the change appears to vanish. `setQueriesData` patches the cache
  directly with no network round-trip, so it can't be clobbered this way.
  Reach for `invalidateQueries` only once you've confirmed the backend
  reliably reflects the write on the very next read.
- `queryFn` must accept and forward TanStack Query's injected `{ signal }`
  into the feature's `api.ts` wrapper call, which forwards it to
  `api.get`/`api.post` (already accepts `signal` via
  `ApiFetchOptions`/`RequestInit`) — see
  `src/features/example/use-todos.ts`/`use-paginated-todos.ts`. Without
  this, navigating away mid-request doesn't actually cancel the in-flight
  fetch.
- A route's `loading.tsx` (see `src/app/todos/loading.tsx`,
  `src/app/dashboard/loading.tsx`) is Next's file-convention Suspense
  boundary for the SERVER-rendered navigation transition — it fires once, on
  route entry, while the Server Component's own `await` resolves. This is
  different from the inline `isLoading`-driven `Skeleton` inside a component
  (see `src/features/example/todo-list.tsx`), which covers CLIENT-side
  TanStack Query loading states (the initial fetch when there's no
  Server-Component-supplied `initialData`, or any client-triggered refetch)
  that `loading.tsx` can't cover, since it only fires once per navigation,
  not once per query. Both can coexist on the same route.

## Auth

httpOnly-cookie BFF (Backend-for-Frontend) pattern — see `packages/web/src/auth/`,
`packages/web/src/routes/*`, and each portal's `src/proxy.ts` for the
reference implementation. Follow this for any future authenticated feature
rather than inventing a new scheme.

- The external backend issues the token; Next.js owns it in an httpOnly
  cookie (`SESSION_COOKIE` in `@acutehimanshu/web/auth/session`) and client-side JS
  never reads it directly.
- Client Components needing an authenticated call use `bff` from
  `@acutehimanshu/web/api/client` — same-origin requests to the generic proxy
  `api/bff/[...path]` (`@acutehimanshu/web/routes/bff`), which reads the cookie server-side
  and forwards to the backend's `/me/*` with the token. (Login/logout/
  session keep their own `/api/auth/*` routes because they set and clear
  the cookie.) Don't add per-feature proxy routes; extend the backend's
  `/me/*` instead.
- Server Components needing auth use `getUserApi()` (`@acutehimanshu/web/api/server`)
  for backend data, or `getSession()`/`getCurrentUser()` for the session
  itself (see `apps/seller/src/app/(portal)/layout.tsx`) — no hook, no client-side fetch.
- **`BuyerNav` and the seller portal's `PortalHeader`/`SellerNav` are static Server Components — they do
  NOT call `getSession()` and must not start doing so.** Login state comes
  from each portal's `<AccountMenu />`, a Client
  Component that reads
  login state client-side via `useSessionStatus()`
  (`@acutehimanshu/web/auth/use-session`, a TanStack Query hook keyed
  `authKeys.session()` from `@acutehimanshu/web/auth/keys`), which calls
  `getSessionStatus()` (`@acutehimanshu/web/auth/api`) — a same-origin `fetch`
  to `GET /api/auth/session` (`@acutehimanshu/web/routes/auth-session`, no auth
  required to call it, returns `{ loggedIn, isSeller }`, never the token).
  This split exists specifically so routes with no auth content of their
  own (`/_not-found`, the help page) can still be statically prerendered —
  the homepage is now dynamic on purpose (`force-dynamic`: it shows live
  listings), not because of the nav —
  an earlier version had `Nav` call `getSession()` directly, which forced
  every route in the app dynamic; don't reintroduce that.
- `LoginForm`, `useLogout` and `StartSellingButton` keep `AccountMenu` in sync by writing the
  known-good value directly into the query cache on success —
  `queryClient.setQueryData(authKeys.session(), { loggedIn, isSeller })`
  — rather than calling `invalidateQueries`/refetching (the client already
  knows the outcome; no need to round-trip) or `router.refresh()` (which
  was the old, now-removed workaround for `Nav` being a Server Component —
  it isn't one for auth purposes anymore, don't reintroduce it either). This
  is a different justification than the `example`/`my-todos` features'
  `setQueriesData` bullet above (which exists because those backends don't
  durably persist the write, so a refetch would clobber correct state with
  stale data) — here `loggedIn` isn't an optimistic guess about a mutation's
  side effect, it's a fact the client has direct evidence for from the
  `login`/`logout` call that just succeeded. Same mechanism, different and
  equally valid reason; don't assume one justification implies the other.
- Protecting a route needs both: add its path to `matcher` in the portal's `src/proxy.ts`
  for a redirect-before-render guard, **and** re-check with
  `getSession()`/`redirect()` inside the protected Server Component itself.
  `proxy.ts` only checks cookie _presence_
  (`request.cookies.has(SESSION_COOKIE)`), not validity — it can't verify a
  token without a network round-trip to the backend, which doesn't belong at
  the proxy layer. Never treat `proxy.ts` as a complete guard on its own;
  its `matcher` can silently stop covering a route after a refactor.
- `@acutehimanshu/web/auth/api`'s `fetch` calls to `/api/auth/*` are the one
  sanctioned exception to "all HTTP calls go through
  `@acutehimanshu/web/api/client`" (see Data fetching above) — they're same-origin
  calls to our own BFF routes specifically so the browser auto-attaches the
  session cookie, not calls to the external backend.
- Any redirect-target query param (like `?from=`) that reaches
  `router.push` or another client-side redirect must be validated as a
  same-origin relative path first, or it's an open redirect. Use
  `safeRedirectPath()` (`@acutehimanshu/core/safe-redirect`) — don't rewrite it.
- This repo's Next.js version deprecated `middleware.ts`/`middleware.js` in
  favor of `proxy.ts`/`proxy.js` (`export function proxy` instead of
  `export function middleware`; `config.matcher` unchanged in shape).
  Always add future proxy-layer logic to the portal's `src/proxy.ts` — never create a
  new `middleware.ts`.

**Auth is real on the frontend side; only the backend is mocked.** The mock
(`apps/mock-api/src/routes/auth.ts`) issues real random codes and opaque tokens
and keeps sessions server-side, exactly as the contract describes, and
returns the code as `debugCode` so it can be used without a mailbox — the
login form shows it as a "Test mode" hint. A real backend must never send
`debugCode`; nothing else changes when it replaces the mock.

## Forms

**Disable a JavaScript-handled form's submit button until hydration**:
`const hydrated = useHydrated()` (`@acutehimanshu/ui/use-hydrated`), then
`disabled={!hydrated || isSubmitting}`. Without it, a click before React
takes over submits the form natively as a GET: the page reloads empty and
what was typed (email, phone, address) lands in the URL. Found by E2E
clicking "Start selling" in a just-opened tab.

react-hook-form + zod resolver. Validate with a zod schema, surface field
errors from `formState.errors` next to each `Label`. See "Known gap" above
re: the shadcn `form` wrapper.

## State

- Local UI state: `useState`/`useReducer`.
- Server/remote state: TanStack Query — never duplicate it into `useState`.
- Don't reach for a global store (Zustand, Redux, etc.) unless two+ unrelated
  routes genuinely need to share client state that isn't server data. Ask
  before adding one.

## Type safety

- No `any`. Use `unknown` + narrowing, or fix the actual type.
- Exported functions get explicit return types.
- `noUncheckedIndexedAccess` is on: `list[0]` and `record[key]` may be
  undefined. Handle it (a guard, a fallback) rather than adding `!`. Keys from
  outside the type (forms, requests, saved data) go through `lookup(record,
key)` (`@acutehimanshu/core/lookup`); tests use `nth(list, i)`
  (`@acutehimanshu/core/testing`); the mock has `first`/`lastOf` for lists that are
  never empty. Mock route params are typed from the path (`"/orders/:id"` →
  `params.id: string`).
- Validate all external input (API responses at trust boundaries, form
  input, env vars) with zod rather than trusting a TypeScript cast.

## Environment variables

All env access goes through the portal's `src/lib/env.ts` (or
`@acutehimanshu/web/env` for settings every portal shares), validated with zod at import
time. Add new vars to its schema and to `.env.example` in the same change —
never read `process.env` directly elsewhere.

## Testing

- Every feature component with logic (loading/error/empty states,
  interactions) gets a Vitest + Testing Library test.
- Mock the feature's `api.ts` module, not `fetch`/`api` globally — keeps
  tests close to what the component actually depends on.
- Anything that imports `@acutehimanshu/web/api/client` loads `@acutehimanshu/web/env`,
  which throws in Vitest (no `NEXT_PUBLIC_API_BASE_URL`). Keep pure logic
  (parsing, formatting, rules) in files that don't import the client — e.g.
  `toSearchQuery` lives in `search-params.ts`, not `api.ts` — and mock
  `@acutehimanshu/web/api/client` in component tests that only need `getErrorMessage`.
- Run `pnpm test` before considering a change done.
- **Coverage:** `pnpm test:coverage` (CI runs it and uploads each package's
  `coverage/lcov.info` for SonarQube). Shared settings live in
  `@acutehimanshu/config/coverage`; each package's config sets `thresholds` at what
  it measured, so coverage can't drop. When you add tests, raise them.
- **Errors:** report through `reportError(error, { where })`
  (`@acutehimanshu/ui/report-error`) — the one place a service like Sentry plugs in
  later. A `.catch` that carries on with a fallback uses
  `.catch(fallbackOn("what", value))` so it isn't silent; never
  `.catch(() => null)` for a backend call. (Catching a body that isn't JSON —
  `res.json().catch(() => null)` — is fine: the caller handles it.)

### E2E (Playwright)

`e2e/*.spec.ts` are real-browser tests covering whole flows (login →
back → logout, the Sell button → seller portal with the same login →
Start selling, a seller's listing bought by a buyer, form validation) plus an automated
accessibility scan (`accessibility.spec.ts`, `@axe-core/playwright`) on
every main page in both themes — a different layer from Vitest's
component tests, not a replacement. Run `pnpm test:e2e`
(`pnpm test:e2e:ui` for the interactive runner). They start the mock and build and start
all three production portals themselves (`playwright.config.ts`'s `webServer`,
ports in `e2e/urls.ts`),
not the dev server — sidesteps Turbopack dev-cache staleness (a real,
repeated issue building this template) and is more representative of what
ships. Locally, a server already on
:3100/:3200/:3300/:3400 (e.g. your `pnpm dev`) is reused instead — tests then
run against dev mode, where on-demand compiling can make the 5s
assertions flaky. Stop `pnpm dev` first for a reliable run.

Several real bugs were caught writing this suite, not test-authoring
artifacts — worth knowing before adding more E2E tests:

- **Use auto-retrying assertions for anything that updates
  asynchronously, never a one-shot value read + equality check.** A
  pagination test read a table cell's text once right after clicking
  "Next" and compared it with `.not.toBe(...)` — but the "Page N" label
  updates immediately (client state) while the row data updates only once
  the fetch resolves (`placeholderData: keepPreviousData` deliberately
  shows the old page's data in between, see "Data fetching" above), so
  the test read stale data and flaked. Fixed with `expect(locator).not.toHaveText(...)`,
  which polls until it's true instead of sampling once.
- **`getByRole("heading", ...)` will tell you the truth about whether
  something is actually a semantic heading** — this is how the
  `CardTitle` gap documented in "Typography" above was actually found:
  the accessibility-tree snapshot Playwright saves on a failed assertion
  showed `text: Page not found` instead of `heading: Page not found`.
  When a role-based query doesn't match, check what role the element
  really has before assuming the test's selector is wrong.
- **The axe accessibility scan found two real, non-obvious contrast bugs**
  on its very first run: a muted-on-muted `<code>` chip (see "Typography"
  above) and the `--primary` dark-mode/text-role conflict (see "Theming"
  above). Neither was visually obvious — both were close enough to passing
  that they looked fine at a glance. This is the actual case for running
  `accessibility.spec.ts`, not a hypothetical one.

## Before calling anything done

`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
must all pass. The pre-commit hook (husky + lint-staged) auto-fixes
lint/format on staged files, but typecheck/test/build are not hooked — run
them yourself. `pnpm test:e2e` isn't in this list deliberately (it's a
full build + browser run, slow for every small change) — CI runs it as a
separate job on every push/PR, and you should run it yourself for any
change that touches routing, auth, or a full user flow.

**Sonar quality gate:** SonarQube's rules (SonarJS) are the code-quality
standard, run without a server. `pnpm lint:sonar` lists the issues;
`pnpm lint:sonar:gate` (in CI) fails if any rule has more issues than
`sonar-baseline.json`. Don't add Sonar issues; after fixing some, run
`pnpm lint:sonar:gate --update` and commit the lower baseline. Never raise
the baseline to make CI pass.

## Commits

Conventional Commits style (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`,
`docs:`). Keep commits scoped to one logical change. This is enforced, not
just documented — a commit-msg hook (commitlint) rejects a non-conforming
message.

## Adding shadcn components

`pnpm dlx shadcn@latest add <name>`. Don't hand-write a component that
shadcn already provides.

## Working in this repo as an agent

- If a request is ambiguous or a decision affects the shared conventions
  above (new dependency, new folder pattern, state management approach),
  flag it rather than silently deciding.
- Prefer extending an existing feature's pattern over inventing a new one.
- Report back what changed, why, and what still needs review — this repo is
  reviewed by a human before merge.
