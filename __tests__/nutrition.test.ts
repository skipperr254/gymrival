import { calculateTargets, resolveTargets } from "@/lib/nutrition";
import type { Profile } from "@/types/user";

const base: Profile = {
  id: "u1",
  avatar_url: null,
  username: "tester",
  full_name: null,
  gym: null,
  weight_kg: 80,
  height_cm: 180,
  goal: null,
  bio: null,
  quote: null,
  xp: 0,
  level: 1,
  is_pro: false,
  streak: 0,
  friends_count: 0,
  role: "user",
  language: null,
  push_enabled: true,
  age: 30,
  sex: "male",
  activity_level: "moderate",
  diet_goal: "maintain",
  experience_level: null,
  target_calories: null,
  target_protein_g: null,
  target_carbs_g: null,
  target_fat_g: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const profile = (overrides: Partial<Profile> = {}): Profile => ({ ...base, ...overrides });

describe("calculateTargets (Mifflin-St Jeor)", () => {
  it("male, moderate, maintain", () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; TDEE = 1780 * 1.55 = 2759
    expect(calculateTargets(profile())).toEqual({
      calories: 2759,
      protein_g: 207, // 2759 * 0.3 / 4 = 206.9
      carbs_g: 276, // 2759 * 0.4 / 4 = 275.9
      fat_g: 92, // 2759 * 0.3 / 9 = 91.97
    });
  });

  it("female, light, lose", () => {
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 1345.25; * 1.375 = 1849.72; - 500 = 1349.72
    const t = calculateTargets(
      profile({ sex: "female", weight_kg: 60, height_cm: 165, age: 25, activity_level: "light", diet_goal: "lose" })
    );
    expect(t?.calories).toBe(1350);
  });

  it("gain adds 300 kcal over maintenance", () => {
    const maintain = calculateTargets(profile())!.calories;
    expect(calculateTargets(profile({ diet_goal: "gain" }))!.calories).toBe(maintain + 300);
  });

  it.each(["weight_kg", "height_cm", "age", "sex", "activity_level", "diet_goal"] as const)(
    "returns null when %s is missing",
    (field) => {
      expect(calculateTargets(profile({ [field]: null }))).toBeNull();
    }
  );

  it("never goes below zero calories", () => {
    const t = calculateTargets(
      profile({ sex: "female", weight_kg: 1, height_cm: 1, age: 120, activity_level: "sedentary", diet_goal: "lose" })
    );
    expect(t).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
});

describe("resolveTargets (user overrides)", () => {
  it("uses the calculated values when nothing is overridden", () => {
    expect(resolveTargets(profile())).toEqual(calculateTargets(profile()));
  });

  it("overrides each field independently", () => {
    expect(resolveTargets(profile({ target_calories: 2000, target_fat_g: 50 }))).toEqual({
      calories: 2000,
      protein_g: 207,
      carbs_g: 276,
      fat_g: 50,
    });
  });

  it("works from overrides alone when the profile is incomplete", () => {
    const p = profile({
      weight_kg: null,
      target_calories: 1800,
      target_protein_g: 150,
      target_carbs_g: 180,
      target_fat_g: 60,
    });
    expect(resolveTargets(p)).toEqual({ calories: 1800, protein_g: 150, carbs_g: 180, fat_g: 60 });
  });

  it("returns null when the profile is incomplete and only some fields are overridden", () => {
    expect(resolveTargets(profile({ weight_kg: null, target_calories: 1800 }))).toBeNull();
  });
});
