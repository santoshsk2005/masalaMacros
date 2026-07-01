// Auto-calculated daily targets from profile (SPEC: Mifflin-St Jeor + goal),
// with a manual-override path handled at the DB layer (Target.isOverride).

export type Profile = {
  sex?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: string | null;
  goal?: string | null;
};

export type TargetSet = {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  sodiumMaxMg: number;
  addedSugarMaxG: number;
};

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_DELTA: Record<string, number> = {
  lose: -0.2, // 20% deficit
  maintain: 0,
  gain: 0.12,
};

// Reasonable default when profile is incomplete.
export const DEFAULT_TARGETS: TargetSet = {
  calories: 2000,
  proteinG: 75,
  carbG: 250,
  fatG: 60,
  fiberG: 30,
  sodiumMaxMg: 2000,
  addedSugarMaxG: 30,
};

export function computeTargets(p: Profile): TargetSet {
  if (!p.age || !p.heightCm || !p.weightKg || !p.sex) {
    return DEFAULT_TARGETS;
  }

  // Mifflin-St Jeor BMR
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  const bmr = p.sex === "female" ? base - 161 : base + 5;

  const activity = ACTIVITY_FACTOR[p.activityLevel ?? "moderate"] ?? 1.55;
  const tdee = bmr * activity;

  const delta = GOAL_DELTA[p.goal ?? "maintain"] ?? 0;
  const calories = Math.round((tdee * (1 + delta)) / 10) * 10;

  // Protein: 1.6 g/kg (supports fitness/weight goals, higher end for veg diets).
  const proteinG = Math.round(p.weightKg * 1.6);
  // Fat: ~27% of calories.
  const fatG = Math.round((calories * 0.27) / 9);
  // Carbs: remainder.
  const carbG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  // Fibre: 14 g per 1000 kcal.
  const fiberG = Math.round((calories / 1000) * 14);

  return {
    calories,
    proteinG,
    carbG,
    fatG,
    fiberG,
    sodiumMaxMg: 2000,
    addedSugarMaxG: 30,
  };
}
