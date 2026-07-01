import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, getDaySummary, getUserTargets } from "@/lib/app";
import { parseMealText } from "@/lib/llm";
import { resolveItems } from "@/lib/nutrition/resolve";
import { emptyVector, addVectors, roundVector } from "@/lib/nutrition/types";
import { computeFlags, mealQualityScore } from "@/lib/nutrition/engine";
import { buildAssessment } from "@/lib/coach";

const BodySchema = z.object({ text: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { text } = BodySchema.parse(await req.json());
    const user = await getCurrentUser();

    const { parsed, usedLlm } = await parseMealText(text);
    const resolved = await resolveItems(parsed.items);

    let mealTotals = emptyVector();
    for (const r of resolved) mealTotals = addVectors(mealTotals, r.nutrients);

    const flags = computeFlags(mealTotals);
    const score = mealQualityScore(mealTotals);

    // Day context: what's already been consumed today + targets.
    const [day, targets] = await Promise.all([
      getDaySummary(user, new Date()),
      getUserTargets(user),
    ]);

    const card = buildAssessment(mealTotals, flags, score, day.totals, targets);

    await prisma.assessment.create({
      data: { userId: user.id, rawText: text, result: JSON.stringify(card) },
    });

    return NextResponse.json({
      ok: true,
      parsedWithLlm: usedLlm,
      items: resolved.map((r) => ({
        label: r.label,
        matchedName: r.matchedName,
        quantity: r.quantity,
        unit: r.unit,
        grams: Math.round(r.grams),
        source: r.source,
        confidence: r.confidence,
      })),
      mealNutrients: roundVector(mealTotals),
      card,
    });
  } catch (err) {
    console.error("POST /api/assess failed:", err);
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
