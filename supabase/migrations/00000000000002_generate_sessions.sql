-- Generates bookable class_sessions for a week from the recurring
-- class_schedule template. Admins call this once a week to seed the
-- schedule, then adjust/override individual sessions or bulk-import a
-- different week via CSV/XLSX/Google Sheets.
create function generate_sessions_from_schedule(p_week_start date)
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
    -- day_of_week: 0 = Sunday .. 6 = Saturday, matching p_week_start being a Sunday.
    v_session_date := p_week_start + v_row.day_of_week;

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
