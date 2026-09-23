-- Adds the columns behind self-hosted product/brand/store images (see
-- scripts/seed.js, backfill-product-images.mjs, backfill-brand-logos.mjs).
-- Safe to re-run (every ADD COLUMN is `if not exists`). Run this once in the
-- Supabase SQL Editor before running any of those scripts.
--
-- `image`/`images` on products and (once added) `logo_url` on brands/stores
-- keep being the columns everything already reads — they get overwritten to
-- point at our own Storage URLs. The new `*_source_url` columns preserve the
-- original retailer/CDN URL so a source can be re-processed later (e.g. if
-- quality settings change) without needing it re-supplied from outside.

alter table products add column if not exists image_source_url text;
-- Mirrors `images` (jsonb array) — same order, one original URL per
-- processed gallery image.
alter table products add column if not exists images_source_urls jsonb;

alter table brands add column if not exists logo_url text;
alter table brands add column if not exists logo_source_url text;

alter table stores add column if not exists logo_url text;
alter table stores add column if not exists logo_source_url text;
