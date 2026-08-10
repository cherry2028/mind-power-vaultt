-- ============================================================================
-- MPV — pending Supabase setup (run once, top to bottom, in the SQL Editor)
-- ============================================================================
-- Bundles the three migrations the live app is waiting on:
--   1. review_submissions      — the moderation queue for student reviews (Feature 4)
--   2. review_uploads bucket    — where student voice notes upload (Feature 4b)
--   3. reviews-table lockdown   — drop the open anon-write policies (closes the
--                                 spam hole now that admin writes go server-side)
-- Every statement is idempotent and safe to re-run.
-- ============================================================================


-- ── 1. review_submissions ───────────────────────────────────────────────────
-- Students have a real Supabase session, so they insert here directly under RLS.
-- They can never write the public `reviews` table (admin-only), so the sales
-- page can't be spammed. You promote good ones from the dashboard.

create table if not exists public.review_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  text        text,
  audio_url   text,
  status      text not null default 'pending',   -- pending | published | dismissed
  created_at  timestamptz not null default now()
);

alter table public.review_submissions enable row level security;

drop policy if exists "own submit" on public.review_submissions;
create policy "own submit" on public.review_submissions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own read" on public.review_submissions;
create policy "own read" on public.review_submissions
  for select to authenticated using (user_id = auth.uid());

create index if not exists review_submissions_status_idx
  on public.review_submissions (status, created_at desc);


-- ── 2. review_uploads bucket (student voice notes) ──────────────────────────
-- A student may upload ONLY into a folder named after their own uid. Public
-- read so the note plays back in the sheet and, once published, on the site.

insert into storage.buckets (id, name, public)
values ('review_uploads', 'review_uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "review_uploads own insert" on storage.objects;
create policy "review_uploads own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review_uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "review_uploads public read" on storage.objects;
create policy "review_uploads public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'review_uploads');


-- ── 3. Lock down the public `reviews` table + audio_reviews/review_images ────
-- Admin writes now go through /api/admin-reviews with the service role (which
-- bypasses RLS), so the table needs NO client write policy. Drop every open
-- INSERT/UPDATE/DELETE policy; keep public READ only.

alter table public.reviews enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'reviews'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.reviews', p.policyname);
  end loop;
end $$;

drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews
  for select to anon, authenticated using (true);

-- Same for the two admin buckets: drop any anon/authenticated WRITE policy,
-- keep public read (the files must render on the site). Admin uploads use
-- signed URLs minted server-side, which need no such policy.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (
        coalesce(qual::text, '')       like '%audio_reviews%'
        or coalesce(with_check::text,'') like '%audio_reviews%'
        or coalesce(qual::text, '')       like '%review_images%'
        or coalesce(with_check::text,'') like '%review_images%'
      )
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

update storage.buckets set public = true
  where name in ('audio_reviews', 'review_images');


-- ── 4. Verify (optional — should show public-read + own-submit only) ─────────
select 'reviews' as tbl, policyname, cmd, roles from pg_policies
  where schemaname = 'public' and tablename = 'reviews'
union all
select 'review_submissions', policyname, cmd, roles from pg_policies
  where schemaname = 'public' and tablename = 'review_submissions'
order by tbl, cmd;
