-- Run once in the Supabase SQL Editor.
-- Adds the table behind the admin panel's new Filters section: lets the
-- admin control which filters show on the site's /shop and /deals pages,
-- their label, display style (dropdown/chip buttons/checkbox list), order,
-- option lists, and numeric range bounds -- all previously hardcoded
-- directly in those two routes (src/routes/shop.tsx, src/routes/deals.tsx)
-- in the site repo. Safe to re-run (idempotent).
--
-- `key` identifies which hardcoded filter a row overrides -- the site only
-- recognizes a fixed set per section (see docs/shared-context.md), so this
-- isn't a free-form "add any filter you want" system: it controls the
-- existing filters, it doesn't invent new ones.
--
-- `options` is nullable: for filters whose choices come from live catalog
-- data (Category, Brand, Deal type), leaving it null keeps the site's own
-- derived list; setting it overrides with an explicit admin-chosen list.
-- `min_value`/`max_value`/`step_value` are only meaningful for range-type
-- filters (Max price, Minimum discount).
create table if not exists site_filters (
  id text primary key,
  section text not null check (section in ('shop', 'deals')),
  key text not null,
  label text not null,
  control_type text not null check (control_type in ('select', 'range', 'checkbox', 'sort')),
  display_style text check (display_style in ('dropdown', 'chips', 'checkbox-list')),
  enabled boolean not null default true,
  sort_order int not null default 0,
  options jsonb,
  min_value numeric,
  max_value numeric,
  step_value numeric,
  updated_at timestamptz not null default now(),
  unique (section, key)
);

-- Seeds rows that exactly match today's hardcoded shop.tsx/deals.tsx
-- behavior, so nothing on the live site changes until the admin actually
-- edits something here.
insert into site_filters (id, section, key, label, control_type, display_style, enabled, sort_order, options, min_value, max_value, step_value) values
  ('FILT-shop-category', 'shop', 'category', 'Category', 'select', 'dropdown', true, 0, null, null, null, null),
  ('FILT-shop-gender', 'shop', 'gender', 'Shopping For', 'select', 'dropdown', true, 1,
    '[{"value":"women","label":"Women"},{"value":"men","label":"Men"},{"value":"kids","label":"Kids"},{"value":"unisex","label":"Unisex"}]'::jsonb,
    null, null, null),
  ('FILT-shop-price', 'shop', 'price', 'Max price', 'range', null, true, 2, null, 0, 60000, 1000),
  ('FILT-shop-brand', 'shop', 'brand', 'Brand', 'select', 'dropdown', true, 3, null, null, null, null),
  ('FILT-shop-sort', 'shop', 'sort', 'Sort', 'sort', 'dropdown', true, 4,
    '[{"value":"recommended","label":"Recommended"},{"value":"lowest-price","label":"Lowest Price"},{"value":"highest-discount","label":"Highest Discount"},{"value":"newest","label":"Newest"},{"value":"popular","label":"Popular"},{"value":"price-asc","label":"Price: Low → High"},{"value":"price-desc","label":"Price: High → Low"}]'::jsonb,
    null, null, null),

  ('FILT-deals-category', 'deals', 'category', 'Category', 'select', 'dropdown', true, 0, null, null, null, null),
  ('FILT-deals-brand', 'deals', 'brand', 'Brand', 'select', 'dropdown', true, 1, null, null, null, null),
  ('FILT-deals-dealType', 'deals', 'dealType', 'Deal type', 'select', 'dropdown', true, 2, null, null, null, null),
  ('FILT-deals-discount', 'deals', 'discount', 'Minimum discount', 'range', null, true, 3, null, 0, 80, 5),
  ('FILT-deals-price', 'deals', 'price', 'Max price', 'range', null, true, 4, null, 1000, 200000, 1000),
  ('FILT-deals-includeExpired', 'deals', 'includeExpired', 'Include expired deals', 'checkbox', null, true, 5, null, null, null, null),
  ('FILT-deals-sort', 'deals', 'sort', 'Sort', 'sort', 'dropdown', true, 6,
    '[{"value":"Trending","label":"Trending"},{"value":"Newest","label":"Newest"},{"value":"Ending Soon","label":"Ending Soon"},{"value":"Highest Discount","label":"Highest Discount"},{"value":"Best Value","label":"Best Value"},{"value":"Most Popular","label":"Most Popular"},{"value":"Editor''s Choice","label":"Editor''s Choice"}]'::jsonb,
    null, null, null)
on conflict (id) do nothing;

alter table site_filters enable row level security;

drop policy if exists "public read" on site_filters;
create policy "public read" on site_filters for select using (true);

drop policy if exists "admin all" on site_filters;
create policy "admin all" on site_filters for all to authenticated using (is_admin()) with check (is_admin());
