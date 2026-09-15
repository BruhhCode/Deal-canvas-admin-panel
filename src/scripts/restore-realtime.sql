-- Re-adds products/brands/stores to the supabase_realtime publication.
--
-- Health check (2026-09-15) found products, brands and stores are NOT
-- currently in the publication even though:
--   (a) products was already added once before via enable-products-realtime.sql
--       and confirmed working live (Adidas product test), and
--   (b) the site's live-catalog.ts now subscribes to brands/stores changes too,
--       assuming they're published.
-- Likely toggled off/never turned on via the Supabase dashboard's Database ->
-- Replication screen. offers/deals/sale_events were re-verified live and are
-- unaffected. Idempotent (checks pg_publication_tables first, unlike a plain
-- `alter publication ... add table`, which errors if the table is already in
-- the publication) — safe to re-run.
-- Run this in the Supabase SQL Editor.

do $$
declare
  t text;
begin
  foreach t in array array['products','brands','stores']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
