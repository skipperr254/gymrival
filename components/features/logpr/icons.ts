import {
  Dumbbell,
  TrendingUp,
  Activity,
  Target,
  Timer,
  Star,
  BarChart2,
  Repeat,
  PersonStanding,
} from 'lucide-react-native';

export type LucideIcon = typeof Dumbbell;

/** Maps an exercise key to its display icon. Shared by all three Log-a-PR steps. */
const EXERCISE_ICON_MAP: Record<string, LucideIcon> = {
  bench:     Dumbbell,
  squat:     Activity,
  deadlift:  BarChart2,
  pullups:   TrendingUp,
  overhead:  Dumbbell,
  bulgarian: PersonStanding,
  rdl:       Dumbbell,
  incline:   TrendingUp,
  dips:      Repeat,
  row:       Dumbbell,
  curl:      Dumbbell,
  legpress:  Activity,
  lunge:     PersonStanding,
  facepull:  Target,
  hipthrust: Dumbbell,
  plank:     Timer,
  muscle_up: Star,
};

export function getIcon(key: string): LucideIcon {
  return EXERCISE_ICON_MAP[key] ?? Dumbbell;
}
