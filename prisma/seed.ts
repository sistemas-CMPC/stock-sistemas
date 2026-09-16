import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "Notebook", isBackupDisk: false },
  { name: "Pendrive", isBackupDisk: false },
  { name: "Disco externo", isBackupDisk: false },
  { name: "Disco de backup", isBackupDisk: true },
  { name: "SSD", isBackupDisk: false },
  { name: "HDD", isBackupDisk: false },
  { name: "RAM", isBackupDisk: false },
  { name: "Cable", isBackupDisk: false },
  { name: "Otro", isBackupDisk: false },
];

/** Operadores de Sistemas con login local (no AD). Contraseñas solo por env. */
const officeUsers = [
  {
    username: "nsosa",
    name: "Nahuel Sosa",
    passwordEnv: "PASS_NSOSA",
  },
  {
    username: "nwei",
    name: "Nicolas Weinmeister",
    passwordEnv: "PASS_NWEI",
  },
  {
    username: "ebellon",
    name: "Enzo Bellon",
    passwordEnv: "PASS_EBELLON",
  },
  {
    username: "rpardo",
    name: "Ricardo Pardo",
    passwordEnv: "PASS_RPARDO",
  },
];

async function upsertUser(input: {
  username: string;
  name: string;
  password: string;
  email?: string | null;
}) {
  const passwordHash = await hash(input.password, 10);
  await prisma.user.upsert({
    where: { username: input.username },
    update: {
      name: input.name,
      passwordHash,
      email: input.email ?? null,
    },
    create: {
      username: input.username,
      name: input.name,
      passwordHash,
      email: input.email ?? null,
    },
  });
}

async function main() {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { isBackupDisk: category.isBackupDisk },
      create: category,
    });
  }

  for (const user of officeUsers) {
    const password = process.env[user.passwordEnv]?.trim();
    if (!password) {
      console.warn(
        `Saltando ${user.username}: definí ${user.passwordEnv} en el entorno.`,
      );
      continue;
    }
    await upsertUser({
      username: user.username,
      name: user.name,
      password,
    });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    await upsertUser({
      username: (process.env.ADMIN_USERNAME ?? "admin").trim().toLowerCase(),
      name: process.env.ADMIN_NAME ?? "Operador Sistemas",
      password: adminPassword,
      email: process.env.ADMIN_EMAIL ?? null,
    });
  }

  console.log(
    `Seed OK — categorías + operadores: ${officeUsers.map((u) => u.username).join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
