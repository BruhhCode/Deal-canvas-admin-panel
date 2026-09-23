-- Restores write policies on the `products` table for authenticated users.
-- These were lost when the table was recreated with a new primary key
-- (slug instead of id) during the main site's schema migration.
-- Run this in the Supabase SQL Editor.

drop policy if exists "products_insert_authenticated" on public.products;
create policy "products_insert_authenticated"
  on public.products for insert
  to authenticated
  with check (true);

drop policy if exists "products_update_authenticated" on public.products;
create policy "products_update_authenticated"
  on public.products for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "products_delete_authenticated" on public.products;
create policy "products_delete_authenticated"
  on public.products for delete
  to authenticated
  using (true);
