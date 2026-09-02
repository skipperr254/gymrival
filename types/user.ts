export interface Profile {
  id: string;
  avatar_url: string | null;
  username: string | null;
  full_name: string | null;
  gym: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  goal: string | null;
  bio: string | null;
  quote: string | null;
  xp: number;
  level: number;
  is_pro: boolean;
  streak: number;
  friends_count: number;
  role: 'user' | 'admin';
  /** Explicit language override picked in Settings. NULL = follow device locale. */
  language: string | null;
  push_enabled: boolean;
  // ─── Nutrition (TDEE inputs + target overrides) ───────────────────────────
  age: number | null;
  sex: 'male' | 'female' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  diet_goal: 'lose' | 'maintain' | 'gain' | null;
  /** NULL = use the calculated Mifflin-St Jeor value (see lib/nutrition.ts). */
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  created_at: string;
  updated_at: string;
}
