-- Web Push subscriptions for the daily Telugu reminders.
--
-- One row per browser/device endpoint; a student may have several (phone,
-- laptop). Written by /api/push-subscribe using the verified auth.uid(), and
-- read by the GitHub Actions cron via the service role (which bypasses RLS).
-- Run in Supabase Dashboard → SQL Editor.

create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'Mind Power Vaultt Web Push endpoints. Keyed on the push endpoint (unique per browser); user_id ties it to the student so the cron can suppress reminders for tasks already done today.';

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Students may only see and remove their OWN subscriptions.
create policy "own push subs read" on public.push_subscriptions for select
  to authenticated using (user_id = auth.uid());

create policy "own push subs insert" on public.push_subscriptions for insert
  to authenticated with check (user_id = auth.uid());

create policy "own push subs update" on public.push_subscriptions for update
  to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own push subs delete" on public.push_subscriptions for delete
  to authenticated using (user_id = auth.uid());
