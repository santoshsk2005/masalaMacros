import { z } from "zod";

// A full nutrient vector. All values are absolute amounts (not per-100g) once
// computed for an item/meal/day. Ingredient rows store the same shape per 100g.
export type NutrientVector = {
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
  // Derived / aggregate-only fields
  glycemicLoad: number; // estimated GL for this quantity
  addedFatG: number; // grams of cooking oil/ghee (fried/tadka load)
};

export const NUTRIENT_KEYS: (keyof NutrientVector)[] = [
  "calories",
  "proteinG",
  "carbG",
  "sugarG",
  "fatG",
  "satFatG",
  "fiberG",
  "ironMg",
  "calciumMg",
  "b12Ug",
  "folateUg",
  "sodiumMg",
  "potassiumMg",
  "glycemicLoad",
  "addedFatG",
];

export function emptyVector(): NutrientVector {
  return {
    calories: 0,
    proteinG: 0,
    carbG: 0,
    sugarG: 0,
    fatG: 0,
    satFatG: 0,
    fiberG: 0,
    ironMg: 0,
    calciumMg: 0,
    b12Ug: 0,
    folateUg: 0,
    sodiumMg: 0,
    potassiumMg: 0,
    glycemicLoad: 0,
    addedFatG: 0,
  };
}

export function addVectors(a: NutrientVector, b: NutrientVector): NutrientVector {
  const out = emptyVector();
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + b[k];
  return out;
}

export function roundVector(v: NutrientVector): NutrientVector {
  const out = emptyVector();
  for (const k of NUTRIENT_KEYS) out[k] = Math.round(v[k] * 10) / 10;
  return out;
}

// ---- Parsed-meal shape (output of the NL parser / input to resolver) ----
export const ParsedItemSchema = z.object({
  label: z.string().min(1), // e.g. "dal tadka"
  quantity: z.number().positive().default(1),
  unit: z.string().default("katori"), // katori, roti, cup, piece, g, ml...
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const ParsedMealSchema = z.object({
  mealType: z
    .enum(["breakfast", "lunch", "dinner", "snack", "meal"])
    .default("meal"),
  items: z.array(ParsedItemSchema).min(1),
});
export type ParsedMeal = z.infer<typeof ParsedMealSchema>;

// ---- Provenance ----
export type Provenance = "curated" | "ifct" | "usda" | "ai-estimated";
