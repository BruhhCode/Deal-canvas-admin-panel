# DealsCanvas — shared DB & API contract (site ⇄ admin)

**This file must stay byte-identical in both repos:**
- `deal canvas codebase` (public site) — `docs/shared-context.md`
- `Deal canvas admin panel` (admin dashboard) — `docs/shared-context.md`

They are two independent repos/apps that read and write **the same Supabase
project**. Neither repo can see the other's code, so this file is the only
ground truth both Claude sessions share. **Whenever you change a table
column, a policy, the realtime publication, or any cross-repo assumption below,
update this file in both repos in the same sitting** — drift here is exactly
what caused real bugs before (see "History" at the bottom).

## The two apps

| | `deal canvas codebase` | `Deal canvas admin panel` |
|---|---|---|
| Purpose | Public storefront (search, compare prices, deals, coupons, sales calendar) | Internal CRUD dashboard for the catalog |
| Framework | TanStack Start, file routes in `src/routes/` | TanStack Start (separate app/repo), routes in `src/routes/admin/*` |
| Auth | None (public) | Real Supabase Auth (`supabase.auth.signInWithPassword`, see `src/lib/auth.ts`) — login screen at `/login` |
| Reads Supabase via | `src/lib/supabase.ts` (anon key) + `src/lib/live-catalog.ts` (realtime → mutates static in-memory arrays) | `src/lib/data.ts` (anon key, `useSyncExternalStore`-based store, full CRUD helpers) |
| Legacy admin route | `src/routes/admin.tsx` — a lightweight, older, *read-mostly* dashboard baked into the site itself (edits price/availability directly). **The admin panel repo is the actively developed one; treat the in-site `/admin` route as legacy** and prefer changing the admin panel repo unless told otherwise. | — |

Both apps use the **same Supabase project** (URL + anon key in each repo's
`.env`, never committed — see `.env.example` in each repo). The **service-role
key** exists only in the site repo's `.env`, used only by
`scripts/seed-supabase.ts`, and must never be exposed to any browser bundle
in either app.

## Pricing contract — legacy base unit (do not skip this)

`offers.price`, `offers.original_price`, `deals.price`, `deals.original_price`
are stored in a **legacy base unit**, not real USD:

```
BASE_TO_USD = 1 / 83
usd = base * BASE_TO_USD
base = usd / BASE_TO_USD
```

- Site: `src/lib/currency.tsx` — `toUsd()`, `fromUsd()`, `formatUsd()`, plus the `useCurrency()` multi-currency context.
- Admin panel: `src/lib/currency.ts` — same `toUsd()`/`fromUsd()` pair, USD-only `useCurrency()`.

**Every read or write of a price column in either repo must go through these
conversions.** A raw `.price`/`.original_price` value is never real USD —
treating it as one makes prices ~83x off on whichever surface forgot the
conversion.

## Product identity: `slug`, not `id`

`products.slug` is the **primary key** (not a separate `id` column — the
scraped/imported catalog's original `id` values, e.g. `"PI-0081"`, were
reused across unrelated products and are not globally unique; they're kept
only as `products.source_id`, a plain non-unique text column, for traceability
back to the original import).

- `offers.product_slug` (not `product_id`) is the FK into `products.slug`, `on delete cascade`.
- The admin panel's `updateProduct()` (`src/lib/data.ts`) has to delete-then-reinsert a product's offers when renaming its slug, since there's no `on update cascade` — see that function's comment before changing this flow.

## Tables (current shape — source of truth is Supabase itself; this is a snapshot)

### `brands`
`slug` (PK, text) · `name` · `description` · `category` · `network` · `featured` (bool)

### `stores`
`slug` (PK, text) · `name` · `description` · `network` · `domain` · `campaign` · `store_id` · `sub_id` · `ships_to` · `store_wide_offer` (nullable) · `featured` (bool) · `sponsored` (bool)

### `products`
`slug` (PK, text) · `source_id` · `name` · `brand` (FK → `brands.slug`) · `category` · `subcategory` · `gender` · `description` · `image` · `images` (jsonb array) · `colors` (jsonb array) · `sizes` (jsonb array) · `tags` (jsonb array) · `rating` (numeric) · `reviews` (int) · `views` (int) · `new_in` (bool) · `updated_at`

