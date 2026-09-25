-- The actual workout content for a session (e.g. "5 RFT: 10 pull-ups, 15
-- push-ups, 20 air squats"), set by admins per session and shown to
-- members on the schedule.
alter table class_sessions add column wod text;

-- list_sessions() needs to return the new column too.
drop function if exists list_sessions(date, date);

create function list_sessions(p_from date, p_to date)
returns table (
  id uuid,
  class_type_id uuid,
  class_type_name text,
  color text,
  session_date date,
  start_time time,
  end_time time,
  capacity int,
  coach_id uuid,
  coach_name text,
  location text,
  status session_status,
  wod text,
  booked_count bigint,
  waitlist_count bigint,
  my_booking_id uuid,
  my_booking_status booking_status,
  my_waitlist_position int
)
language sql
security definer set search_path = public
stable
as $$
  select
    s.id,
    s.class_type_id,
    ct.name,
    ct.color,
    s.session_date,
    s.start_time,
    s.end_time,
    s.capacity,
    s.coach_id,
    coach.full_name,
    s.location,
    s.status,
    s.wod,
    coalesce(counts.booked_count, 0),
    coalesce(counts.waitlist_count, 0),
    mine.id,
    mine.status,
    mine.waitlist_position
  from class_sessions s
  join class_types ct on ct.id = s.class_type_id
  left join profiles coach on coach.id = s.coach_id
  left join lateral (
    select
      count(*) filter (where b.status = 'booked') as booked_count,
      count(*) filter (where b.status = 'waitlisted') as waitlist_count
    from bookings b
    where b.session_id = s.id
  ) counts on true
  left join bookings mine
    on mine.session_id = s.id
    and mine.user_id = auth.uid()
    and mine.status in ('booked', 'waitlisted')
  where s.session_date between p_from and p_to
  order by s.session_date, s.start_time;
$$;

revoke execute on function list_sessions(date, date) from public;
grant execute on function list_sessions(date, date) to authenticated;
