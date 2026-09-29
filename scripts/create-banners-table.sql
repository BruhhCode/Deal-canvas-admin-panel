-- Adds the table behind the admin panel's Banners section: the homepage's
-- hero carousel slides ('hero') and the 3-across promo banner row further
-- down the page ('promo'), both currently hardcoded in the site repo
-- (HeroCarousel.tsx's SLIDES array and index.tsx's promoBanners array).
-- Safe to re-run (idempotent). Run this once in the Supabase SQL Editor,
-- same convention as scripts/create-cms-tables.sql.

create table if not exists banners (
  id text primary key,
  placement text not null check (placement in ('hero', 'promo')),
  image_url text not null,
  alt text not null default '',
  title text,
  subtitle text,
  href text,
  sort_order integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Seeds today's 8 hardcoded hero slides so the site keeps showing something
-- the moment it switches from the hardcoded SLIDES array to reading this
-- table, and the admin panel isn't empty on first load. These are the exact
-- URLs already live in HeroCarousel.tsx.
insert into banners (id, placement, image_url, alt, sort_order, visible) values
  ('BANNER-hero-1', 'hero', 'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1920&q=70', '', 0, true),
  ('BANNER-hero-2', 'hero', 'https://images.unsplash.com/photo-1606143412458-acc5f86de897?auto=format&fit=crop&w=1920&q=70', '', 1, true),
  ('BANNER-hero-3', 'hero', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1920&q=70', '', 2, true),
  ('BANNER-hero-4', 'hero', 'https://images.unsplash.com/photo-1629511565591-a1d494ad6c58?auto=format&fit=crop&w=1920&q=70', '', 3, true),
  ('BANNER-hero-5', 'hero', 'https://images.unsplash.com/photo-1555529771-122e5d9f2341?auto=format&fit=crop&w=1920&q=70', '', 4, true),
  ('BANNER-hero-6', 'hero', 'https://images.unsplash.com/photo-1630905119003-329447458f85?auto=format&fit=crop&w=1920&q=70', '', 5, true),
  ('BANNER-hero-7', 'hero', 'https://images.unsplash.com/photo-1561715276-a2d087060f1d?auto=format&fit=crop&w=1920&q=70', '', 6, true),
  ('BANNER-hero-8', 'hero', 'https://images.unsplash.com/photo-1595991209266-5ff5a3a2f008?auto=format&fit=crop&w=1920&q=70', '', 7, true)
on conflict (id) do nothing;

-- Seeds today's 3 promo banners with their real title/subtitle/href, but
-- reusing 3 of the (already-verified-working) hero image URLs above as
-- placeholders — the real promo images are locally bundled asset files in
-- the site repo (@/assets/cat-fashion.jpg etc.), which have no stable public
-- URL to seed here. Replace these image_url values with real uploaded URLs
-- from the admin panel before relying on this in production.
insert into banners (id, placement, image_url, alt, title, subtitle, href, sort_order, visible) values
  ('BANNER-promo-1', 'promo', 'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1280&q=70', '', 'Live Deals, Updated Hourly', 'Every markdown we track, in one feed.', '/deals', 0, true),
  ('BANNER-promo-2', 'promo', 'https://images.unsplash.com/photo-1606143412458-acc5f86de897?auto=format&fit=crop&w=1280&q=70', '', 'Sale Ends Soon', 'Deepest discounts before they''re gone.', '/shop?view=sale', 1, true),
  ('BANNER-promo-3', 'promo', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1280&q=70', '', 'Just Landed', 'This week''s newest arrivals across every store.', '/shop?view=new', 2, true)
on conflict (id) do nothing;

alter table banners enable row level security;

drop policy if exists "public read" on banners;
create policy "public read" on banners for select using (true);

drop policy if exists "admin write" on banners;
create policy "admin write" on banners for all to authenticated using (is_admin()) with check (is_admin());
