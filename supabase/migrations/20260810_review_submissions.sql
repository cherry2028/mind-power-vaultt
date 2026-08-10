-- Feature 4: student review submissions (moderation queue).
--
-- Students CANNOT write to the public `reviews` table — that is admin-only
-- (PR #92), and rightly so, or the sales page could be spammed. But logged-in
-- students DO have a real Supabase auth session, so their submissions land
-- here first, gated by RLS to their own uid, and you promote the good ones into
-- `reviews` from the admin panel.
--
-- Moderation for now: review rows in the Supabase dashboard (service role sees
-- all), then add the good ones via the admin panel's "Add review". No new
-- serverless function is needed (the project is at the Hobby 12-function cap).
-- Run in Supabase Dashboard -> SQL Editor.

create table if not exists public.review_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  text        text,
  audio_url   text,                       -- reserved for the voice-note follow-up
  status      text not null default 'pending',  -- pending | published | dismissed
  created_at  timestamptz not null default now()
);

alter table public.review_submissions enable row level security;

-- A student may submit, and read back only their OWN submissions.
drop policy if exists "own submit" on public.review_submissions;
create policy "own submit" on public.review_submissions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own read" on public.review_submissions;
create policy "own read" on public.review_submissions
  for select to authenticated using (user_id = auth.uid());

-- No update/delete policy: submissions are immutable from the client. You
-- moderate them with the service role (dashboard), never the public key.

create index if not exists review_submissions_status_idx
  on public.review_submissions (status, created_at desc);
