-- Members can only SELECT their own rows from `bookings` (see RLS above),
-- so they can't directly count how many people are booked into a class.
-- This function aggregates that server-side and also returns the caller's
-- own booking for each session, without exposing who else is attending.
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

grant execute on function list_sessions(date, date) to authenticated;
