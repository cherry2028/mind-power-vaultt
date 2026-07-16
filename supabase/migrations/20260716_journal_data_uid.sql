-- Re-key journal sync on auth.uid() instead of email.
--
-- WHY: students log in via phone OTP. Their JWT has NO email claim, so the
-- old RLS policies (student_email = auth.jwt()->>'email') compared against
-- NULL and rejected every read/write — the app showed "⚠ offline" forever.
-- auth.uid() exists for EVERY auth method (phone, email, magic link), so the
-- table is now keyed on user_id. student_email stays as an informational
-- column for dashboard lookups only — it is never used for authorization.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run once; the old table is
-- kept as journal_data_email_backup (drop it manually after verifying).

-- 1. Keep the old email-keyed table as a backup
alter table public.journal_data rename to journal_data_email_backup;

-- 2. New table keyed on the auth user id
create table public.journal_data (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  student_email text,
  data          jsonb       not null,
  updated_at    timestamptz not null default now()
);

comment on table public.journal_data is
  'Mind Power Vaultt journal sync — full journal JSON per student, keyed on auth.uid() (works for phone-OTP users with no email claim). Pushed by the app (debounced), pulled on journal open. Last-write-wins; safe because the single-device lock prevents concurrent devices.';

-- 3. Migrate existing rows where the email matches an auth user
insert into public.journal_data (user_id, student_email, data, updated_at)
select u.id, b.student_email, b.data, b.updated_at
from public.journal_data_email_backup b
join auth.users u on lower(u.email) = lower(b.student_email);

-- 4. RLS: each student reads/writes ONLY their own row, by user id
alter table public.journal_data enable row level security;

create policy "own journal read" on public.journal_data for select
  to authenticated using (user_id = auth.uid());

create policy "own journal insert" on public.journal_data for insert
  to authenticated with check (user_id = auth.uid());

create policy "own journal update" on public.journal_data for update
  to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5. weekly_reports: written only by the service role (RLS with no policies —
--    that model is already phone-OTP-safe and stays unchanged). But the
--    student_email NOT NULL constraint broke saves for phone-OTP users whose
--    session has no email. Key each report to the user id and store phone
--    for mentor lookups.
alter table public.weekly_reports
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists student_phone text;

alter table public.weekly_reports alter column student_email drop not null;

create index if not exists weekly_reports_user_week_idx
  on public.weekly_reports (user_id, week_end desc);
