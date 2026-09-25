-- Unison Fitness member portal: core schema
-- Covers: profiles/roles, class programming, bookable sessions, bookings with
-- capacity + waitlist, memberships/credits, and an audit trail that the
-- email-automation edge functions read from.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('member', 'coach', 'admin');
create type booking_status as enum ('booked', 'waitlisted', 'cancelled', 'late_cancelled', 'attended', 'no_show');
create type session_status as enum ('scheduled', 'cancelled');
create type membership_status as enum ('active', 'paused', 'cancelled', 'expired');
create type upload_source as enum ('csv', 'xlsx', 'google_sheets');
create type upload_status as enum ('processing', 'completed', 'failed');
create type notification_type as enum (
  'booking_confirmation',
  'waitlist_promoted',
  'class_reminder',
  'late_cancellation',
  'missed_attendance',
  'class_cancelled'
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Class programming
-- ---------------------------------------------------------------------------

create table class_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text,
  default_capacity int not null default 12,
  -- how close to class start a cancellation counts as "late"
  late_cancel_cutoff_minutes int not null default 240,
  created_at timestamptz not null default now()
);

-- Recurring weekly template an admin maintains (e.g. "Mon 06:00 CrossFit").
-- Sessions are generated from this; admins can also create/import sessions
-- directly without a template (one-off classes, XLSX/CSV/Sheets uploads).
create table class_schedule (
  id uuid primary key default gen_random_uuid(),
  class_type_id uuid not null references class_types (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  capacity int,
  coach_id uuid references profiles (id),
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The actual bookable instances members see and book onto.
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_type_id uuid not null references class_types (id),
  schedule_id uuid references class_schedule (id),
  session_date date not null,
  start_time time not null,
  end_time time not null,
  capacity int not null,
  coach_id uuid references profiles (id),
  location text,
  status session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  unique (class_type_id, session_date, start_time)
);

create index class_sessions_date_idx on class_sessions (session_date, start_time);

-- ---------------------------------------------------------------------------
-- Memberships / credits
-- ---------------------------------------------------------------------------

create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  monthly_class_credits int, -- null = unlimited
  price_cents int,
  active boolean not null default true
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  plan_id uuid references membership_plans (id),
  status membership_status not null default 'active',
  start_date date not null default current_date,
  end_date date,
  credits_remaining int,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

create table bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status booking_status not null default 'booked',
  waitlist_position int,
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  checked_in_at timestamptz
);

-- A member can only hold one *active* (booked/waitlisted) spot per session,
-- but can rebook after cancelling, so this is a partial unique index rather
-- than a table-wide constraint.
create unique index bookings_active_unique
  on bookings (session_id, user_id)
  where status in ('booked', 'waitlisted');

create index bookings_session_idx on bookings (session_id, status);
create index bookings_user_idx on bookings (user_id, status);

-- ---------------------------------------------------------------------------
-- Notifications / admin uploads audit trail
-- ---------------------------------------------------------------------------

-- Acts as an outbox: rows are written the moment an event happens (booking
-- confirmed, late cancellation, no-show, ...). The dispatch-emails cron job
-- polls for rows where emailed_at is still null, sends the email, then
-- stamps emailed_at so it's never sent twice.
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  booking_id uuid references bookings (id) on delete cascade,
  type notification_type not null,
  channel text not null default 'email',
  sent_at timestamptz not null default now(),
  emailed_at timestamptz,
  metadata jsonb
);

create index notification_log_pending_idx on notification_log (emailed_at) where emailed_at is null;

create table schedule_uploads (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references profiles (id),
  source_type upload_source not null,
  file_name text,
  row_count int,
  status upload_status not null default 'processing',
  error_message text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Booking / cancellation business logic (atomic, called via RPC)
-- ---------------------------------------------------------------------------

-- Books the caller onto a session, or waitlists them if it's full.
-- Runs under a row lock on the session so concurrent bookers can't oversell.
create function book_class(p_session_id uuid)
returns bookings
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity int;
  v_booked_count int;
  v_next_position int;
  v_booking bookings;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform 1 from class_sessions where id = p_session_id for update;

  select capacity into v_capacity from class_sessions where id = p_session_id;
  if v_capacity is null then
    raise exception 'session not found';
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

-- Cancels the caller's booking. Applies the class's late-cancellation
-- cutoff, and promotes the next waitlisted member if a confirmed spot
-- opens up.
create function cancel_booking(p_booking_id uuid)
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
    (v_session.session_date + v_session.start_time) - now()
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

  -- Promote the earliest waitlisted member if a confirmed spot just freed up.
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

-- Called by a scheduled edge function shortly after each session ends.
-- Anyone still 'booked' without a check-in becomes a no-show; the row in
-- notification_log lets the email edge function know who to email, without
-- re-notifying (it left-joins on notification_log).
create function mark_no_shows()
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
      and (s.session_date + s.end_time) < now()
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table class_types enable row level security;
alter table class_schedule enable row level security;
alter table class_sessions enable row level security;
alter table membership_plans enable row level security;
alter table memberships enable row level security;
alter table bookings enable row level security;
alter table notification_log enable row level security;
alter table schedule_uploads enable row level security;

create function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'coach')
  );
$$;

-- profiles
create policy "profiles: self read" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles: self update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin manage" on profiles for all using (is_admin()) with check (is_admin());

-- class_types / class_schedule: publicly readable (it's just the programme),
-- admin-only writes
create policy "class_types: read all" on class_types for select using (true);
create policy "class_types: admin write" on class_types for all using (is_admin()) with check (is_admin());

create policy "class_schedule: read all" on class_schedule for select using (true);
create policy "class_schedule: admin write" on class_schedule for all using (is_admin()) with check (is_admin());

create policy "class_sessions: read all" on class_sessions for select using (true);
create policy "class_sessions: admin write" on class_sessions for all using (is_admin()) with check (is_admin());

-- membership plans: public read (pricing page), admin write
create policy "membership_plans: read all" on membership_plans for select using (true);
create policy "membership_plans: admin write" on membership_plans for all using (is_admin()) with check (is_admin());

-- memberships: members see their own, admins see/manage all
create policy "memberships: self read" on memberships for select using (user_id = auth.uid() or is_admin());
create policy "memberships: admin write" on memberships for all using (is_admin()) with check (is_admin());

-- bookings: members manage their own bookings; admins/coaches see & manage all
create policy "bookings: self read" on bookings for select using (user_id = auth.uid() or is_admin());
create policy "bookings: self insert" on bookings for insert with check (user_id = auth.uid() or is_admin());
create policy "bookings: self update" on bookings for update using (user_id = auth.uid() or is_admin());
create policy "bookings: admin delete" on bookings for delete using (is_admin());

-- notification_log / schedule_uploads: admin only (internal/audit data)
create policy "notification_log: self or admin read" on notification_log for select using (user_id = auth.uid() or is_admin());
create policy "notification_log: admin manage" on notification_log for all using (is_admin()) with check (is_admin());

create policy "schedule_uploads: admin manage" on schedule_uploads for all using (is_admin()) with check (is_admin());
