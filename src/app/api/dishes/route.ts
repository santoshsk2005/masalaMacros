import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Lightweight dish search for the search-based logging path. Matches name and
// aliases case-insensitively; returns serving info for quick-add.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const dishes = await prisma.dish.findMany({ orderBy: { name: "asc" } });

  const results = dishes
    .map((d) => {
      let aliases: string[] = [];
      try {
        aliases = JSON.parse(d.aliases ?? "[]");
      } catch {
        aliases = [];
      }
      const hay = [d.name, ...aliases].map((s) => s.toLowerCase());
      const match = !q || hay.some((h) => h.includes(q));
      return match
        ? {
            id: d.id,
            name: d.name,
            cuisine: d.cuisine,
            region: d.region,
            servingUnit: d.servingUnit,
            servingGrams: d.servingGrams,
          }
        : null;
    })
    .filter(Boolean)
    .slice(0, 25);

  return NextResponse.json({ ok: true, dishes: results });
}
