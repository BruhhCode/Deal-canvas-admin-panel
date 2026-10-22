-- Run once in the Supabase SQL Editor.
-- Adds the table behind the admin panel's new Themes section: a single-row
-- config holding which festive theme is currently active on the site
-- (palette + decorative effect + homepage copy, all code-defined in the
-- site repo per theme key — this table only stores the *selection*, not
-- the theme's actual colors/effects). Safe to re-run (idempotent).
create table if not exists site_theme (
  id text primary key default 'singleton',
  active_theme text not null default 'default' check (active_theme in ('default', 'christmas')),
  updated_at timestamptz not null default now()
);

insert into site_theme (id, active_theme) values ('singleton', 'default')
on conflict (id) do nothing;

alter table site_theme enable row level security;

drop policy if exists "public read" on site_theme;
create policy "public read" on site_theme for select using (true);

drop policy if exists "admin write" on site_theme;
create policy "admin write" on site_theme for all to authenticated using (is_admin()) with check (is_admin());
