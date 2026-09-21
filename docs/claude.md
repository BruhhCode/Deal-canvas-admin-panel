# DealsCanvas — Admin Panel (agent guide)

> **Cross-repo note**: this app shares one Supabase project with a separate
> repo, `deal canvas codebase` (the public storefront, which also contains a
> legacy, lightweight admin route at `/admin` — **this repo is the actively
> developed admin dashboard**; prefer changing here). The DB schema, RLS
> state, realtime config, and pricing contract both repos must agree on live
> in **[`shared-context.md`](shared-context.md)** — read it before touching
> anything Supabase-related, and update it in both repos together if you
> change the contract. For this app's own internals (data flow, derived
> fields, write-reliability guard), see **[`architecture.md`](architecture.md)**.

Internal CRUD dashboard for the DealsCanvas catalog: products, brands,
stores, deals, sale events, plus read-only analytics/network views. Built
with TanStack Start (file routes under `src/routes/admin/`), Supabase
(Postgres + Auth), no server of its own beyond Supabase.

## What this project is

DealsCanvas is a fashion-deal-aggregator: shoppers browse the public site to
compare prices for the same product across stores. This repo is the internal
tool the team uses to manage that catalog. No content here is ever shown to
a shopper directly — it's purely operations tooling. There's no API this
repo owns: "the API" is Supabase's PostgREST layer, reached through
`@supabase/supabase-js`.

## Project structure

```
src/
  routes/
    login.tsx               Supabase Auth login (email/password)
    admin/route.tsx          layout: sidebar nav (desktop) / slide-in drawer
                              (mobile), auth guard, breadcrumbs
    admin/index.tsx          dashboard home
    admin/products.tsx       search + category/brand filters + sort, status,
                              live "last updated", CSV import/bulk-update
    admin/brands.tsx         brand CRUD
    admin/stores.tsx         store CRUD
    admin/deals.tsx          deal CRUD + status changes
    admin/sales.tsx          sale event CRUD (card grid)
    admin/analytics.tsx      read-only rollups
    admin/networks.tsx       read-only per-affiliate-network rollup
  components/admin/
    *Form.tsx                one per entity (Product/Brand/Store/Deal/SaleEvent)
    ImportFeedModal.tsx      CSV bulk import/update flow
    Modal.tsx, ConfirmDialog.tsx, FormField.tsx, NetworkSelect.tsx
    StatusBadge.tsx          shared status pill (Active/Low Stock/Out of
                              Stock/Expired/Paused/Upcoming)
  lib/
    supabaseClient.ts        the one Supabase client instance (anon key)
    auth.ts                  useAuth() — session state + login/logout
    data.ts                  the ONLY file that talks to Supabase for catalog
                              data — useSyncExternalStore store + full CRUD
    currency.ts              toUsd/fromUsd base-unit conversion
    time.ts                  timeAgo() + useLiveNow() — real, live-ticking
                              "last updated" labels
  types/catalog.ts            Product/Offer/Brand/Store/Deal/Coupon/SaleEvent
                              types — this repo's own copy of the DB row
                              shapes; keep in sync BY HAND with the site
                              repo's equivalents, there's no shared package
scripts/                      one-off SQL/JS run manually (SQL Editor / node),
                               never part of the build:
  rls-policies.sql             grants `authenticated` full CRUD on all 7 tables
  restore-products-rls.sql     re-adds write policies `products` lost when its
                                PK was migrated from id to slug
  enable-products-realtime.sql adds products to the supabase_realtime publication
  restore-realtime.sql         re-adds products/brands/stores to the publication
                                after they were found missing (idempotent)
  seed.js, static-data.js, products-import.csv   early/legacy seeding helpers
```

## Environment setup

1. `cp .env.example .env`, fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
   from the shared Supabase project.
2. `npm install`
3. `npm run dev` — Vite dev server, defaults to port 3000 (auto-bumps if busy).
4. Log in at `/login` with a Supabase Auth user created via the Supabase
   dashboard's Auth panel — no self-serve signup.

Other scripts: `npm run build`, `npm run generate-routes` (regenerate
TanStack Router's route tree after adding/removing a route file),
`npm run lint`, `npm run format`, `npm run check`.

## Data access pattern

Everything goes through `src/lib/data.ts` — see `architecture.md` for the
full data-flow diagram. In short: one module-scope store loaded once at
import time, `useSyncExternalStore` hooks per table, every mutation writes
then re-fetches (no optimistic updates, no realtime in this app).

## Pricing — "legacy base unit" (do not skip this)

`offers.price`/`original_price` and `deals.price`/`original_price` are
**not real USD** — a legacy base unit where `BASE_TO_USD = 1/83`
(`src/lib/currency.ts`, `toUsd()`/`fromUsd()`). Every read or write of one of
these four columns must go through one of those two functions, or a price
ends up ~83x wrong on whichever surface (this app or the live site) forgot
the conversion. Full contract in `shared-context.md`.

## Product identity: `slug`, not `id`

`products.slug` is the primary key; the original scraped catalog's `id`
values (e.g. `"PI-0081"`) are reused across unrelated products and kept only
as `source_id`. `offers.product_slug` is the FK. Renaming a product requires
detaching its offers first (no `ON UPDATE CASCADE`) — see the comment in
`updateProduct()` in `data.ts`.

## Auth

Real Supabase Auth (`supabase.auth.signInWithPassword`), wired through
`src/lib/auth.ts` and `src/routes/login.tsx`. `src/routes/admin/route.tsx`
redirects to `/login` once auth state is known and the session isn't valid.

**This gates the UI, not the database.** RLS write permissions have drifted
more than once during this project (see `shared-context.md`'s History) —
verify empirically before assuming today's snapshot holds; don't assume
"you're logged in" means "the write will succeed," and don't assume "the
write returned no error" means "the write happened" either — see
`architecture.md`'s write-reliability section for why `UPDATE` in particular
needs its own check.

## Status & "last updated" — what's real vs derived

Nothing in the UI's Status or Last-updated columns is naive/hardcoded
anymore — Stores' status column used to always literally say "Active" for
every row; Products' freshness used to read a hand-typed number that never
changed. Both are now computed from real data (`productStatus()`,
`storeStatus()`, `productLastUpdated()` + `timeAgo()` in `data.ts`/`time.ts`).
See `architecture.md`'s "Derived data" table for exactly what's computed
from what — if you add a new entity or a new list view, decide deliberately
whether it needs the same treatment rather than defaulting to a static label.

## Before changing the DB schema, RLS, or realtime config

Read `shared-context.md` first — it documents the *live* state (verified
empirically against the actual Supabase project) and the drift history
between this repo's SQL scripts and the site repo's `supabase/schema.sql`.
Update that file in both repos in the same sitting if you change anything it
documents.

## Verification habits used on this project

- Any non-trivial Supabase/data change gets checked with a small throwaway
  script (`node <script>.mjs`, anon key — reach for the service-role key
  from the site repo's `.env` only when RLS itself is what's under test)
  rather than trusted on faith. **Delete these scripts immediately after
  use** — never commit them.
- `npx tsc --noEmit` after any TypeScript change; `npm run build` for
  anything touching routing, layout, or a shared component.
- For anything that could plausibly affect the public site (schema, RLS,
  realtime, pricing conversions), verify against the live site too — the
  two repos share one database, so a change here can silently break
  rendering there.
- Prefer proving a fix against the live Supabase project over reading code
  and assuming — several real bugs on this project (the 1000-row PostgREST
  cap, RLS silently no-op'ing a blocked UPDATE, the comma-split image URL
  corruption) were only found by writing a small script that actually hit
  the database, not by code review alone.
