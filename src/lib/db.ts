import { PrismaClient } from "@/generated/prisma";

// Reuse a single PrismaClient across hot-reloads in dev to avoid exhausting
// connections (Next.js re-imports modules on every change).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
