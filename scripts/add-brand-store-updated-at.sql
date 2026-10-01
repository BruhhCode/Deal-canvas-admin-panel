-- Run once in the Supabase SQL Editor.
-- Adds `updated_at` to `brands` and `stores` -- both tables already have the
-- column documented in the admin panel's Brand/Store types and written by
-- createBrand/updateBrand/createStore/updateStore (src/lib/data.ts), and the
-- Brands/Stores admin UI sorts/displays by it, but the column was never
-- actually added to these two tables when the rest of the schema picked it
-- up (every other catalog table has it). That mismatch is what throws
-- "Could not find the 'updated_at' column of 'stores' in the schema cache"
-- when editing a store (or brand) today.
alter table brands add column if not exists updated_at timestamptz not null default now();
alter table stores add column if not exists updated_at timestamptz not null default now();
