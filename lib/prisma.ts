import { PrismaClient } from "@prisma/client";

// Prisma client singleton — evita crear múltiples conexiones en desarrollo
// (hot reload de Next.js) reutilizando la instancia global.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
