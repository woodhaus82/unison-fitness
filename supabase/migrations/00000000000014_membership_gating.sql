-- Builds out the membership_plans/memberships tables that were scaffolded
-- in the initial schema but never used (no rows, no code references) into
-- the real three-tier model: a recurring monthly unlimited plan, a
-- never-expiring session pack, and a one-off trial. Stripe linkage columns
-- are added now so this is ready to wire up once a Stripe account exists,
-- but nothing here talks to Stripe yet — plans are seeded with
-- stripe_price_id = null and filled in later.

create type membership_plan_type as enum ('monthly_unlimited', 'session_pack', 'trial');

alter table membership_plans
  add column type membership_plan_type,
  add column duration_days int,
  add column stripe_price_id text;

alter table membership_plans rename column monthly_class_credits to credits_granted;

-- Every plan is exactly one of: unlimited recurring access (no credit
-- count, no fixed length — governed by billing status), a fixed pool of
-- credits that never expires, or a fixed-length unlimited-access window.
alter table membership_plans add constraint membership_plans_shape check (
  type is null or (
    case type
      when 'monthly_unlimited' then credits_granted is null and duration_days is null
      when 'session_pack' then credits_granted is not null and duration_days is null
      when 'trial' then credits_granted is null and duration_days is not null
    end
  )
);

alter table memberships
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column stripe_payment_intent_id text,
  -- Access granted outside of a real purchase (e.g. existing members
  -- grandfathered in when this system went live, or manual admin grants) —
  -- kept distinct from a real paid membership for reporting/admin clarity,
  -- though it behaves identically for booking access.
  add column is_comp boolean not null default false;

alter table bookings add column membership_id uuid references memberships (id);

-- The 3 rows here turned out to be generic seed.sql sample data
-- (Unlimited/8 Classes/Drop-in) that got run against production early on
-- despite that file's own "not run against production" comment. Nobody
-- has purchased against them (memberships is empty), so safe to clear and
-- replace with the real catalog.
delete from membership_plans;

insert into membership_plans (name, description, type, credits_granted, duration_days, price_cents, active)
values
  ('Monthly Unlimited', 'Unlimited classes, billed monthly', 'monthly_unlimited', null, null, 9400, true),
  ('10 Session Pack', '10 class credits, never expire', 'session_pack', 10, null, 9000, true),
  ('14 Day Trial', 'Unlimited access for 14 days, one-off', 'trial', null, 14, 1000, true);

alter table membership_plans alter column type set not null;

-- Grandfather every existing member into a comp unlimited membership so
-- this gating doesn't lock anyone out before real purchasing (Stripe) is
-- wired up — nobody can legitimately buy a plan yet. New signups after
-- this migration won't get one of these; they'll need to actually
-- purchase a plan once checkout exists.
insert into memberships (user_id, plan_id, status, start_date, end_date, credits_remaining, is_comp)
select
  p.id,
  (select id from membership_plans where type = 'monthly_unlimited' limit 1),
  'active',
  current_date,
  null,
  null,
  true
from profiles p
where p.role = 'member'
  and not exists (select 1 from memberships m where m.user_id = p.id);

-- Picks which of a member's active memberships should cover a booking,
-- preferring non-consuming access (unlimited/trial) over spending a
-- session-pack credit unnecessarily. Returns a null-id row if the member
-- has no valid access. Locks the chosen session-pack row (for update) so
-- concurrent bookings against the same pack can't double-spend a credit.
create or replace function pick_membership_for_booking(p_user_id uuid)
returns memberships
language plpgsql
security definer set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  v_membership memberships;
begin
  select m.* into v_membership
  from memberships m
  join membership_plans p on p.id = m.plan_id
  where m.user_id = p_user_id
    and m.status = 'active'
    and (
      (p.type = 'monthly_unlimited' and (m.end_date is null or m.end_date >= v_today))
      or (p.type = 'trial' and m.end_date >= v_today)
    )
  order by (p.type = 'monthly_unlimited') desc
  limit 1;

  if v_membership.id is not null then
    return v_membership;
  end if;

  select m.* into v_membership
  from memberships m
  join membership_plans p on p.id = m.plan_id
  where m.user_id = p_user_id
    and m.status = 'active'
    and p.type = 'session_pack'
    and coalesce(m.credits_remaining, 0) > 0
  order by m.start_date asc
  limit 1
  for update of m;

  return v_membership;
end;
$$;

create or replace function book_class(p_session_id uuid)
returns bookings
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role user_role;
  v_capacity int;
  v_status session_status;
  v_session_date date;
  v_start_time time;
  v_booked_count int;
  v_next_position int;
  v_booking bookings;
  v_membership memberships;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select role into v_role from profiles where id = v_user_id;

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

  -- Staff (coaches/admins) don't need a paid membership to book. Members do.
  if v_role = 'member' then
    v_membership := pick_membership_for_booking(v_user_id);
    if v_membership.id is null then
      raise exception 'no active membership, purchase a plan to book classes';
    end if;
  end if;

  select count(*) into v_booked_count
  from bookings
  where session_id = p_session_id and status = 'booked';

  if v_booked_count < v_capacity then
    insert into bookings (session_id, user_id, status, membership_id)
    values (p_session_id, v_user_id, 'booked', v_membership.id)
    returning * into v_booking;
  else
    select coalesce(max(waitlist_position), 0) + 1 into v_next_position
    from bookings
    where session_id = p_session_id and status = 'waitlisted';

    insert into bookings (session_id, user_id, status, waitlist_position, membership_id)
    values (p_session_id, v_user_id, 'waitlisted', v_next_position, v_membership.id)
    returning * into v_booking;
  end if;

  -- A session-pack credit is spent the moment a spot is reserved (booked
  -- or waitlisted), not deferred until waitlist promotion — simpler
  -- accounting, and matches how most gym booking software treats a
  -- waitlist spot as using a credit immediately.
  if v_membership.id is not null then
    update memberships m
    set credits_remaining = m.credits_remaining - 1
    from membership_plans p
    where m.id = v_membership.id
      and p.id = m.plan_id
      and p.type = 'session_pack';
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

  -- Refunded on any cancellation, including late — the late-cancel cutoff
  -- exists to track/notify no-shows, not to forfeit a pre-paid credit.
  -- Revisit if the gym wants late cancellations to burn the credit.
  if v_booking.membership_id is not null then
    update memberships m
    set credits_remaining = m.credits_remaining + 1
    from membership_plans p
    where m.id = v_booking.membership_id
      and p.id = m.plan_id
      and p.type = 'session_pack';
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

-- Internal helper only, called from inside book_class (which runs as the
-- function owner and can call it regardless). Not meant to be invoked
-- directly by a member — it takes an arbitrary user id and would leak
-- another member's membership details.
revoke execute on function pick_membership_for_booking(uuid) from public;
