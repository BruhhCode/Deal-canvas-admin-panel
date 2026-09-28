-- Run once in the Supabase SQL Editor.
-- Adds the "page" column so FAQs can be scoped per site page (Homepage,
-- Deals, Stores, Brands) instead of all living together on /faq. Existing
-- rows default to 'general' (today's single FAQ page) so nothing currently
-- published disappears.
alter table faqs add column if not exists page text not null default 'general';
