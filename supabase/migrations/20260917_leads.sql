-- Durable leads. Until now a lead existed only as a Telegram message: no
-- database row, /api/notify returned 200 even when Telegram failed, and the
-- form showed success regardless. Vercel Hobby keeps function logs for one
-- hour, so a lost lead left no trace at all.
--
-- /api/notify now INSERTS here first (service role) and only then emails and
-- notifies. If this insert fails the visitor is told and offered WhatsApp.
--
-- No RLS policies on purpose: anon and authenticated can neither read nor
-- write phone numbers. Only the service role (server) touches this table.
-- Run in Supabase Dashboard → SQL Editor (staging first, then production).

create table if not exists public.leads (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  source         text        not null default 'quiz'
                             check (char_length(source) <= 40),
  name           text        not null check (char_length(name) between 1 and 100),
  phone          text        not null check (phone ~ '^[0-9]{10,15}$'),
  email          text        check (email is null or char_length(email) <= 254),
  level          text        check (level is null or char_length(level) <= 40),
  lang           text        check (lang is null or lang in ('te', 'en')),
  report         jsonb,
  -- delivery outcome, filled in after the row exists
  email_sent     boolean     not null default false,
  telegram_ok    boolean,    -- null = not attempted (yet)
  telegram_error text        check (telegram_error is null or char_length(telegram_error) <= 300),
  notified_at    timestamptz
);

comment on table public.leads is
  'Mind Power Vaultt quiz leads. Written by /api/notify BEFORE any email/Telegram, so a failed notification never loses a lead. telegram_ok is not true = K Prasad was not told; follow up from here.';

create index if not exists leads_created_idx on public.leads (created_at desc);

-- "Leads nobody was told about" — the one query that matters operationally.
create index if not exists leads_unnotified_idx on public.leads (created_at desc)
  where telegram_ok is not true;

alter table public.leads enable row level security;
revoke all on table public.leads from anon, authenticated;
