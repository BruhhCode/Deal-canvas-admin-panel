-- Adds the table behind the admin panel's Blog section: the site's /blog
-- and /blog/$slug editorial content, previously hardcoded in the site
-- repo's src/data/blog.ts. Safe to re-run (idempotent). Run this once in
-- the Supabase SQL Editor, same convention as scripts/create-cms-tables.sql
-- and scripts/create-banners-table.sql.

create table if not exists blog_posts (
  slug text primary key,
  title text not null,
  excerpt text not null,
  category text not null,
  read_time text not null default '5 min',
  author text not null default 'DealsCanvas Editorial',
  image_url text not null,
  -- Plain text, paragraphs separated by a blank line — same convention as
  -- pages.content, deliberately not HTML.
  body text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seeds today's 6 hardcoded posts so the panel isn't empty on first load.
-- image_url reuses one already-verified-working Unsplash URL (also seeded
-- into banners) as a shared placeholder for all 6 -- the real images are
-- locally bundled asset files in the site repo (@/assets/cat-*.jpg), which
-- have no stable public URL to seed here. Replace these via the admin
-- panel with real image URLs before relying on this in production.
insert into blog_posts (slug, title, excerpt, category, read_time, author, image_url, body, status, published_at) values
  (
    'how-to-actually-tell-if-a-sale-is-a-real-deal',
    'How to Actually Tell If a Sale Is a Real Deal',
    'Inflated "was" prices are everywhere. Here''s how to check whether a discount is genuine before you buy.',
    'Shopping Tips', '5 min', 'DealsCanvas Editorial',
    'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1920&q=70',
    E'Retailers know shoppers respond to big percentage-off numbers, and a strike-through price is one of the easiest things to inflate. Before trusting a discount, check the item''s price history — a site that''s shown a product at the "sale" price for most of the last month isn''t really discounting it.\n\nA quick way to sanity-check any deal: search the exact product name plus the word "price history" or use a browser extension that tracks it. If the current price matches what it''s been for weeks, the surrounding banner is decoration, not a real markdown.\n\nGenuine deals tend to cluster around predictable moments — end-of-season clearance, a named sale event, or a retailer clearing stock ahead of a new collection. Discounts that appear with no clear reason and disappear just as suddenly are worth a second look before you check out.',
    'PUBLISHED', '2026-09-12'
  ),
  (
    'capsule-wardrobe-on-a-budget',
    'Building a Capsule Wardrobe Without Overspending',
    'Fewer pieces, worn more often — a practical approach to buying clothes you''ll actually reach for.',
    'Fashion', '6 min', 'DealsCanvas Editorial',
    'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1920&q=70',
    E'A capsule wardrobe isn''t about owning less for its own sake — it''s about every piece earning its place by pairing with several others. Before buying anything new, it''s worth listing what you already own in the same category and asking whether the new piece adds a genuinely new combination.\n\nNeutral basics (a good white shirt, a well-cut pair of dark jeans, a versatile jacket) are worth paying closer to full price for, since they get worn constantly and outlast a season''s trend cycle. Save the discount-hunting for statement pieces you''ll wear less often.\n\nTrack the categories you''re missing rather than shopping by browsing — it''s the single biggest lever against impulse buys that end up unworn.',
    'PUBLISHED', '2026-09-08'
  ),
  (
    'skincare-routine-that-doesnt-need-ten-products',
    'A Skincare Routine That Doesn''t Need Ten Products',
    'Cleanser, moisturizer, SPF — why the simplest routine is usually the one that sticks.',
    'Beauty', '4 min', 'DealsCanvas Editorial',
    'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1920&q=70',
    E'It''s easy to end up with a shelf of half-used products chasing a ten-step routine you saw online. Dermatologists consistently point to three non-negotiables: a gentle cleanser, a moisturizer suited to your skin type, and daily SPF — everything else is optional refinement, not a requirement.\n\nIf you want to add one more step, a single active ingredient (like a retinoid or vitamin C serum) introduced slowly does more for most people than five new products at once. Layering too many actives together is a common cause of irritation, not better results.\n\nWhen a bundle deal comes up, check whether you''d actually use every item in it within its shelf life — a 40% discount on a product that expires unused isn''t a saving.',
    'PUBLISHED', '2026-09-01'
  ),
  (
    'sneaker-care-guide-make-them-last',
    'The Sneaker Care Guide: Make Them Last Twice as Long',
    'Cleaning, rotation and storage habits that noticeably extend a sneaker''s life.',
    'Fashion', '5 min', 'DealsCanvas Editorial',
    'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1920&q=70',
    E'Wearing the same pair of sneakers every day is the fastest way to wear them out — the midsole foam needs roughly 24 hours to decompress between wears to keep its cushioning. Rotating two pairs, even both budget options, will outlast one pair worn daily.\n\nMost suede and leather sneakers benefit from a protective spray applied before the first wear, not after the first stain. Reapply every few months if you''re wearing them regularly.\n\nStore sneakers away from direct sunlight and stuffed with paper (not left flat) to help them keep their shape — a cheap fix that meaningfully affects resale value if you ever sell them on.',
    'PUBLISHED', '2026-08-26'
  ),
  (
    'when-do-prices-actually-drop-a-seasonal-calendar',
    'When Do Prices Actually Drop? A Seasonal Shopping Calendar',
    'What tends to go on sale each month, so you''re not buying at the most expensive point in the cycle.',
    'Shopping Tips', '7 min', 'DealsCanvas Editorial',
    'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1920&q=70',
    E'Retail discounting follows a rhythm that repeats every year. Outerwear and boots are cheapest in late winter as stores clear season stock, swimwear and sandals are cheapest in late summer for the same reason, and January is consistently the strongest month for fitness and loungewear.\n\nBig named sale events are good for stocking up on basics you already know you''ll use, but they''re rarely the cheapest point for a specific item you have your eye on — that''s more often a quiet markdown a few weeks after a new collection lands.\n\nSetting a price alert on the exact item, rather than waiting for a sale banner, tends to catch the real low point more reliably than shopping around named events.',
    'PUBLISHED', '2026-08-19'
  ),
  (
    'accessorizing-on-a-budget',
    'Accessorizing on a Budget: Small Buys, Big Difference',
    'How a handful of inexpensive accessories can refresh an entire wardrobe without a big spend.',
    'Trends', '4 min', 'DealsCanvas Editorial',
    'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1920&q=70',
    E'Accessories carry an outsized share of how an outfit reads — a belt, a bag or a scarf can shift the same base pieces from casual to polished. Because they''re worn against different outfits constantly, it''s one category where buying a slightly bolder or trend-led piece at a low price makes more sense than doing the same with clothing.\n\nGold and silver-tone jewelry dates less than trend colors, so it''s usually the safer place to spend a little more; costume pieces in a strong seasonal color are the better place to chase a discount.\n\nA well-chosen bag is the accessory most worth waiting for the right discount on, since it typically gets the heaviest daily use of anything in this category.',
    'PUBLISHED', '2026-08-11'
  )
on conflict (slug) do nothing;

alter table blog_posts enable row level security;

drop policy if exists "public read published" on blog_posts;
create policy "public read published" on blog_posts for select using (status = 'PUBLISHED');

drop policy if exists "admin all" on blog_posts;
create policy "admin all" on blog_posts for all to authenticated using (is_admin()) with check (is_admin());
