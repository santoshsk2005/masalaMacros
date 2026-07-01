import { NutrientVector } from "@/lib/nutrition/types";
import { HealthFlag, scoreBand } from "@/lib/nutrition/engine";
import { TargetSet } from "@/lib/nutrition/targets";

export type DayFitLine = {
  key: string;
  label: string;
  unit: string;
  consumed: number; // before this meal
  meal: number; // this meal adds
  target: number;
  afterPct: number; // % of target after this meal
  status: "under" | "on-track" | "over";
};

export type AssessmentCard = {
  score: number;
  band: "good" | "moderate" | "poor";
  verdict: string;
  benefits: string[];
  concerns: string[];
  adjustments: string[];
  dayFit: DayFitLine[];
};

function fitLine(
  key: string,
  label: string,
  unit: string,
  consumed: number,
  meal: number,
  target: number,
  overIsBad: boolean,
): DayFitLine {
  const after = consumed + meal;
  const afterPct = target > 0 ? Math.round((after / target) * 100) : 0;
  let status: DayFitLine["status"] = "on-track";
  if (overIsBad) {
    if (afterPct > 105) status = "over";
    else if (afterPct < 80) status = "under";
  } else {
    // for protein/fibre, being under is the concern
    if (afterPct < 80) status = "under";
    else if (afterPct > 130) status = "over";
    else status = "on-track";
  }
  return {
    key,
    label,
    unit,
    consumed: Math.round(consumed),
    meal: Math.round(meal),
    target: Math.round(target),
    afterPct,
    status,
  };
}

/**
 * Build a clinical, data-forward assessment card for a proposed meal, judged
 * against what has already been consumed today (SPEC §5). Deterministic and
 * explainable — no free-hand numbers.
 */
export function buildAssessment(
  meal: NutrientVector,
  flags: HealthFlag[],
  score: number,
  consumedToday: NutrientVector,
  targets: TargetSet,
): AssessmentCard {
  const band = scoreBand(score);

  const benefits = flags
    .filter((f) => f.level === "good")
    .map((f) => f.detail);
  const concerns = flags
    .filter((f) => f.level !== "good")
    .map((f) => f.detail);

  const adjustments: string[] = [];
  const has = (k: string, level?: string) =>
    flags.some((f) => f.key === k && (!level || f.level === level));

  if (has("glycemic", "high")) {
    adjustments.push(
      "Reduce the refined-carbohydrate portion (e.g., halve the rice or drop one roti) and pair with protein/fibre to blunt the post-prandial glucose rise.",
    );
  }
  if (has("protein", "watch")) {
    adjustments.push(
      "Add a protein source — a katori of dal, a bowl of curd, or ~50 g paneer — to reach ~15–20 g protein for this meal.",
    );
  }
  if (has("oil")) {
    adjustments.push(
      "Lower the cooking-oil load: prefer a dry or gravy preparation over deep-fried, or reduce added oil/ghee by half.",
    );
  }
  if (has("sodium")) {
    adjustments.push(
      "Cut added salt and avoid high-sodium sides (papad, pickle) to keep this meal well under the ~2000 mg daily sodium ceiling.",
    );
  }
  if (has("sugar")) {
    adjustments.push(
      "Reduce free sugar — e.g., take chai with less/no sugar or skip the sweet — to limit added-sugar intake.",
    );
  }
  if (has("satfat", "high")) {
    adjustments.push(
      "High saturated fat: moderate ghee/full-fat dairy in this meal and balance with unsaturated sources elsewhere.",
    );
  }

  // Calorie budget context
  const calAfter = consumedToday.calories + meal.calories;
  if (calAfter > targets.calories * 1.05) {
    const over = Math.round(calAfter - targets.calories);
    adjustments.push(
      `This meal would put the day ~${over} kcal over the ${Math.round(targets.calories)} kcal target; consider a smaller portion or a lighter remaining meal.`,
    );
  } else {
    const remaining = Math.round(targets.calories - calAfter);
    if (remaining > 0) {
      adjustments.push(
        `Leaves ~${remaining} kcal of the daily budget for the rest of the day.`,
      );
    }
  }

  if (adjustments.length === 0) {
    adjustments.push("No adjustments needed — this meal is well-balanced as described.");
  }

  // Verdict — clinical, one line, keyed off the band + dominant concern.
  const topConcern = flags.find((f) => f.level === "high") ?? flags.find((f) => f.level === "watch");
  const hasHigh = flags.some((f) => f.level === "high");
  let verdict: string;
  if (band === "good" && !hasHigh) {
    verdict = "Well-balanced meal. Nutrient profile supports your targets with no significant concerns.";
  } else if (band === "good" && topConcern) {
    verdict = `Broadly balanced, but one factor warrants attention: ${topConcern.label.toLowerCase()}.`;
  } else if (band === "moderate") {
    verdict = topConcern
      ? `Acceptable meal with one notable factor to manage: ${topConcern.label.toLowerCase()}.`
      : "Acceptable meal; minor factors to keep in view.";
  } else {
    verdict = topConcern
      ? `Nutritionally suboptimal as described — primary concern: ${topConcern.label.toLowerCase()}. See adjustments.`
      : "Nutritionally suboptimal as described. See adjustments.";
  }

  const dayFit: DayFitLine[] = [
    fitLine("calories", "Calories", "kcal", consumedToday.calories, meal.calories, targets.calories, true),
    fitLine("proteinG", "Protein", "g", consumedToday.proteinG, meal.proteinG, targets.proteinG, false),
    fitLine("carbG", "Carbs", "g", consumedToday.carbG, meal.carbG, targets.carbG, true),
    fitLine("fatG", "Fat", "g", consumedToday.fatG, meal.fatG, targets.fatG, true),
    fitLine("fiberG", "Fibre", "g", consumedToday.fiberG, meal.fiberG, targets.fiberG, false),
    fitLine("sodiumMg", "Sodium", "mg", consumedToday.sodiumMg, meal.sodiumMg, targets.sodiumMaxMg, true),
  ];

  return { score, band, verdict, benefits, concerns, adjustments, dayFit };
}