### `offers`
`id` (PK, uuid, default `gen_random_uuid()`) · `product_slug` (FK → `products.slug`, cascade delete) · `store` (FK → `stores.slug`) · `price` (base unit) · `original_price` (base unit) · `currency` (text, always `"USD"` today — it labels the base-unit currency, not a display currency) · `availability` (text: `"IN STOCK" | "LOW STOCK" | "OUT OF STOCK"`) · `product_url` · `coupon_code` (nullable) · `shipping` · `updated_hours_ago` (int) · `sponsored` (bool) · `updated_at`

A product can have many offers (one per store). `bestOffer()` (implemented independently in both repos — keep the tie-break logic identical) picks the lowest `price`.

### `deals`
`id` (PK, text, e.g. `"DL-<timestamp36>"`) · `slug` (unique) · `title` · `product` (display name) · `brand` (FK → `brands.slug`) · `category` · `subcategory` (nullable) · `original_price` (base unit) · `price` (base unit) · `code` (nullable) · `deal_type` · `badges` (jsonb array) · `description` · `terms` (jsonb array) · `expires_in_hours` (int) · `status` (`"ACTIVE" | "UPCOMING" | "EXPIRED" | "SOLD OUT" | "PAUSED"` — **note**: the admin panel's `DealStatus` type only lists `ACTIVE | PAUSED | EXPIRED | UPCOMING`, missing `SOLD OUT` which the site's type includes; reconcile this if it ever causes a mismatched dropdown/rendering) · `image` · `tags` (jsonb array) · `merchant_url` · `network` · `campaign` · `sub_id` · `tracking_id` · `clicks` (int) · `featured` / `flash` / `sponsored` (bool)

### `sale_events`
`id` (PK, text, e.g. `"SE-<timestamp36>"`) · `store` (FK → `stores.slug`) · `title` · `discount` · `"window"` (text — **quoted in SQL, it's a reserved keyword**; values like `"today" | "tomorrow" | "this-week" | "next-week" | "this-month"`) · `detail` · `code` (nullable)

### `coupons`
`id` (PK, text) · `brand` (FK → `brands.slug`) · `title` · `description` · `code` · `discount` · `expires_in_hours` (int) · `used_today` (int) · `success_rate` (numeric)

### `reviews`
`id` (PK, uuid) · `product_slug` (FK → `products.slug`, cascade delete) · `author` (default `'Anonymous'`) · `rating` (int, 1–5) · `comment` · `created_at`. Shopper-submitted from the product page — the one table the public site itself writes to directly, insert-only, no admin gate.

### `admin_users` / `is_admin()`
`admin_users`: `user_id` (PK, uuid, FK → `auth.users.id`) · `created_at`. `is_admin()` is a `security definer` SQL function (`select exists (select 1 from admin_users where user_id = auth.uid())`) defined in the site repo's `supabase/schema.sql`, live in the project. This is the gate the newer write policies below check — a request must be both `authenticated` (a real Supabase Auth session) **and** have a row in `admin_users`, not just any logged-in user. To grant someone admin: sign them up/in once (e.g. via the admin panel's `/login`), then `insert into admin_users (user_id) values ('<their-auth-uid>');` using the service-role key or the SQL Editor. No public read/write policy exists on `admin_users` itself.

