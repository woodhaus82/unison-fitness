-- Previously admin-only and manually triggered per week. Now called
-- transparently whenever any date range is viewed (member schedule, admin
-- calendar), so browsing forward by weeks/months "just works" without an
-- explicit generate step. Safe to open up to any authenticated member:
-- it only reads the already publicly-readable class_schedule template and
-- idempotently inserts missing sessions (on conflict do nothing) — it
-- can't alter or destroy anything that exists. A generous date bound
-- guards against pathological/abusive far-future calls.
create or replace function generate_sessions_from_schedule(p_week_start date)
returns setof class_sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_row class_schedule;
  v_session_date date;
begin
  if p_week_start < current_date - interval '1 month' or p_week_start > current_date + interval '18 months' then
    raise exception 'week out of range';
  end if;

  for v_row in select * from class_schedule where active loop
    v_session_date := p_week_start + ((v_row.day_of_week + 6) % 7);

    insert into class_sessions (
      class_type_id, schedule_id, session_date, start_time, end_time,
      capacity, coach_id, location
    )
    select
      v_row.class_type_id, v_row.id, v_session_date, v_row.start_time, v_row.end_time,
      coalesce(v_row.capacity, ct.default_capacity), v_row.coach_id, v_row.location
    from class_types ct where ct.id = v_row.class_type_id
    on conflict (class_type_id, session_date, start_time) do nothing;
  end loop;

  return query
  select * from class_sessions
  where session_date >= p_week_start and session_date < p_week_start + 7
  order by session_date, start_time;
end;
$$;
