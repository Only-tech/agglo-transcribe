import { PrismaClient } from "@prisma/client";

declare global {
  // Stocke le client prisma dans le cache global en dév
  var prisma: PrismaClient | undefined;
}

export const db =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}