### `nav_items` (added for the admin panel's Navigation section)
`slug` (PK, text) · `label` · `href` · `sort_order` (int) · `visible` (bool) · `updated_at`. Drives the public site's header nav (`Header.tsx`'s `useLiveNav()`) — a hardcoded fallback array in that file is used until this loads (and if it's ever empty). `href` is free text (admin-editable) so the site renders nav links as plain `<a>` tags, not typed `Link to`/`search` — don't assume it's a route the typed router knows about.

### `pages` (added for the admin panel's Pages/CMS section)
`slug` (PK, text) · `title` · `content` (plain text — paragraphs separated by a blank line, same convention as the site's static `guides`; deliberately not HTML, no `dangerouslySetInnerHTML` anywhere) · `meta_description` (nullable) · `status` (`'DRAFT' | 'PUBLISHED'`) · `updated_at`. Rendered at the site's `/pages/$slug`; only `PUBLISHED` rows are visible there (public read policy is `using (status = 'PUBLISHED')`, not a blanket `using (true)`).

### `faqs` (added for the admin panel's FAQ section)
`id` (PK, text, e.g. `"FAQ-<timestamp36>"`) · `section` (text — free-form grouping, e.g. `"Orders"`, `"Shipping"`) · `question` · `answer` · `sort_order` (int) · `updated_at`. Rendered at the site's `/faq`, grouped by `section`, with `FAQPage` JSON-LD generated from the live rows.

### `contact_messages` (defined in the site repo's schema.sql; table itself was missing from the live project until the admin panel's `create-cms-tables.sql` created it)
`id` (PK, uuid) · `name` · `email` · `subject` (default `''`) · `message` · `created_at` · `status` (`'NEW' | 'READ' | 'RESOLVED'`, added by the admin panel's script — not in the site repo's original definition) · `updated_at` (same). Written only by the site's `/contact` form (anon insert-only, no public read at all — not even `authenticated` without `is_admin()`); the admin panel's Contact Queries section reads/triages/deletes via `is_admin()`-gated policies.

### `network` values (CHECK-constrained on `brands`/`stores`/`deals`)
Closed set — Postgres will reject anything else:
`"Rakuten Advertising" | "Impact" | "Awin" | "CJ Affiliate" | "Admitad" | "Amazon Associates"`

## Row Level Security — current live state

**This section changed materially and should be re-verified empirically
before being trusted, not just read** — both repos' SQL scripts have
independently touched policies over time (see History), and the site repo's
`supabase/schema.sql` was rewritten at some point to introduce a real
`is_admin()` gate (see the `admin_users` table above) without a
corresponding update landing here until now. Last verified empirically
(signed in as a real `admin_users`-registered user and attempting real
writes against the live project):

- **Read**: `anon` key can read `brands`, `stores`, `products`, `offers`,
  `deals`, `sale_events`, `coupons`, `reviews`, `nav_items`, `faqs` — plus
  `pages` where `status = 'PUBLISHED'`. `admin_users` and `contact_messages`
  have no public read policy at all.
- **Write**: confirmed live that a logged-in, `admin_users`-registered
  session can currently insert/update/delete `products`, `brands`, `stores`,
  and `offers`. The exact policy each of those is currently satisfying
  wasn't fully disentangled (the admin panel repo's older, broader
  `to authenticated with check (true)` policies from `rls-policies.sql` /
  `restore-products-rls.sql` and the site repo's newer `is_admin()`-gated
  ones can coexist — Postgres RLS is permissive/OR'd, so either one passing
  is enough) — **don't assume today's live behavior for `products`/`brands`/
  `stores` matches what either individual script alone would produce; verify
  empirically if it matters.**
- `offers`, `deals`, `sale_events`: the site repo's `schema.sql` now defines
  these as `to authenticated using (is_admin()) with check (is_admin())`,
  replacing an earlier wide-open `"public write" using (true)` policy — a
  real fix for a previously-flagged vulnerability (anyone holding the public
  anon key, which ships in both apps' bundles, could previously write with
  no login at all). If you find anon can still write to these three, the old
  policy wasn't actually dropped when the new one was added — check for it.
- `nav_items`, `pages`, `faqs`, `contact_messages`: new tables, so they
  started with the `is_admin()` model from day one rather than inheriting
  the older gap — see their per-table entries above.
- `products`/`brands`/`stores`/`coupons` do **not** have an `is_admin()`
  write policy defined in the site repo's `schema.sql` at all (only
  `offers`/`deals`/`sale_events` do) — their write access currently comes
  entirely from the admin panel's own `to authenticated with check (true)`
  scripts, which check real Supabase Auth but not `admin_users` membership.
  **Not yet consolidated onto the same `is_admin()` model as offers/deals/
  sale_events** — worth doing at some point so "who counts as an admin" is
  answered in exactly one place, not two different policies with two
  different notions of "authenticated".

