-- generate_sessions_from_schedule() originally assumed p_week_start was a
-- Sunday (offset = day_of_week directly). The admin UI's week views are
-- Monday-anchored, so recompute the offset for a Monday-anchored
-- p_week_start instead: day_of_week uses the fixed 0=Sunday..6=Saturday
-- convention (matches time_slots/class_schedule), but Sunday is now the
-- *last* day of the week rather than the first.
create or replace function generate_sessions_from_schedule(p_week_start date)
returns setof class_sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_row class_schedule;
  v_session_date date;
begin
  if not is_admin() then
    raise exception 'not authorized';
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
