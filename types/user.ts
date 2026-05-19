export interface Profile {
  id: string;
  email: string;
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
  created_at: string;
  updated_at: string;
}