## Realtime

`supabase_realtime` publication currently includes **all of**: `products`,
`offers`, `deals`, `sale_events` (verified live). `brands`, `stores`,
`coupons`, `reviews`, `nav_items`, `pages`, `faqs`, `contact_messages` are
not in the publication — no current UI needs live updates for those (the
site's nav fetch, CMS pages, and FAQ page all just re-query on page load;
there's no open-tab-needs-to-update-without-reload requirement for any of
them the way there is for prices/availability).

- Site's consumer: `src/lib/live-catalog.ts` — subscribes to all four
  published tables, mutates the shared in-memory `products`/`deals`/
  `saleEvents` arrays/objects in place, exposes `useCatalogVersion()` for
  components to opt into re-rendering on change. On mount it also does a
  one-time full re-fetch (`hydrateFromSupabase()`) to catch anything written
  while no browser tab was subscribed — Realtime never backfills past events.
- **Any component/route in the site that reads a live price/availability/
  deal/sale-event field directly (not through `ProductCard`/`PriceCompare`/
  `DealCard`, which already call the hook) must call `useCatalogVersion()`
  itself**, or it will silently show stale data after an admin edit. This
  exact gap caused a real bug: the homepage's "Same Product. Different
  Price." section and the deal detail page (`deal.$slug.tsx`) read prices
  directly and had no hook call.
- Admin panel does not currently subscribe to realtime itself — it reloads
  the affected table after every write (`reload()` in `src/lib/data.ts`), so
  it doesn't need `useCatalogVersion`-equivalent wiring, but if it ever adds
  a second open tab/session scenario, this is where that would go.

## Verification convention

Both repos favor small, throwaway diagnostic scripts (using the service-role
key from the site repo, or plain anon-key scripts) run with `node`/`npx tsx`
to empirically confirm RLS/realtime behavior against the *live* database
rather than trusting a checked-in `.sql` file was actually the last thing
run — policies here have drifted from file history at least once already
(see History). Delete these scripts immediately after use; never commit them.

## History (context for judgment calls, not exhaustive)

- Site originally shipped `offers`/`deals`/`sale_events` with `anon`-writable
  RLS ("no real admin auth yet"). The admin panel repo later added real
  Supabase Auth + its own `to authenticated` policies, intending to tighten
  this — but the original wide-open policy was never dropped, so it's still
  wide open in practice (see RLS section above).
- `products` was originally **not** in the realtime publication; the admin
  panel's `src/scripts/enable-products-realtime.sql` added it after
  discovering products created in the admin panel never appeared live on the
  site.
- The site's `products` table was migrated from an `id`-keyed to a
  `slug`-keyed primary key partway through this project (see "Product
  identity" above) — this silently dropped the admin panel's insert/update/
  delete policies on `products` (policies don't survive a table recreation),
  which `restore-products-rls.sql` was written to fix. If `products` is ever
  recreated again (not just altered), remember write policies need re-adding.
- The site repo's `supabase/schema.sql` was rewritten at some point to add
  `admin_users`/`is_admin()` and gate `offers`/`deals`/`sale_events` writes
  on it, dropping the old wide-open anon policy on those three — a real fix
  for the vulnerability this file used to flag as an accepted gap. That
  rewrite happened without a corresponding update to this file, so this file
  described a security model that no longer matched reality for a while —
  exactly the kind of drift this file exists to prevent. `products`/
  `brands`/`stores`/`coupons` were never migrated onto the same model; see
  the RLS section above.
- The site's `/contact` form (`src/routes/contact.tsx`) was written against
  a `contact_messages` table defined in `schema.sql`, but that table was
  never actually created in the live project — every real contact form
  submission was silently failing (into a toast error) until the admin
  panel's `src/scripts/create-cms-tables.sql` created it (idempotently
  mirroring the site's definition) while adding the Navigation/Pages/FAQ/
  Contact-Queries admin sections. Worth remembering: a table being fully
  defined in a repo's schema file doesn't mean it exists live — verify.
