import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getDaySummary } from "@/lib/app";

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(dateParam + "T00:00:00") : new Date();
    const user = await getCurrentUser();
    const summary = await getDaySummary(user, date);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("GET /api/day failed:", err);
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
