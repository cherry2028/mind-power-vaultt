-- Cloud sync for the student journal (local-first, last-write-wins).
-- One jsonb row per student; the client reads/writes its OWN row only,
-- authorized by the verified session email. Run in Supabase Dashboard → SQL Editor.

create table if not exists public.journal_data (
  student_email text primary key,
  data          jsonb       not null,
  updated_at    timestamptz not null default now()
);

comment on table public.journal_data is
  'Mind Power Vaultt journal sync — full journal JSON per student, pushed by the app (debounced) and pulled on journal open. Last-write-wins; safe because the single-device lock prevents concurrent devices.';

alter table public.journal_data enable row level security;

-- Students can read/write ONLY their own row, via their verified session email
create policy "own journal read" on public.journal_data for select
  to authenticated using (student_email = (auth.jwt() ->> 'email'));

create policy "own journal insert" on public.journal_data for insert
  to authenticated with check (student_email = (auth.jwt() ->> 'email'));

create policy "own journal update" on public.journal_data for update
  to authenticated using (student_email = (auth.jwt() ->> 'email'))
  with check (student_email = (auth.jwt() ->> 'email'));
