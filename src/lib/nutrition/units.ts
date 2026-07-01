// Household portion units → grams. These are sensible Indian-first defaults;
// users can override per food-class via the PortionUnit table (SPEC §4.2).
// A dish's own servingGrams takes precedence when the unit matches its serving
// unit; this map is the fallback and for raw-ingredient logging.

export type UnitDef = { grams: number; note?: string };

// Generic defaults (foodClass "*")
export const DEFAULT_UNITS: Record<string, UnitDef> = {
  g: { grams: 1 },
  gram: { grams: 1 },
  grams: { grams: 1 },
  ml: { grams: 1, note: "approx 1g/ml for most foods" },
  katori: { grams: 150, note: "standard small katori" },
  "small katori": { grams: 120 },
  "large katori": { grams: 250 },
  bowl: { grams: 250 },
  cup: { grams: 200 },
  glass: { grams: 250 },
  tbsp: { grams: 15 },
  tsp: { grams: 5 },
  piece: { grams: 40 },
  serving: { grams: 150 },
  plate: { grams: 350 },
  // common Indian item units (per-piece weights)
  roti: { grams: 40 },
  phulka: { grams: 35 },
  chapati: { grams: 40 },
  paratha: { grams: 70 },
  poori: { grams: 30 },
  dosa: { grams: 120 },
  idli: { grams: 40 },
  vada: { grams: 50 },
  samosa: { grams: 60 },
  slice: { grams: 30 },
  scoop: { grams: 60 },
};

export type PortionUnitRow = {
  name: string;
  foodClass: string;
  grams: number;
};

/**
 * Resolve (quantity, unit) → grams. Precedence:
 *   1. user/db override for (unit, foodClass)
 *   2. user/db override for (unit, "*")
 *   3. dish serving grams when unit is the dish's own serving unit
 *   4. built-in DEFAULT_UNITS
 *   5. fallback 100g with low confidence
 */
export function resolveGrams(
  quantity: number,
  unitRaw: string,
  opts: {
    foodClass?: string;
    dishServingUnit?: string;
    dishServingGrams?: number;
    overrides?: PortionUnitRow[];
  } = {},
): { grams: number; perUnitGrams: number; confident: boolean } {
  const unit = unitRaw.trim().toLowerCase();
  const foodClass = opts.foodClass ?? "*";
  const overrides = opts.overrides ?? [];

  const match =
    overrides.find((o) => o.name === unit && o.foodClass === foodClass) ??
    overrides.find((o) => o.name === unit && o.foodClass === "*");
  if (match) {
    return { grams: quantity * match.grams, perUnitGrams: match.grams, confident: true };
  }

  if (
    opts.dishServingUnit &&
    opts.dishServingGrams &&
    unit === opts.dishServingUnit.toLowerCase()
  ) {
    return {
      grams: quantity * opts.dishServingGrams,
      perUnitGrams: opts.dishServingGrams,
      confident: true,
    };
  }

  const def = DEFAULT_UNITS[unit];
  if (def) {
    return { grams: quantity * def.grams, perUnitGrams: def.grams, confident: true };
  }

  // Unknown unit — assume a 100g serving, flag low confidence.
  return { grams: quantity * 100, perUnitGrams: 100, confident: false };
}
