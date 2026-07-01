import "server-only";
import { prisma } from "@/lib/db";
import { computeTargets, TargetSet } from "@/lib/nutrition/targets";
import {
  NutrientVector,
  emptyVector,
  addVectors,
  roundVector,
} from "@/lib/nutrition/types";
import { computeFlags, mealQualityScore, HealthFlag } from "@/lib/nutrition/engine";

// Single-user for the vertical slice: the seeded demo user. Multi-user auth
// (SPEC: real product) slots in here later.
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user found — run `npm run db:seed`.");
  return user;
}

export type AppUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getUserTargets(user: AppUser): Promise<TargetSet> {
  // Prefer a manual override target if present; else auto-calculate.
  const override = await prisma.target.findFirst({
    where: { userId: user.id, isOverride: true },
    orderBy: { effectiveFrom: "desc" },
  });
  if (override) {
    return {
      calories: override.calories,
      proteinG: override.proteinG,
      carbG: override.carbG,
      fatG: override.fatG,
      fiberG: override.fiberG,
      sodiumMaxMg: override.sodiumMaxMg ?? 2000,
      addedSugarMaxG: override.addedSugarMaxG ?? 30,
    };
  }
  return computeTargets(user);
}

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export type MealSummary = {
  id: string;
  eatenAt: string;
  mealType: string;
  rawText: string | null;
  items: {
    id: string;
    label: string;
    matchedName: string | null;
    quantity: number;
    unit: string;
    grams: number;
    source: string;
    confidence: number;
    nutrients: NutrientVector;
  }[];
  nutrients: NutrientVector;
  flags: HealthFlag[];
  score: number;
};

export type DaySummary = {
  date: string;
  meals: MealSummary[];
  totals: NutrientVector;
  targets: TargetSet;
  flags: HealthFlag[];
};

function itemNutrients(json: string): NutrientVector {
  try {
    return { ...emptyVector(), ...JSON.parse(json) };
  } catch {
    return emptyVector();
  }
}

export async function getDaySummary(user: AppUser, date: Date): Promise<DaySummary> {
  const { start, end } = dayBounds(date);
  const meals = await prisma.meal.findMany({
    where: { userId: user.id, eatenAt: { gte: start, lt: end } },
    include: { items: true },
    orderBy: { eatenAt: "asc" },
  });

  const targets = await getUserTargets(user);
  let dayTotals = emptyVector();

  const mealSummaries: MealSummary[] = meals.map((m) => {
    let mealTotals = emptyVector();
    const items = m.items.map((it) => {
      const n = itemNutrients(it.nutrients);
      mealTotals = addVectors(mealTotals, n);
      return {
        id: it.id,
        label: it.label,
        matchedName: null,
        quantity: it.quantity,
        unit: it.unit,
        grams: Math.round(it.grams),
        source: it.source,
        confidence: it.confidence,
        nutrients: roundVector(n),
      };
    });
    dayTotals = addVectors(dayTotals, mealTotals);
    return {
      id: m.id,
      eatenAt: m.eatenAt.toISOString(),
      mealType: m.mealType,
      rawText: m.rawText,
      items,
      nutrients: roundVector(mealTotals),
      flags: computeFlags(mealTotals),
      score: mealQualityScore(mealTotals),
    };
  });

  return {
    date: start.toISOString().slice(0, 10),
    meals: mealSummaries,
    totals: roundVector(dayTotals),
    targets,
    flags: computeFlags(dayTotals),
  };
}
