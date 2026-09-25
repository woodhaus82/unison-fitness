-- Cancels an upcoming session. If nobody is booked in, it's just deleted
-- outright. If members are booked/waitlisted, the session and their
-- bookings are marked cancelled (preserving history) and each affected
-- member gets a 'class_cancelled' notification queued for email dispatch.
create function cancel_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_has_bookings boolean;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select exists(
    select 1 from bookings where session_id = p_session_id and status in ('booked', 'waitlisted')
  ) into v_has_bookings;

  if v_has_bookings then
    with cancelled as (
      update bookings
      set status = 'cancelled', cancelled_at = now()
      where session_id = p_session_id and status in ('booked', 'waitlisted')
      returning id, user_id
    )
    insert into notification_log (user_id, booking_id, type)
    select user_id, id, 'class_cancelled' from cancelled;

    update class_sessions set status = 'cancelled' where id = p_session_id;
  else
    delete from class_sessions where id = p_session_id;
  end if;
end;
$$;

revoke execute on function cancel_session(uuid) from public;
grant execute on function cancel_session(uuid) to authenticated;

-- Cancelled sessions shouldn't be bookable, and shouldn't show up in the
-- member-facing schedule (affected members are notified separately).
create or replace function book_class(p_session_id uuid)
returns bookings
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity int;
  v_status session_status;
  v_booked_count int;
  v_next_position int;
  v_booking bookings;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform 1 from class_sessions where id = p_session_id for update;

  select capacity, status into v_capacity, v_status from class_sessions where id = p_session_id;
  if v_capacity is null then
    raise exception 'session not found';
  end if;
  if v_status <> 'scheduled' then
    raise exception 'this class has been cancelled';
  end if;

  select count(*) into v_booked_count
  from bookings
  where session_id = p_session_id and status = 'booked';

  if v_booked_count < v_capacity then
    insert into bookings (session_id, user_id, status)
    values (p_session_id, v_user_id, 'booked')
    returning * into v_booking;
  else
    select coalesce(max(waitlist_position), 0) + 1 into v_next_position
    from bookings
    where session_id = p_session_id and status = 'waitlisted';

    insert into bookings (session_id, user_id, status, waitlist_position)
    values (p_session_id, v_user_id, 'waitlisted', v_next_position)
    returning * into v_booking;
  end if;

  insert into notification_log (user_id, booking_id, type)
  values (v_user_id, v_booking.id, 'booking_confirmation');

  return v_booking;
end;
$$;

create or replace function list_sessions(p_from date, p_to date)
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
    and s.status = 'scheduled'
  order by s.session_date, s.start_time;
$$;
