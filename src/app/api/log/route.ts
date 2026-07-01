import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/app";
import { parseMealText } from "@/lib/llm";
import { resolveItems } from "@/lib/nutrition/resolve";

const BodySchema = z.object({
  text: z.string().min(1),
  eatenAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const user = await getCurrentUser();

    const { parsed, usedLlm } = await parseMealText(body.text);
    const resolved = await resolveItems(parsed.items);

    const meal = await prisma.meal.create({
      data: {
        userId: user.id,
        eatenAt: body.eatenAt ? new Date(body.eatenAt) : new Date(),
        mealType: parsed.mealType,
        rawText: body.text,
        items: {
          create: resolved.map((r) => ({
            dishId: r.dishId,
            ingredientId: r.ingredientId,
            label: r.label,
            quantity: r.quantity,
            unit: r.unit,
            grams: r.grams,
            nutrients: JSON.stringify(r.nutrients),
            source: r.source,
            confidence: r.confidence,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({
      ok: true,
      mealId: meal.id,
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
    });
  } catch (err) {
    console.error("POST /api/log failed:", err);
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
