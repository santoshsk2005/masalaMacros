import "server-only";
import { prisma } from "@/lib/db";
import { ParsedItem, NutrientVector, Provenance } from "./types";
import {
  nutrientsFromDish,
  nutrientsFromIngredient,
  DishComponentLike,
  IngredientLike,
} from "./engine";
import { resolveGrams, PortionUnitRow } from "./units";
import { decomposeDish } from "@/lib/llm";

export type ResolvedItem = {
  label: string;
  quantity: number;
  unit: string;
  grams: number;
  dishId: string | null;
  ingredientId: string | null;
  matchedName: string | null;
  nutrients: NutrientVector;
  source: Provenance;
  confidence: number;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function parseAliases(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

type FoodIndex = Awaited<ReturnType<typeof loadFoodIndex>>;

export async function loadFoodIndex() {
  const [dishes, ingredients, overrides] = await Promise.all([
    prisma.dish.findMany({ include: { components: { include: { ingredient: true } } } }),
    prisma.ingredient.findMany(),
    prisma.portionUnit.findMany(),
  ]);
  return { dishes, ingredients, overrides: overrides as PortionUnitRow[] };
}

function findDish(index: FoodIndex, label: string) {
  const n = norm(label);
  // exact by name or alias
  let hit = index.dishes.find(
    (d) => norm(d.name) === n || parseAliases(d.aliases).some((a) => norm(a) === n),
  );
  if (hit) return { dish: hit, exact: true };
  // partial (label contains dish name or vice-versa)
  hit = index.dishes.find((d) => {
    const dn = norm(d.name);
    return n.includes(dn) || dn.includes(n);
  });
  return hit ? { dish: hit, exact: false } : null;
}

function findIngredient(index: FoodIndex, label: string) {
  const n = norm(label);
  let hit = index.ingredients.find(
    (i) => norm(i.name) === n || parseAliases(i.aliases).some((a) => norm(a) === n),
  );
  if (hit) return { ingredient: hit, exact: true };
  hit = index.ingredients.find((i) => {
    const inm = norm(i.name);
    return n.includes(inm) || inm.includes(n);
  });
  return hit ? { ingredient: hit, exact: false } : null;
}

export async function resolveItem(
  parsed: ParsedItem,
  index: FoodIndex,
): Promise<ResolvedItem> {
  const overrides = index.overrides;

  // 1. Dish match (preferred — composite recipes are the accurate path)
  const dishMatch = findDish(index, parsed.label);
  if (dishMatch) {
    const { dish } = dishMatch;
    const { grams, confident } = resolveGrams(parsed.quantity, parsed.unit, {
      dishServingUnit: dish.servingUnit,
      dishServingGrams: dish.servingGrams,
      overrides,
    });
    const servings = grams / dish.servingGrams;
    const components: DishComponentLike[] = dish.components.map((c) => ({
      grams: c.grams,
      ingredient: c.ingredient as IngredientLike,
    }));
    return {
      label: parsed.label,
      quantity: parsed.quantity,
      unit: parsed.unit,
      grams,
      dishId: dish.id,
      ingredientId: null,
      matchedName: dish.name,
      nutrients: nutrientsFromDish(components, servings),
      source: dish.source as Provenance,
      confidence: (dishMatch.exact ? 0.95 : 0.75) * (confident ? 1 : 0.7),
    };
  }

  // 2. Single-ingredient match
  const ingMatch = findIngredient(index, parsed.label);
  if (ingMatch) {
    const { ingredient } = ingMatch;
    const { grams, confident } = resolveGrams(parsed.quantity, parsed.unit, { overrides });
    return {
      label: parsed.label,
      quantity: parsed.quantity,
      unit: parsed.unit,
      grams,
      dishId: null,
      ingredientId: ingredient.id,
      matchedName: ingredient.name,
      nutrients: nutrientsFromIngredient(ingredient as IngredientLike, grams),
      source: ingredient.source as Provenance,
      confidence: (ingMatch.exact ? 0.9 : 0.7) * (confident ? 1 : 0.7),
    };
  }

  // 3. AI fallback — decompose into ingredients, then run the SAME engine.
  const { grams } = resolveGrams(parsed.quantity, parsed.unit, { overrides });
  const { ingredients, usedLlm } = await decomposeDish(parsed.label, grams);
  const components: DishComponentLike[] = ingredients.map((i) => ({
    grams: i.grams,
    ingredient: i as IngredientLike,
  }));
  return {
    label: parsed.label,
    quantity: parsed.quantity,
    unit: parsed.unit,
    grams,
    dishId: null,
    ingredientId: null,
    matchedName: null,
    nutrients: nutrientsFromDish(components, 1),
    source: "ai-estimated",
    confidence: usedLlm ? 0.5 : 0.3,
  };
}

export async function resolveItems(items: ParsedItem[]): Promise<ResolvedItem[]> {
  const index = await loadFoodIndex();
  const out: ResolvedItem[] = [];
  for (const it of items) {
    out.push(await resolveItem(it, index));
  }
  return out;
}
