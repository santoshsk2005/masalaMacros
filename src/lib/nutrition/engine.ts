import {
  NutrientVector,
  emptyVector,
  addVectors,
  NUTRIENT_KEYS,
} from "./types";

// Minimal ingredient shape the engine needs (matches Prisma Ingredient fields).
export type IngredientLike = {
  name: string;
  calories: number;
  proteinG: number;
  carbG: number;
  sugarG: number;
  fatG: number;
  satFatG: number;
  fiberG: number;
  ironMg: number;
  calciumMg: number;
  b12Ug: number;
  folateUg: number;
  sodiumMg: number;
  potassiumMg: number;
  glycemicIndex: number | null;
};

export type DishComponentLike = {
  grams: number; // grams of ingredient in ONE dish serving
  ingredient: IngredientLike;
};

const COOKING_FAT = /\b(oil|ghee|butter|dalda|vanaspati)\b/i;

export function isCookingFat(name: string): boolean {
  return COOKING_FAT.test(name);
}

/** Nutrients for an arbitrary mass of a single ingredient. */
export function nutrientsFromIngredient(
  ing: IngredientLike,
  grams: number,
): NutrientVector {
  const f = grams / 100;
  const v = emptyVector();
  v.calories = ing.calories * f;
  v.proteinG = ing.proteinG * f;
  v.carbG = ing.carbG * f;
  v.sugarG = ing.sugarG * f;
  v.fatG = ing.fatG * f;
  v.satFatG = ing.satFatG * f;
  v.fiberG = ing.fiberG * f;
  v.ironMg = ing.ironMg * f;
  v.calciumMg = ing.calciumMg * f;
  v.b12Ug = ing.b12Ug * f;
  v.folateUg = ing.folateUg * f;
  v.sodiumMg = ing.sodiumMg * f;
  v.potassiumMg = ing.potassiumMg * f;

  if (ing.glycemicIndex != null) {
    const availCarbG = Math.max(0, ing.carbG - ing.fiberG) * f;
    v.glycemicLoad = (ing.glycemicIndex * availCarbG) / 100;
  }
  if (isCookingFat(ing.name)) {
    v.addedFatG = v.fatG;
  }
  return v;
}

/**
 * Nutrients for `servings` of a composite dish. `servingGrams` is the total
 * cooked weight of one serving; components sum to (approximately) that.
 */
export function nutrientsFromDish(
  components: DishComponentLike[],
  servings: number,
): NutrientVector {
  let v = emptyVector();
  for (const c of components) {
    v = addVectors(v, nutrientsFromIngredient(c.ingredient, c.grams));
  }
  return scaleVector(v, servings);
}

export function scaleVector(v: NutrientVector, factor: number): NutrientVector {
  const out = emptyVector();
  for (const k of NUTRIENT_KEYS) out[k] = v[k] * factor;
  return out;
}

// ---------------------------------------------------------------------------
// Health flags + meal-quality score
// ---------------------------------------------------------------------------

export type FlagLevel = "good" | "watch" | "high";
export type HealthFlag = {
  key: string;
  label: string;
  level: FlagLevel;
  detail: string;
};

