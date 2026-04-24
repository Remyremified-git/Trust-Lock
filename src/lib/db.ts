import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/db-config";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const resolvedDatabaseUrl = resolveDatabaseUrl();

if (!process.env.DATABASE_URL && resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedDatabaseUrl
      ? {
          db: {
            url: resolvedDatabaseUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
