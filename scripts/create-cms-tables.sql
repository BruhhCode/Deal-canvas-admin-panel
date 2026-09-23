-- Adds the tables behind the admin panel's Navigation, Pages, FAQ, and
-- Contact Queries sections. Safe to re-run (everything is `if not exists` /
-- idempotent). Run this once in the Supabase SQL Editor.
--
-- Uses is_admin() (defined in the site repo's supabase/schema.sql, already
-- applied to this project — confirmed live: admin_users/is_admin() exist)
-- rather than the older wide-open `to authenticated with check (true)`
-- pattern used on some other tables — these are new tables, so there's no
-- reason to start them off with the same gap that's been repeatedly flagged
-- elsewhere in this project. If is_admin() doesn't exist yet when you run
-- this, run the site repo's schema.sql first (NOT this script's job to
-- create it — that function's home is the other repo).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- nav_items — the public site's header nav, editable from here instead of
-- hardcoded in Header.tsx.
-- ---------------------------------------------------------------------------
create table if not exists nav_items (
  slug text primary key,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Seeds the current hardcoded nav so switching over doesn't remove anything.
-- Upsert, not insert — safe to re-run without duplicating rows.
insert into nav_items (slug, label, href, sort_order, visible) values
  ('shop', 'Shop', '/shop', 10, true),
  ('deals', 'Deals', '/deals', 20, true),
  ('stores', 'Stores', '/stores', 30, true),
  ('brands', 'Brands', '/brands', 40, true),
  ('new-in', 'New In', '/shop?view=new', 50, true),
  ('sale', 'Sale', '/shop?view=sale', 60, true),
  ('trending', 'Trending', '/shop?view=trending', 70, true),
  ('sales-calendar', 'Sales Calendar', '/sales-calendar', 80, true),
  ('faq', 'FAQ', '/faq', 90, true),
  ('contact', 'Contact', '/contact', 100, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- pages — a minimal CMS. `content` is plain text, paragraphs separated by a
-- blank line (same convention as the site's existing guides.$slug.tsx,
-- which renders `body: string[]` as one <p> per entry) — deliberately not
-- HTML, so there's no dangerouslySetInnerHTML / stored-XSS surface even
-- though only admins can write it.
-- ---------------------------------------------------------------------------
create table if not exists pages (
  slug text primary key,
  title text not null,
  content text not null default '',
  meta_description text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- faqs — grouped by `section` (e.g. "Orders", "Shipping", "Returns") so the
-- public FAQ page can render one accordion group per section.
-- ---------------------------------------------------------------------------
create table if not exists faqs (
  id text primary key,
  section text not null,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- contact_messages — already defined in the site repo's schema.sql (the
-- /contact page already writes to it) but was never actually created in
-- this project — confirmed live: the table doesn't exist, so every contact
-- form submission on the site is currently failing silently into a toast
-- error. Mirrors that definition exactly, then adds the two columns the
-- admin UI needs (status tracking, an updated_at to know when it was last
-- touched) that the site-authored definition didn't need for its
-- insert-only use case.
-- ---------------------------------------------------------------------------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_at_idx on contact_messages(created_at desc);

alter table contact_messages add column if not exists status text not null default 'NEW' check (status in ('NEW', 'READ', 'RESOLVED'));
alter table contact_messages add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table nav_items enable row level security;
alter table pages enable row level security;
alter table faqs enable row level security;
alter table contact_messages enable row level security;

-- Public read: nav_items and faqs always (the site needs every row to
-- render); pages only its published rows (drafts stay admin-only).
drop policy if exists "public read" on nav_items;
create policy "public read" on nav_items for select using (true);

drop policy if exists "public read" on faqs;
create policy "public read" on faqs for select using (true);

drop policy if exists "public read published" on pages;
create policy "public read published" on pages for select using (status = 'PUBLISHED');

-- Admin (authenticated + is_admin()) read/write on all four — contact_messages
-- keeps its existing site-authored public-insert policy untouched (that's
-- the /contact form's only access; it doesn't need read/update/delete).
drop policy if exists "admin write" on nav_items;
create policy "admin write" on nav_items for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admin all" on pages;
create policy "admin all" on pages for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admin write" on faqs;
create policy "admin write" on faqs for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admin read" on contact_messages;
create policy "admin read" on contact_messages for select to authenticated using (is_admin());

drop policy if exists "admin update" on contact_messages;
create policy "admin update" on contact_messages for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admin delete" on contact_messages;
create policy "admin delete" on contact_messages for delete to authenticated using (is_admin());

drop policy if exists "public insert" on contact_messages;
create policy "public insert" on contact_messages for insert with check (true);
