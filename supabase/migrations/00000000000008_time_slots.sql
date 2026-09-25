-- A fixed grid of "default times" per day of week, independent of which
-- class types run in them. Admins tick/untick class types onto a slot
-- (creating/removing class_schedule rows) rather than typing times
-- freehand each time, and can still edit the slot times themselves later.
create table time_slots (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (day_of_week, start_time, end_time)
);

alter table time_slots enable row level security;
create policy "time_slots: read all" on time_slots for select using (true);
create policy "time_slots: admin write" on time_slots for all using (is_admin()) with check (is_admin());

-- Lets a (class_type, day, time) combination be upserted idempotently by
-- the tick/untick grid instead of accumulating duplicates.
alter table class_schedule
  add constraint class_schedule_unique_slot unique (class_type_id, day_of_week, start_time, end_time);

-- Seed with the gym's real weekly times. day_of_week: 0 = Sunday .. 6 = Saturday.
insert into time_slots (day_of_week, start_time, end_time, sort_order) values
  -- Monday - Friday
  (1, '06:15', '07:15', 1), (1, '07:30', '08:30', 2), (1, '09:30', '10:30', 3),
  (1, '16:15', '17:15', 4), (1, '17:30', '18:30', 5), (1, '18:30', '19:30', 6),
  (2, '06:15', '07:15', 1), (2, '07:30', '08:30', 2), (2, '09:30', '10:30', 3),
  (2, '16:15', '17:15', 4), (2, '17:30', '18:30', 5), (2, '18:30', '19:30', 6),
  (3, '06:15', '07:15', 1), (3, '07:30', '08:30', 2), (3, '09:30', '10:30', 3),
  (3, '16:15', '17:15', 4), (3, '17:30', '18:30', 5), (3, '18:30', '19:30', 6),
  (4, '06:15', '07:15', 1), (4, '07:30', '08:30', 2), (4, '09:30', '10:30', 3),
  (4, '16:15', '17:15', 4), (4, '17:30', '18:30', 5), (4, '18:30', '19:30', 6),
  (5, '06:15', '07:15', 1), (5, '07:30', '08:30', 2), (5, '09:30', '10:30', 3),
  (5, '16:15', '17:15', 4), (5, '17:30', '18:30', 5), (5, '18:30', '19:30', 6),
  -- Saturday
  (6, '08:00', '09:00', 1), (6, '09:00', '10:00', 2), (6, '11:30', '13:30', 3),
  -- Sunday
  (0, '07:30', '09:00', 1), (0, '09:00', '10:30', 2), (0, '10:30', '13:00', 3);

-- Remove the placeholder recurring slots from initial seeding (invented
-- example times, not real gym hours) so they don't keep generating stale
-- sessions alongside the real schedule above.
delete from class_schedule
where day_of_week = 1 and start_time = '06:00'
   or day_of_week = 1 and start_time = '17:30'
   or day_of_week = 3 and start_time = '06:00'
   or day_of_week = 3 and start_time = '17:30'
   or day_of_week = 5 and start_time = '06:00'
   or day_of_week = 5 and start_time = '17:30'
   or day_of_week = 2 and start_time = '18:00'
   or day_of_week = 6 and start_time = '09:00' and end_time = '11:00';
