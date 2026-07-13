-- Weekly journal report records — one row per report a student generates
-- and shares from the journal. Written only by /api/save-weekly-report
-- (service role). Run this in Supabase Dashboard → SQL Editor.

create table if not exists public.weekly_reports (
  id            bigint generated always as identity primary key,
  student_email text        not null,
  student_name  text,
  week_start    date        not null,
  week_end      date        not null,
  report_data   jsonb       not null,
  submitted_at  timestamptz not null default now()
);

comment on table public.weekly_reports is
  'Permanent copies of student weekly journal reports (Mind Power Vaultt). Inserted by the save-weekly-report serverless function using the service role key.';

create index if not exists weekly_reports_email_week_idx
  on public.weekly_reports (student_email, week_end desc);

create index if not exists weekly_reports_submitted_idx
  on public.weekly_reports (submitted_at desc);

-- Lock the table down: RLS enabled with NO policies means the anon and
-- authenticated roles can neither read nor write. Only the service role
-- (used by the serverless function, and by you in the dashboard) has access.
alter table public.weekly_reports enable row level security;
