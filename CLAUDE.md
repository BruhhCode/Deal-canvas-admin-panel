# DealsCanvas — Admin Panel

> **Cross-repo note**: this app shares one Supabase project with a separate
> repo, `deal canvas codebase` (the public storefront, which also contains a
> legacy, lightweight admin route at `/admin` — **this repo is the actively
> developed admin dashboard**; prefer changing here). The DB schema, RLS
> state, realtime config, and pricing contract both repos must agree on live
> in **[`docs/shared-context.md`](docs/shared-context.md)** — read it before
> touching anything Supabase-related, and update it in both repos together if
> you change the contract.

Internal CRUD dashboard for the DealsCanvas catalog: products, brands,
stores, deals, coupons, sale events, plus analytics/network views. Built with
TanStack Start (file routes under `src/routes/admin/`), Supabase (Postgres +
Auth), no server of its own beyond Supabase.

## Structure

```
src/
  routes/
    login.tsx              real Supabase Auth login (email/password)
    admin/route.tsx         admin layout/guard
    admin/index.tsx          dashboard home
    admin/{products,brands,stores,deals,sales,networks,analytics}.tsx
  components/admin/          *Form.tsx components (Product/Brand/Store/Deal/SaleEvent),
                              Modal, ConfirmDialog, ImportFeedModal, NetworkSelect, FormField
  lib/
    supabaseClient.ts        anon-key browser client
    auth.ts                  useAuth() hook wrapping supabase.auth
    data.ts                  the ONLY file that talks to Supabase for catalog data —
                              useSyncExternalStore-based store + full CRUD helpers per table
    currency.ts               toUsd/fromUsd base-unit conversion (see shared-context.md)
  types/catalog.ts            Product/Offer/Brand/Store/Deal/Coupon/SaleEvent types — this
                              is the admin panel's own copy of the DB row shapes; keep in
                              sync with the site's equivalents (src/data/*.ts there) by hand,
                              there's no shared package between the two repos.
  scripts/                    one-off SQL run manually in the Supabase SQL Editor
    rls-policies.sql, restore-products-rls.sql, enable-products-realtime.sql,
    seed.js, static-data.js, products-import.csv
```

## Data access pattern

Everything goes through `src/lib/data.ts`: a module-scope store loaded once
(`loadAll()`) via `Promise.all` across all 6 tables, exposed via
`useProducts()`/`useBrands()`/etc. hooks (`useSyncExternalStore`). Every
mutation helper (`createProduct`, `updateDeal`, ...) writes to Supabase then
calls `reload(table)` to refresh that slice from the DB — there's no
optimistic update and no realtime subscription in this app; the source of
truth after any write is always a fresh `select`.

`products` are fetched with a nested `select('*, offers(*)')` — every
`ProductWithOffers` already carries its offers array from a single query, no
N+1.

## Auth

Real Supabase Auth (`supabase.auth.signInWithPassword`), wired in
`src/lib/auth.ts` / `src/routes/login.tsx`. **This currently gates the UI
only** — see `docs/shared-context.md`'s RLS section: the database itself
still has a wide-open anon-writable policy left over from the site's
original setup, so logging in here doesn't actually restrict who can write
to the tables at the Postgres level. Don't assume "the admin panel has
login" means "the data is protected."

## Before changing the DB schema, RLS, or realtime config

Read `docs/shared-context.md` first — it documents the *live* state (verified
against the actual Supabase project, not just whichever `.sql` script was
last written) and the history of drift between this repo's SQL scripts and
the site repo's `supabase/schema.sql`. Update that file in both repos in the
same sitting if you change anything it documents.
