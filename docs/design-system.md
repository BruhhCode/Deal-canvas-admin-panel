# DealsCanvas Admin Panel — design system

An internal CRUD tool, not the storefront — it deliberately reuses the site's
color/type tokens (so the two apps don't look like unrelated products) but
applies them with a tighter, denser, "tool" sensibility: smaller radius,
compact pill filters, dense tables, no editorial imagery. `src/styles.css` is
the source of truth for tokens; this doc explains the *intent* and the
component conventions built on top of them, most of which came together
across several passes this project's history (sidebar migration, filter
pills, pagination, click-to-toggle statuses) — read it before introducing a
fourth way to do something two admin routes already do differently.

## Color tokens — shared with the site, not reinvented

`src/styles.css` ports the same oklch custom properties as the site repo's
`src/styles.css` (`background`/`cream`/`sand`, `ink`, `clay`, `primary`/
`secondary`/`muted`/`accent`, plus `sidebar-*` tokens the site doesn't need).
Same rule of thumb as the site's own design system: **`clay` means money or
urgency** (discount %, the primary button hover, a highlighted "new
enquiries" dashboard card) — it is not a general-purpose brand accent to
reach for everywhere. Everything else here is `foreground`/`muted-foreground`
on `card`/`cream` surfaces.

## Radius — deliberately smaller than the site's

`--radius: 0.25rem` here vs. the site's `0.5rem`. Same "one radius resolves
every `rounded-*` class" mechanism (see the site's design-system.md), just a
tighter value — an internal dashboard reads as a tool when its corners are
crisp; the site's softer radius is part of its editorial warmth. Don't copy
the site's radius value here, and don't introduce a second radius value in
this app.

## Typography

Same font pairing as the site (Poppins body / Playfair Display serif), but
used far more sparingly — Playfair appears only on top-level page headers
(the layout's `<h1>Dashboard</h1>` / `<h1>Catalogue Management</h1>` in
`admin/route.tsx`) and the login screen, not on every card title or section
heading the way it does on the storefront. Table headers, form labels, and
badges are all Poppins at small sizes with uppercase tracking — this app
reads more like a spreadsheet tool than a magazine, by design.

The `.editorial-eyebrow` utility (same definition as the site's) is reused
for the small-caps label above forms/sections ("Internal · admin",
"DealsCanvas" in the sidebar) — use it instead of hand-rolling the same
uppercase/tracking/muted-color combination inline.

## Filter row: the "pill" pattern

Every list route with filters (Products, Deals, Brands, Pages, FAQ) uses the
same compact pill-shaped controls — a `pillClass` constant:

```
'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay'
```

...applied to a search `<input>` (with a `lucide-react` `Search` icon
absolutely positioned inside it) and any `<select>` filters, all sitting in
one `flex flex-wrap items-center gap-2` row, height-matched so the whole row
reads as one connected control group instead of a search bar towering over
separate dropdown chips (an earlier, explicitly rejected pattern — see git
history around "Restyle product filters as compact pills").

**Known duplication**: `pillClass` is currently copy-pasted identically into
five route files (`products.tsx`, `deals.tsx`, `brands.tsx`, `pages.tsx`,
`faq.tsx`) rather than shared from one place. Reuse the exact string above
verbatim in any new filtered list rather than inventing a visually-close-but-
not-identical variant — and if you're touching more than one of these files
in the same change, this is a reasonable moment to extract it to a shared
module instead of copying it a sixth time.

## Status: three related, non-interchangeable components

- **`StatusBadge`** (`components/admin/StatusBadge.tsx`) — static,
  read-only. A fixed string→style map (`ACTIVE`/`IN STOCK` = clay,
  `PAUSED`/`UPCOMING`/`READ` = muted, `EXPIRED`/`OUT OF STOCK` = destructive,
  `NEW` = amber). Use this for a status that isn't directly a toggle from
  the table (e.g. a computed/derived label you don't want accidentally made
  clickable).
- **`DealBadge`** (`components/DealBadge.tsx`) — same idea, narrower palette
  (`ACTIVE`/`PAUSED`/`EXPIRED` only), used specifically where the site's own
  `DealBadge` component is mirrored (Analytics' network table, Dashboard's
  deals-by-status list).
- **`StatusToggle`** (`components/admin/StatusToggle.tsx`) — the interactive
  one: same visual language as the two badges above, but rendered as a
  `<button>` that flips a two-state field on click (Deals' ACTIVE/PAUSED,
  Pages' PUBLISHED/DRAFT, Navigation's visible/hidden, Products'/Stores'
  derived in-stock/out-of-stock). Use this wherever a status column should be
  directly actionable from the table instead of requiring the Edit modal —
  but for anything whose change has a wide blast radius (Stores' toggle
  rewrites every offer at that store), gate it behind a confirmation dialog
  rather than firing on the bare click; see `stores.tsx`'s `togglingStore`
  state for the pattern.

Don't invent a fourth status-rendering approach — extend one of these three
if a new table needs one.

## Modals: one shared component, sized `"xl"` by default now

`components/admin/Modal.tsx` takes a `size` prop (`'md' | 'lg' | 'xl'`,
default `'md'`) controlling `max-w-*`. Every Add/Edit modal and the Contact
message viewer across the whole app now use `size="xl"` — the original
`md` (`max-w-lg`) reads as cramped for anything with a multi-column form
grid (see git history around "Widen the Add/Edit Product modal"). Use `xl`
for any new Add/Edit modal; only drop to a smaller size for something
genuinely single-field.

## Pagination: one shared hook, not per-route reinvention

`components/admin/Pagination.tsx` exports both the `<Pagination>` control
(page-size select, prev/next, "Showing X–Y of Z") and the `usePagination(rows)`
hook that slices a page out of whatever filtered/sorted array a route has
already computed. Products, Deals, Brands, and Stores all use this pair —
don't hand-roll a second paging mechanism; if a new list route needs paging,
compute your filtered/sorted `rows` array as usual and pass it straight into
`usePagination`.

## Tables

Every list route uses the same wrapper: `overflow-x-auto rounded-lg border`
around a `<table>` with a `bg-cream` header row
(`text-xs uppercase tracking-[0.14em] text-muted-foreground`), `divide-y`
body rows, and an explicit empty-state row (`"No X yet"` when loaded and
empty, `"Loading X..."` while `!loaded`) rather than an empty `<tbody>`. Row
actions live in a `flex gap-2` cell, right-most column, as small
`rounded-sm border p-1.5` icon buttons (`hover:border-clay hover:text-clay`
for edit-type actions, `hover:border-destructive hover:text-destructive` for
delete) — or, where the action is Edit/Delete specifically, `rounded-full`
text pills instead of icon squares (Deals) — match whichever exists in
neighboring routes rather than mixing icon-button and pill styles in the
same table.

## Layout: sidebar shell

`admin/route.tsx` owns the whole-app chrome: a fixed 224px (`w-56`) sidebar
on desktop (`sticky top-0 h-screen`), collapsing to a slide-in drawer behind
a top bar on mobile. Nav entries are a single typed array (`tabs`) of
`{label, to, icon}` — add a new admin section by adding one entry there and
one route file, not by hand-wiring a new link somewhere else. The Dashboard
entry (`to: '/admin'`) is the one exception to the "active state = pathname
starts with `to`" rule, since every other route's path also starts with
`/admin`; see `isTabActive()`'s comment before changing this matching logic.

## Forms

`components/admin/FormField.tsx` exports `FormField` (label wrapper),
`inputClass`/`selectClass` (identical shared styling — `selectClass` is
currently just an alias of `inputClass`), `errorMessage()` (normalizes a
caught error into a display string), and `runAction()` (wraps an async
mutation with the try/catch-and-`window.alert`-on-failure pattern used for
inline actions like Contact's status dropdown). Multi-row repeatable fields
(Product's store offers, Product's gallery image URLs) use the same
add/remove-row pattern: a `+ Add X` button appending an empty entry, a
per-row `✕`/`Remove` button, never a delimited free-text textarea for
anything that's conceptually a list (see git history around "Replace the
additional-images textarea with add/remove URL rows" for why the textarea
version was replaced).

## Icons

`lucide-react`, same as the site — no custom stroke-width overrides.

## Confirmation dialogs

`components/admin/ConfirmDialog.tsx` for anything destructive (delete) or
wide-blast-radius (Store-wide availability toggle). Always state the
concrete effect in the description, including an affected-row count where
one is knowable (e.g. "N products currently point at this store") rather
than a generic "are you sure?".
