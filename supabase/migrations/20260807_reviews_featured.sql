-- "Feature on journal page" flag for reviews.
--
-- Featured reviews lead the reviews section on /get-journal and /portal — the
-- strongest proof meets a skeptical visitor first. Everything else still shows
-- below, in the admin panel's drag order.
--
-- Safe to re-run. Existing rows default to false, so nothing changes until the
-- admin actually stars a review.
-- Run in Supabase Dashboard -> SQL Editor.

alter table public.reviews
  add column if not exists featured boolean not null default false;

comment on column public.reviews.featured is
  'Shown first in the journal-page reviews section. Toggled from the admin panel (writes go through /api/admin-reviews with the service role).';

-- Ordering the page does on every load: featured first, then order_index.
create index if not exists reviews_featured_order_idx
  on public.reviews (featured desc, order_index asc);
