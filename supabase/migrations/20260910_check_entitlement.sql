-- check_entitlement() — the server-side paywall gate.
--
-- WHY THIS EXISTS: /journal only ever required a valid Supabase access token.
-- pages/Journal.jsx never re-checked expires_at, nor that a subscription row
-- existed at all, so anyone who could obtain a token for their own email (via
-- signInWithOtp on the public portal) had full journal access without paying.
--
-- WHY AN RPC AND NOT A VERCEL FUNCTION: the project sits at the Hobby
-- 12-function cap, and all 12 are referenced from src/. A SECURITY DEFINER
-- function costs no function slot, needs no service-role key anywhere, has no
-- cold start, and decides entitlement inside the database that owns the data.
--
-- It takes NO parameters. The identity comes from the caller's own JWT, so
-- there is no way to probe another student's entitlement with it.
--
-- Run in Supabase Dashboard -> SQL Editor. Idempotent.

create or replace function public.check_entitlement()
returns jsonb
language plpgsql
security definer
-- Pinned search_path: a SECURITY DEFINER function without this can be hijacked
-- by a caller-controlled search_path.
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_sub   public.subscriptions%rowtype;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  -- Phone-OTP sessions carry no email claim, and `subscriptions` is keyed on
  -- email, so such an account can never hold a subscription. Denying here also
  -- closes the obvious bypass (sign up by phone -> no email -> skip the gate).
  if v_email = '' then
    return jsonb_build_object('allowed', false, 'reason', 'no_email', 'expires_at', null);
  end if;

  select * into v_sub
    from public.subscriptions
   where lower(email) = v_email
   limit 1;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_subscription', 'expires_at', null);
  end if;

  if v_sub.expires_at <= now() then
    return jsonb_build_object('allowed', false, 'reason', 'expired', 'expires_at', v_sub.expires_at);
  end if;

  -- `status` has no established semantics — every row in production reads
  -- 'active', and no application code has ever read the column. So deny ONLY on
  -- an explicit negative value. null, '', and any unknown value are allowed:
  -- inventing a stricter rule here would lock out a paying student.
  if lower(coalesce(v_sub.status, '')) in ('cancelled', 'expired', 'refunded') then
    return jsonb_build_object('allowed', false, 'reason', 'cancelled', 'expires_at', v_sub.expires_at);
  end if;

  return jsonb_build_object('allowed', true, 'reason', 'ok', 'expires_at', v_sub.expires_at);
end;
$$;

comment on function public.check_entitlement() is
  'Returns {allowed, reason, expires_at} for the CALLING user, derived from their own JWT email. reason: ok | no_subscription | expired | cancelled | no_email. Callers fail OPEN on transport errors — a database outage must not lock out paying students mid-session.';

-- Only a logged-in student may ask, and only about themselves.
revoke all on function public.check_entitlement() from public;
revoke all on function public.check_entitlement() from anon;
grant execute on function public.check_entitlement() to authenticated;
