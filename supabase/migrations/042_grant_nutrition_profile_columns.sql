-- `profiles` uses column-level GRANTs as its actual authorization boundary
-- (table-level UPDATE was revoked in 024_column_grant_hardening.sql — RLS
-- only checks the row, not the column). Migration 041 added the TDEE/target
-- columns but never extended those grants, so selecting or updating them
-- silently fails with "permission denied for column" — this closes that gap.

GRANT SELECT (
  age, sex, activity_level, diet_goal,
  target_calories, target_protein_g, target_carbs_g, target_fat_g
) ON public.profiles TO authenticated;

GRANT UPDATE (
  age, sex, activity_level, diet_goal,
  target_calories, target_protein_g, target_carbs_g, target_fat_g
) ON public.profiles TO authenticated;
