-- Deleting a recurring class_schedule slot should not be blocked by, or
-- cascade into, sessions already generated from it (which may have real
-- bookings). Detach instead of restricting the delete.
alter table class_sessions drop constraint class_sessions_schedule_id_fkey;

alter table class_sessions
  add constraint class_sessions_schedule_id_fkey
  foreign key (schedule_id) references class_schedule (id) on delete set null;
