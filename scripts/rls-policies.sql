-- Grants any signed-in (authenticated) user full read/write access to the
-- DealCanvas admin tables. SELECT already works (existing policies), so this
-- only adds the missing INSERT/UPDATE/DELETE policies for the admin app.
--
-- Run this once in the Supabase SQL Editor (Database -> SQL Editor).

do $$
declare
  t text;
begin
  foreach t in array array['brands','stores','products','offers','deals','coupons','sale_events']
  loop
    execute format(
      'create policy "authenticated_insert_%1$s" on public.%1$s for insert to authenticated with check (true);',
      t
    );
    execute format(
      'create policy "authenticated_update_%1$s" on public.%1$s for update to authenticated using (true) with check (true);',
      t
    );
    execute format(
      'create policy "authenticated_delete_%1$s" on public.%1$s for delete to authenticated using (true);',
      t
    );
  end loop;
end $$;
