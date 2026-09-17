-- Who is stuck on an old build? One row per journal, from the build stamp the
-- journal writes into its own cloud row (data.mpvf._build, format
-- "YYYYMMDD.HHMM-sha", UTC) every time it opens on a new build and syncs.
--
-- The owner messages students himself; the app does not nag. Open this in
-- Supabase → Table Editor → journal_build_status, or:
--   select * from journal_build_status where stale_over_3_days;
--
-- behind_since = when the first build NEWER than the student's was first seen
-- in any journal (normally the owner's, who opens every release). A student is
-- stale when that was more than 3 days ago. last_sync_after_newer = the app
-- was actually used on the old build after a newer one existed (really stuck),
-- as opposed to simply not opened.
--
-- security_invoker + revoke: students (anon/authenticated) cannot read it;
-- only the dashboard / service role can.

create or replace view public.journal_build_status
with (security_invoker = true) as
with rows as (
  select
    j.student_email,
    j.updated_at                                   as last_sync,
    j.data -> 'mpvf' ->> '_build'                  as build,
    case when (j.data -> 'mpvf' ->> '_build') ~ '^\d{8}\.\d{4}'
      then to_timestamp(substring(j.data -> 'mpvf' ->> '_build' from '^(\d{8}\.\d{4})'), 'YYYYMMDD.HH24MI')
    end                                            as build_time
  from public.journal_data j
),
builds as (
  select distinct build, build_time from rows where build_time is not null
),
latest as (
  select build, build_time from builds order by build_time desc limit 1
)
select
  r.student_email,
  r.build,
  r.build_time,
  r.last_sync,
  (select l.build from latest l)                               as newest_build_seen,
  nb.behind_since,
  case when nb.behind_since is not null
    then round((extract(epoch from (now() - nb.behind_since)) / 86400)::numeric, 1) end as days_behind,
  coalesce(nb.behind_since < now() - interval '3 days', r.build_time is null) as stale_over_3_days,
  (nb.behind_since is not null and r.last_sync > nb.behind_since) as last_sync_after_newer,
  (r.student_email like 'ssjservices2023+%')                  as is_test_account
from rows r
left join lateral (
  select min(b.build_time) as behind_since
  from builds b
  where r.build_time is null or b.build_time > r.build_time
) nb on true
order by stale_over_3_days desc, days_behind desc nulls last, r.student_email;

comment on view public.journal_build_status is
  'Per-journal build freshness from data.mpvf._build. stale_over_3_days = a newer build has existed for >3 days (or no build recorded). Owner-only.';

revoke all on public.journal_build_status from anon, authenticated;
