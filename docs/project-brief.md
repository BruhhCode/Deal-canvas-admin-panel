# DealsCanvas Admin Panel — project brief

## What it is

The internal CRUD dashboard for **DealsCanvas**, a fashion/beauty/lifestyle
deal-aggregator and price-comparison site. This repo is where staff manage
everything the public site (`deal canvas codebase`) displays: the product
catalog, brands, stores, deals, sales, site navigation, CMS pages, FAQ
content, and incoming contact-form messages. It has no public-facing
surface of its own and is not part of the affiliate revenue flow directly —
it's the tool that keeps the revenue-generating site's data correct and
current.

## Who it's for

Whoever runs the DealsCanvas catalog day to day: adding/updating products
and prices, creating deals and sale events, triaging contact messages,
editing site navigation and CMS pages. Single-tenant, internal use only —
there's no concept of external/customer-facing accounts here at all.

## Two-repo architecture

DealsCanvas is deliberately split across two independent repositories
sharing one Supabase project:

| | This repo (`Deal canvas admin panel`) | `deal canvas codebase` |
|---|---|---|
| Role | Internal catalog/content CRUD dashboard | Public storefront |
| Auth | Real Supabase Auth, `admin_users`-gated | None — fully public |
| Owns | Product/price/deal editing, Navigation, CMS Pages, FAQ, Contact-message triage | All shopper-facing pages/routes |

Neither repo can see the other's code — [`docs/shared-context.md`](shared-context.md)
is the one file kept byte-identical in both, documenting the DB schema, RLS
state, realtime config, and pricing contract both must agree on. The site
repo has no admin UI of its own (a legacy `/admin` route existed early on
and has since been removed there) — **this is the actively developed admin
dashboard**; prefer changing here over reviving anything in the site repo.

## What's managed here

- **Dashboard** — landing page, at-a-glance stats (categories, brands/
  stores, products/offers, deals/coupons/sale events, enquiries), a
  deals-by-status breakdown, recent enquiries, recently-updated products.
- **Products** — catalog CRUD, per-store offers (price/availability/coupon
  code per store), CSV bulk import ("Import Feed"), search/category/brand/
  sort filters + pagination.
- **Brands** / **Stores** — CRUD, same filter/pagination pattern.
- **Deals** — CRUD, click-to-toggle ACTIVE/PAUSED status, same filter/
  pagination pattern.
- **Sales** — sale event CRUD (store-wide sale windows shown on the site's
  sales calendar).
- **Flights & Hotels** — sidebar placeholder only; no data model or CRUD
  yet, pending scope (routes vs. hotel listings, pricing, dates,
  availability).
- **Analytics** — clicks/CTR/conversion/revenue rollups (currently derived
  from `deals.clicks` with fixed conversion-rate assumptions, not real
  attribution data), top brands by clicks, top coupons, affiliate network
  breakdown.
- **Navigation** — editable list of the public site's header nav links
  (drives `Header.tsx`'s live nav fetch there).
- **Banners** — the homepage's hero carousel slides and its 3-across promo
  banner row, both previously hardcoded on the site; the site falls back to
  its original hardcoded content if this table is empty.
- **Pages** — a minimal CMS (plain-text content, DRAFT/PUBLISHED), rendered
  at the site's `/pages/$slug`.
- **FAQ** — grouped Q&A content, rendered at the site's `/faq`.
- **Contact Queries** — read/triage (NEW/READ/RESOLVED)/delete messages
  submitted through the site's `/contact` form. Insert-only from the site's
  side; this app never creates a message, only manages ones that arrive.

## Data & image pipeline

Catalog data originates as scraped/imported CSVs, imported either through
the in-app "Import Feed" browser flow (`ImportFeedModal.tsx` +
`bulkImportProducts()`) or the local Node script `scripts/seed.js` — the
latter also processes product images (see below), the former does not.
Product photos and brand/store logos were originally hotlinked directly
from retailer CDNs and logo/favicon services; `scripts/` now re-hosts them
from this project's own Supabase Storage once, at import/backfill time —
see `docs/shared-context.md`'s "Image & logo storage" section for the
bucket layout and URL contract.

## Explicitly out of scope (for this repo)

- Any shopper-facing page or route — that's entirely the site repo's job.
- Payments, carts, checkout, user accounts — not part of DealsCanvas at all
  (see the site repo's own project brief).
- Continuous/live product scraping — the catalog is imported in batches and
  then kept current by hand through this dashboard.
- A booking/payment flow for Flights & Hotels, until that section is scoped
  past its current placeholder state.

## Current known gaps (worth knowing before assuming something works)

- **RLS is not consolidated onto one model.** `offers`/`deals`/`sale_events`
  require `is_admin()` (a real admin-role check); `products`/`brands`/
  `stores`/`coupons` currently only require *any* authenticated Supabase
  Auth session, not `admin_users` membership specifically. See
  `docs/shared-context.md`'s RLS section before assuming "logged in" means
  the same thing on every table.
- **`DealStatus` type mismatch**: this repo's type only lists
  `ACTIVE | PAUSED | EXPIRED | UPCOMING`; the site's includes `SOLD OUT`
  too. Reconcile if it ever causes a mismatched dropdown/rendering.
- **Image/logo backfill is a manual, opt-in step**, not automatic — existing
  products/brands/stores keep hotlinked URLs until `scripts/backfill-*.mjs`
  is actually run (see `docs/shared-context.md`). The site's own
  `brandLogo()`/`storeLogo()` also don't read the new `logo_url` column yet
  even after a logo backfill runs — that's a separate, not-yet-implemented
  site-repo change.
- **Analytics numbers are illustrative, not measured** — CTR/conversion/
  revenue are fixed-percentage assumptions applied to `deals.clicks`, not
  real funnel tracking.
