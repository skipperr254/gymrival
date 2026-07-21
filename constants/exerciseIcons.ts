// Single source of truth for exercise-type icons. All Lucide, matching the
// icon system used across Compete, Social, and Log-a-PR. Every screen that
// shows an exercise (Compete chips, Log-a-PR, PR History, feed, challenges)
// must resolve its icon through getExerciseIcon() rather than picking its own.
import {
  Dumbbell,
  Weight,
  Anchor,
  ChevronsUp,
  ArrowUp,
  PersonStanding,
  TrendingDown,
  TrendingUp,
  Repeat,
  Move,
  Repeat2,
  Activity,
  Footprints,
  Target,
  Flame,
  Timer,
  Star,
  type LucideIcon,
} from 'lucide-react-native';

export type { LucideIcon };

const EXERCISE_ICON_MAP: Record<string, LucideIcon> = {
  bench: Dumbbell,
  squat: Weight,
  deadlift: Anchor,
  pullups: ChevronsUp,
  overhead: ArrowUp,
  bulgarian: PersonStanding,
  rdl: TrendingDown,
  incline: TrendingUp,
  dips: Repeat,
  row: Move,
  curl: Repeat2,
  legpress: Activity,
  lunge: Footprints,
  facepull: Target,
  hipthrust: Flame,
  plank: Timer,
  muscle_up: Star,
};

/** Resolves the display icon for an exercise key, falling back to Dumbbell for unknown keys. */
export function getExerciseIcon(key: string): LucideIcon {
  return EXERCISE_ICON_MAP[key] ?? Dumbbell;
}
