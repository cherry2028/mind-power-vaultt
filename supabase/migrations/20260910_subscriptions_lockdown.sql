-- Subscriptions: close the paywall write hole, and put the table under source
-- control for the first time.
--
-- THE BUG (found 2026-09-10, fixed same day):
-- The policy "Users can update their own device_id" was written as
--     UPDATE ... USING (auth.email() = email)   -- no WITH CHECK
-- Postgres reuses USING as the check when WITH CHECK is omitted, so a student
-- could not change their `email` to someone else's. But a POLICY HAS NO COLUMN
-- SCOPE. Despite its name, that policy granted UPDATE on every other column of
-- the student's own row, and there were no triggers to compensate. Any student
-- with a valid session could run, from the browser console:
--
--     supabase.from('subscriptions')
--       .update({ expires_at: '2099-01-01', status: 'active' })
--       .eq('email', '<their own email>')
--
-- ...and grant themselves a permanent subscription. The anon key ships in the
-- client bundle by design, so no special tooling was required.
--
-- THE FIX: a column-level GRANT, which a policy cannot express. The policy is
-- kept as-is (it still restricts WHICH ROW); the grant restricts WHICH COLUMN.
-- Both are needed — neither alone is sufficient.
--
-- This table was originally created by hand in the dashboard and had no
-- migration, which is exactly why the drift was never reviewed. The full
-- definition is captured below so it is reproducible from source going forward.
--
-- Every statement is idempotent. Run in Supabase Dashboard -> SQL Editor.


-- ── 1. Table definition (as it exists in production 2026-09-10) ─────────────
create table if not exists public.subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null unique,
  name        text,
  phone       text,
  access_code text,
  status      text        default 'active',
  created_at  timestamptz default now(),
  expires_at  timestamptz not null,
  device_id   text
);

comment on table public.subscriptions is
  'Mind Power Vaultt paid access. One row per student, keyed on email. Written by /api/verify-payment (service role) on a successful Cashfree order; device_id is the only column a student may ever write, enforced by a column-level grant (see below), not by the RLS policy alone.';

comment on column public.subscriptions.device_id is
  'Single-device lock. The ONLY column authenticated users may update. Claimed at login by StudentPortal.jsx and re-checked every 60s by pages/Journal.jsx.';

comment on column public.subscriptions.status is
  'Free-text. Historically never read by any application code. As of 2026-09-10 check_entitlement() denies ONLY on cancelled | expired | refunded; null, empty and every other value are allowed, so an unknown value can never lock out a payer.';

alter table public.subscriptions enable row level security;


-- ── 2. Policies (row scope) ─────────────────────────────────────────────────
-- Idempotent: dropped and recreated so this file is the source of truth.
drop policy if exists "Service role full access" on public.subscriptions;
create policy "Service role full access" on public.subscriptions
  for all using (auth.role() = 'service_role');

drop policy if exists "Users can view their own subscription" on public.subscriptions;
create policy "Users can view their own subscription" on public.subscriptions
  for select using (auth.email() = email);

-- Duplicate of the policy above; dropped 2026-09-10.
drop policy if exists "Users can view own subscription" on public.subscriptions;

-- Row scope only. The COLUMN scope comes from the grant in section 3 — without
-- that grant this policy still permits writing every column of the own row.
drop policy if exists "Users can update their own device_id" on public.subscriptions;
create policy "Users can update their own device_id" on public.subscriptions
  for update using (auth.email() = email);

-- Deliberately NO insert policy and NO delete policy: subscriptions are created
-- and removed by the service role only.


-- ── 3. Column-level grants — THIS is what closes the hole ───────────────────
revoke update on public.subscriptions from anon, authenticated;
grant  update (device_id) on public.subscriptions to authenticated;

-- Defence in depth: Supabase's stock `grant all` left anon and authenticated
-- holding INSERT/DELETE/TRUNCATE too. Only the ABSENCE of a matching policy was
-- blocking those. Remove the grants as well. No client code needs them.
revoke insert, delete, truncate, references, trigger
  on public.subscriptions from anon, authenticated;


-- ── 4. reviews: drop the duplicate SELECT policy ────────────────────────────
-- "public read reviews" (defined in supabase/apply-pending.sql) is kept.
drop policy if exists "Anyone can read reviews" on public.reviews;


-- ── 5. Verify (optional) ────────────────────────────────────────────────────
-- Expect exactly one row: authenticated | UPDATE | device_id
--
-- select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--  where table_schema = 'public' and table_name = 'subscriptions'
--    and grantee in ('anon','authenticated') and privilege_type = 'UPDATE';
--
-- Expect: anon = SELECT, authenticated = SELECT, service_role = everything
--
-- select grantee, string_agg(distinct privilege_type, ', ' order by privilege_type)
--   from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'subscriptions'
--    and grantee in ('anon','authenticated','service_role')
--  group by grantee;
