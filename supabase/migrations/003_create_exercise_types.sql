-- Exercise reference table — seeded with 17 exercise types
CREATE TABLE IF NOT EXISTS public.exercise_types (
  key   TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon  TEXT NOT NULL,
  unit  TEXT NOT NULL
);

ALTER TABLE public.exercise_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exercise types"
  ON public.exercise_types FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.exercise_types TO authenticated;

INSERT INTO public.exercise_types (key, label, icon, unit) VALUES
  ('bench',     'Bench Press',       '🏋️', 'kg'),
  ('squat',     'Squat',             '🦵', 'kg'),
  ('deadlift',  'Deadlift',          '💀', 'kg'),
  ('pullups',   'Pull-ups',          '🔝', 'reps'),
  ('overhead',  'Overhead Press',    '☝️', 'kg'),
  ('bulgarian', 'Bulgarian Split',   '🍑', 'kg'),
  ('rdl',       'Romanian Deadlift', '🔱', 'kg'),
  ('incline',   'Incline Bench',     '📐', 'kg'),
  ('dips',      'Dips',              '⬇️', 'reps'),
  ('row',       'Barbell Row',       '🚣', 'kg'),
  ('curl',      'Bicep Curl',        '💪', 'kg'),
  ('legpress',  'Leg Press',         '🦿', 'kg'),
  ('lunge',     'Lunges',            '🚶', 'kg'),
  ('facepull',  'Face Pull',         '😤', 'kg'),
  ('hipthrust', 'Hip Thrust',        '🔥', 'kg'),
  ('plank',     'Plank',             '⏱️', 'sec'),
  ('muscle_up', 'Muscle Up',         '🌟', 'reps')
ON CONFLICT (key) DO NOTHING;
