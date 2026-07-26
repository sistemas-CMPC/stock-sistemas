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

const officeUsers = [
  { username: "nsosa", name: "N. Sosa", password: "nsosa**" },
  { username: "nwei", name: "N. Wei", password: "kukita**" },
  { username: "ebellon", name: "E. Bellon", password: "ebellon**" },
  { username: "rpardo", name: "R. Pardo", password: "rpardo**" },
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
    await upsertUser(user);
  }

  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const adminName = process.env.ADMIN_NAME ?? "Operador Sistemas";
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sistemas.local";

  await upsertUser({
    username: adminUsername,
    name: adminName,
    password: adminPassword,
    email: adminEmail,
  });

  console.log(
    `Seed OK — usuarios: ${officeUsers.map((u) => u.username).join(", ")}, ${adminUsername}`,
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
