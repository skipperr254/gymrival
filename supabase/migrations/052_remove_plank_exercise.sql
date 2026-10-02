-- Plank has been retired as an exercise type. No PRs, workout log sets,
-- session exercises, or challenges reference it at the time of this
-- migration, so it can be removed outright rather than soft-hidden.
DELETE FROM public.exercise_types WHERE key = 'plank';
