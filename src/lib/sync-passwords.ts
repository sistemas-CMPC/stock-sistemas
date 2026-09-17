import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const officeUsers = [
  { username: "nsosa", name: "Nahuel Sosa", passwordEnv: "PASS_NSOSA" },
  { username: "nwei", name: "Nicolas Weinmeister", passwordEnv: "PASS_NWEI" },
  { username: "ebellon", name: "Enzo Bellon", passwordEnv: "PASS_EBELLON" },
  { username: "rpardo", name: "Ricardo Pardo", passwordEnv: "PASS_RPARDO" },
] as const;

/**
 * Aplica PASS_* / ADMIN_PASSWORD del entorno a la tabla User.
 * Sirve en build (seed) y en runtime (Vercel).
 */
export async function syncOperatorPasswordsFromEnv(client?: PrismaClient) {
  const prisma = client ?? new PrismaClient();
  const ownsClient = !client;
  const updated: string[] = [];

  try {
    for (const user of officeUsers) {
      const password = process.env[user.passwordEnv]?.trim();
      if (!password) continue;

      const passwordHash = await hash(password, 10);
      await prisma.user.upsert({
        where: { username: user.username },
        update: { name: user.name, passwordHash },
        create: {
          username: user.username,
          name: user.name,
          passwordHash,
        },
      });
      updated.push(user.username);
    }

    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    if (adminPassword) {
      const username = (process.env.ADMIN_USERNAME ?? "admin")
        .trim()
        .toLowerCase();
      const passwordHash = await hash(adminPassword, 10);
      await prisma.user.upsert({
        where: { username },
        update: {
          name: process.env.ADMIN_NAME ?? "Operador Sistemas",
          passwordHash,
          email: process.env.ADMIN_EMAIL ?? null,
        },
        create: {
          username,
          name: process.env.ADMIN_NAME ?? "Operador Sistemas",
          passwordHash,
          email: process.env.ADMIN_EMAIL ?? null,
        },
      });
      updated.push(username);
    }

    return updated;
  } finally {
    if (ownsClient) await prisma.$disconnect();
  }
}