// Thresholds are per-meal reference points (clinical, defensible defaults).
// Day-level assessment scales these against remaining targets.
export function computeFlags(v: NutrientVector): HealthFlag[] {
  const flags: HealthFlag[] = [];

  // Glycemic load (per meal): <10 low, 10-20 medium, >20 high (standard GL bands)
  if (v.glycemicLoad > 20) {
    flags.push({
      key: "glycemic",
      label: "Glycemic load",
      level: "high",
      detail: `High glycemic load (~${Math.round(v.glycemicLoad)}). Expect a notable blood-sugar rise; pair with protein/fibre or reduce refined carbs.`,
    });
  } else if (v.glycemicLoad > 10) {
    flags.push({
      key: "glycemic",
      label: "Glycemic load",
      level: "watch",
      detail: `Moderate glycemic load (~${Math.round(v.glycemicLoad)}).`,
    });
  } else if (v.carbG > 0) {
    flags.push({
      key: "glycemic",
      label: "Glycemic load",
      level: "good",
      detail: `Low glycemic load (~${Math.round(v.glycemicLoad)}).`,
    });
  }

  // Sodium: >800mg per meal = watch, >1500 = high (2000-2300 daily reference)
  if (v.sodiumMg > 1500) {
    flags.push({
      key: "sodium",
      label: "Sodium",
      level: "high",
      detail: `High sodium (~${Math.round(v.sodiumMg)} mg) — a large share of the ~2000 mg daily limit.`,
    });
  } else if (v.sodiumMg > 800) {
    flags.push({
      key: "sodium",
      label: "Sodium",
      level: "watch",
      detail: `Moderate sodium (~${Math.round(v.sodiumMg)} mg).`,
    });
  }

  // Saturated fat: >7g/meal watch, >13g high (~20g daily reference)
  if (v.satFatG > 13) {
    flags.push({
      key: "satfat",
      label: "Saturated fat",
      level: "high",
      detail: `High saturated fat (~${Math.round(v.satFatG)} g).`,
    });
  } else if (v.satFatG > 7) {
    flags.push({
      key: "satfat",
      label: "Saturated fat",
      level: "watch",
      detail: `Moderate saturated fat (~${Math.round(v.satFatG)} g).`,
    });
  }

  // Added cooking fat (fried/tadka heaviness)
  if (v.addedFatG > 20) {
    flags.push({
      key: "oil",
      label: "Oil / fried",
      level: "high",
      detail: `Oil-heavy (~${Math.round(v.addedFatG)} g added fat), typical of deep-fried preparation.`,
    });
  } else if (v.addedFatG > 10) {
    flags.push({
      key: "oil",
      label: "Oil / fried",
      level: "watch",
      detail: `Moderate added oil (~${Math.round(v.addedFatG)} g).`,
    });
  }

  // Added/free sugar: >12g/meal watch, >25g high (~25-50g daily reference)
  if (v.sugarG > 25) {
    flags.push({
      key: "sugar",
      label: "Sugar",
      level: "high",
      detail: `High sugar (~${Math.round(v.sugarG)} g).`,
    });
  } else if (v.sugarG > 12) {
    flags.push({
      key: "sugar",
      label: "Sugar",
      level: "watch",
      detail: `Moderate sugar (~${Math.round(v.sugarG)} g).`,
    });
  }

  // Protein adequacy for a main meal (>=15g good)
  if (v.calories >= 200) {
    if (v.proteinG >= 15) {
      flags.push({
        key: "protein",
        label: "Protein",
        level: "good",
        detail: `Good protein (~${Math.round(v.proteinG)} g).`,
      });
    } else if (v.proteinG < 8) {
      flags.push({
        key: "protein",
        label: "Protein",
        level: "watch",
        detail: `Low protein (~${Math.round(v.proteinG)} g) for a meal of this size.`,
      });
    }
  }

  // Fibre (>=6g good for a meal)
  if (v.fiberG >= 6) {
    flags.push({
      key: "fiber",
      label: "Fibre",
      level: "good",
      detail: `Good fibre (~${Math.round(v.fiberG)} g).`,
    });
  }

  return flags;
}

/**
 * Meal-quality score 0-100. Starts at 100, deducts for concerns, small credit
 * for protein/fibre density. Heuristic but stable and explainable.
 */
export function mealQualityScore(v: NutrientVector): number {
  let score = 100;

  // Glycemic load
  if (v.glycemicLoad > 20) score -= 22;
  else if (v.glycemicLoad > 10) score -= 10;

  // Sodium
  if (v.sodiumMg > 1500) score -= 18;
  else if (v.sodiumMg > 800) score -= 8;

  // Saturated fat
  if (v.satFatG > 13) score -= 15;
  else if (v.satFatG > 7) score -= 6;

  // Added oil
  if (v.addedFatG > 20) score -= 15;
  else if (v.addedFatG > 10) score -= 6;

  // Sugar
  if (v.sugarG > 25) score -= 15;
  else if (v.sugarG > 12) score -= 6;

  // Protein credit/penalty (relative to calories)
  if (v.calories >= 200) {
    const proteinPer100kcal = (v.proteinG / v.calories) * 100;
    if (proteinPer100kcal >= 6) score += 6;
    else if (proteinPer100kcal < 3) score -= 8;
  }

  // Fibre credit
  if (v.fiberG >= 6) score += 5;
  else if (v.fiberG < 2 && v.calories >= 200) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreBand(score: number): "good" | "moderate" | "poor" {
  if (score >= 75) return "good";
  if (score >= 55) return "moderate";
  return "poor";
}
