-- session_date/start_time/end_time are entered and displayed as UK local
-- wall-clock time (the gym is in Poole, UK), but every comparison against
-- now() was comparing that naive value against an absolute UTC instant —
-- correct only when UTC happens to equal UK local time (GMT, winter).
-- During BST (UTC+1, summer) this made the system think it was an hour
-- earlier than it really was, e.g. letting members book a class that had
-- already started. `now() at time zone 'Europe/London'` converts the
-- current instant into UK wall-clock time (DST-aware), which is what
-- these comparisons actually need.

create or replace function book_class(p_session_id uuid)
returns bookings
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity int;
  v_status session_status;
  v_session_date date;
  v_start_time time;
  v_booked_count int;
  v_next_position int;
  v_booking bookings;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform 1 from class_sessions where id = p_session_id for update;

  select capacity, status, session_date, start_time
    into v_capacity, v_status, v_session_date, v_start_time
  from class_sessions where id = p_session_id;

  if v_capacity is null then
    raise exception 'session not found';
  end if;
  if v_status <> 'scheduled' then
    raise exception 'this class has been cancelled';
  end if;
  if (v_session_date + v_start_time) < (now() at time zone 'Europe/London') then
    raise exception 'this class has already happened';
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

create or replace function cancel_booking(p_booking_id uuid)
returns bookings
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking bookings;
  v_session class_sessions;
  v_cutoff_minutes int;
  v_minutes_until_class numeric;
  v_was_booked boolean;
  v_next_waitlisted bookings;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if v_booking is null or v_booking.user_id <> v_user_id then
    raise exception 'booking not found';
  end if;
  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'booking is not active';
  end if;

  select * into v_session from class_sessions where id = v_booking.session_id;
  select late_cancel_cutoff_minutes into v_cutoff_minutes
  from class_types where id = v_session.class_type_id;

  v_minutes_until_class := extract(epoch from (
    (v_session.session_date + v_session.start_time) - (now() at time zone 'Europe/London')
  )) / 60;

  v_was_booked := v_booking.status = 'booked';

  if v_was_booked and v_minutes_until_class < v_cutoff_minutes then
    update bookings
    set status = 'late_cancelled', cancelled_at = now()
    where id = p_booking_id
    returning * into v_booking;

    insert into notification_log (user_id, booking_id, type)
    values (v_user_id, v_booking.id, 'late_cancellation');
  else
    update bookings
    set status = 'cancelled', cancelled_at = now()
    where id = p_booking_id
    returning * into v_booking;
  end if;

  if v_was_booked then
    select * into v_next_waitlisted
    from bookings
    where session_id = v_session.id and status = 'waitlisted'
    order by waitlist_position asc
    limit 1
    for update;

    if v_next_waitlisted.id is not null then
      update bookings
      set status = 'booked', waitlist_position = null
      where id = v_next_waitlisted.id;

      insert into notification_log (user_id, booking_id, type)
      values (v_next_waitlisted.user_id, v_next_waitlisted.id, 'waitlist_promoted');
    end if;
  end if;

  return v_booking;
end;
$$;

create or replace function mark_no_shows()
returns setof bookings
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with updated as (
    update bookings b
    set status = 'no_show'
    from class_sessions s
    where b.session_id = s.id
      and b.status = 'booked'
      and b.checked_in_at is null
      and (s.session_date + s.end_time) < (now() at time zone 'Europe/London')
    returning b.*
  ),
  logged as (
    insert into notification_log (user_id, booking_id, type)
    select user_id, id, 'missed_attendance' from updated
    returning 1
  )
  select * from updated;
end;
$$;
