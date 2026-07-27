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

async function main() {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { isBackupDisk: category.isBackupDisk },
      create: category,
    });
  }

  // Usuario local solo para desarrollo o emergencia (AUTH_ALLOW_LOCAL=true)
  const allowLocal = process.env.AUTH_ALLOW_LOCAL === "true";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (allowLocal && adminPassword) {
    const adminUsername = (
      process.env.ADMIN_USERNAME ?? "admin"
    ).trim().toLowerCase();
    const adminName = process.env.ADMIN_NAME ?? "Operador Sistemas";
    const adminEmail = process.env.ADMIN_EMAIL ?? null;
    const passwordHash = await hash(adminPassword, 10);

    await prisma.user.upsert({
      where: { username: adminUsername },
      update: {
        name: adminName,
        passwordHash,
        email: adminEmail,
      },
      create: {
        username: adminUsername,
        name: adminName,
        passwordHash,
        email: adminEmail,
      },
    });

    console.log(`Seed OK — categorías + usuario local ${adminUsername}`);
    return;
  }

  console.log(
    "Seed OK — categorías. Login vía Active Directory (grupo GG_Sistemas).",
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
