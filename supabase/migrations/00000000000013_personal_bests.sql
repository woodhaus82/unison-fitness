-- Benchmark CrossFit WODs and lifts (admin-managed list), and members'
-- logged results against them over time.
create table benchmarks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('wod', 'lift')),
  -- how a result is measured/entered: seconds elapsed, reps completed, or
  -- weight lifted (kg).
  score_type text not null check (score_type in ('time', 'reps', 'weight')),
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table benchmarks enable row level security;
create policy "benchmarks: read all" on benchmarks for select using (true);
create policy "benchmarks: admin write" on benchmarks for all using (is_admin()) with check (is_admin());

create table personal_bests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  benchmark_id uuid not null references benchmarks (id) on delete cascade,
  -- interpreted per the benchmark's score_type: seconds, reps, or kg.
  value numeric not null check (value > 0),
  rx boolean not null default true,
  notes text,
  recorded_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index personal_bests_user_benchmark_idx on personal_bests (user_id, benchmark_id, recorded_date desc);

alter table personal_bests enable row level security;
create policy "personal_bests: self or admin read" on personal_bests for select using (user_id = auth.uid() or is_admin());
create policy "personal_bests: self insert" on personal_bests for insert with check (user_id = auth.uid());
create policy "personal_bests: self update" on personal_bests for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "personal_bests: self delete" on personal_bests for delete using (user_id = auth.uid());

-- A starter set of common benchmark WODs and Olympic/strength lifts so the
-- list isn't empty on day one — admins can add/edit/remove freely.
insert into benchmarks (name, category, score_type, description, sort_order) values
  ('Fran', 'wod', 'time', '21-15-9 Thrusters (42.5/30kg), Pull-ups', 1),
  ('Grace', 'wod', 'time', '30 Clean & Jerks (42.5/30kg) for time', 2),
  ('Helen', 'wod', 'time', '3 rounds: 400m run, 21 KB swings (24/16kg), 12 pull-ups', 3),
  ('Diane', 'wod', 'time', '21-15-9 Deadlifts (102/70kg), Handstand push-ups', 4),
  ('Annie', 'wod', 'time', '50-40-30-20-10 Double-unders, Sit-ups', 5),
  ('Cindy', 'wod', 'reps', 'AMRAP 20min: 5 pull-ups, 10 push-ups, 15 air squats', 6),
  ('Karen', 'wod', 'time', '150 Wall balls (9/6kg) for time', 7),
  ('Murph', 'wod', 'time', '1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run', 8),
  ('Back Squat', 'lift', 'weight', '1 rep max', 1),
  ('Front Squat', 'lift', 'weight', '1 rep max', 2),
  ('Deadlift', 'lift', 'weight', '1 rep max', 3),
  ('Strict Press', 'lift', 'weight', '1 rep max', 4),
  ('Push Press', 'lift', 'weight', '1 rep max', 5),
  ('Clean', 'lift', 'weight', '1 rep max', 6),
  ('Clean & Jerk', 'lift', 'weight', '1 rep max', 7),
  ('Snatch', 'lift', 'weight', '1 rep max', 8),
  ('Bench Press', 'lift', 'weight', '1 rep max', 9);
