-- Adds `products` to the Realtime publication so the main site's
-- live-catalog.ts can receive postgres_changes events for it — currently
-- only offers/deals/sale_events are in this publication, which is why new
-- products created in the admin panel never appeared live.
-- Run this in the Supabase SQL Editor.

alter publication supabase_realtime add table public.products;
