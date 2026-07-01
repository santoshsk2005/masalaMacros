import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/app";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    // Ensure the meal belongs to the current user before deleting.
    const meal = await prisma.meal.findUnique({ where: { id } });
    if (!meal || meal.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    await prisma.meal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
