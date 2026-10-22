-- Run once in the Supabase SQL Editor.
-- Widens site_theme.active_theme's CHECK constraint to allow 'halloween' --
-- the table was created (scripts/create-site-theme-table.sql) before this
-- theme existed. Safe to re-run.
alter table site_theme drop constraint if exists site_theme_active_theme_check;
alter table site_theme add constraint site_theme_active_theme_check
  check (active_theme in ('default', 'christmas', 'halloween'));
