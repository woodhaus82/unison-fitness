-- Sample data for local development. Not run against production.

insert into class_types (id, name, description, color, default_capacity, late_cancel_cutoff_minutes) values
  ('11111111-1111-1111-1111-111111111111', 'CrossFit', 'Group functional fitness class', '#e11d48', 14, 240),
  ('22222222-2222-2222-2222-222222222222', 'Olympic Lifting', 'Technique-focused barbell class', '#2563eb', 8, 240),
  ('33333333-3333-3333-3333-333333333333', 'Open Gym', 'Unstructured training time', '#16a34a', 10, 60);

-- Recurring weekly template: Mon/Wed/Fri CrossFit at 06:00 and 17:30,
-- Tue Olympic Lifting at 18:00, Sat Open Gym at 09:00.
insert into class_schedule (class_type_id, day_of_week, start_time, end_time, capacity, location) values
  ('11111111-1111-1111-1111-111111111111', 1, '06:00', '07:00', 14, 'Main Floor'),
  ('11111111-1111-1111-1111-111111111111', 1, '17:30', '18:30', 14, 'Main Floor'),
  ('11111111-1111-1111-1111-111111111111', 3, '06:00', '07:00', 14, 'Main Floor'),
  ('11111111-1111-1111-1111-111111111111', 3, '17:30', '18:30', 14, 'Main Floor'),
  ('11111111-1111-1111-1111-111111111111', 5, '06:00', '07:00', 14, 'Main Floor'),
  ('11111111-1111-1111-1111-111111111111', 5, '17:30', '18:30', 14, 'Main Floor'),
  ('22222222-2222-2222-2222-222222222222', 2, '18:00', '19:00', 8, 'Main Floor'),
  ('33333333-3333-3333-3333-333333333333', 6, '09:00', '11:00', 10, 'Main Floor');

insert into membership_plans (name, description, type, credits_granted, duration_days, price_cents) values
  ('Monthly Unlimited', 'Unlimited classes, billed monthly', 'monthly_unlimited', null, null, 9400),
  ('10 Session Pack', '10 class credits, never expire', 'session_pack', 10, null, 9000),
  ('14 Day Trial', 'Unlimited access for 14 days, one-off', 'trial', null, 14, 1000);
