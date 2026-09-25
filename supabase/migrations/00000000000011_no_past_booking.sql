-- Reject bookings on sessions whose start time has already passed. This
-- was previously only enforced by the UI showing a "Book" button, so a
-- direct RPC call (or a stale page) could still book into a class that
-- already happened.
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
  if (v_session_date + v_start_time) < now() then
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
