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
  created_at: string;
  updated_at: string;
}
