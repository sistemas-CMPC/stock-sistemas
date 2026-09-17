import { PrismaClient } from "@prisma/client";
import { syncOperatorPasswordsFromEnv } from "../src/lib/sync-passwords";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "Notebook", isBackupDisk: false, isPrinter: false },
  { name: "Pendrive", isBackupDisk: false, isPrinter: false },
  { name: "Disco externo", isBackupDisk: false, isPrinter: false },
  { name: "Disco de backup", isBackupDisk: true, isPrinter: false },
  { name: "Impresora", isBackupDisk: false, isPrinter: true },
  { name: "SSD", isBackupDisk: false, isPrinter: false },
  { name: "HDD", isBackupDisk: false, isPrinter: false },
  { name: "RAM", isBackupDisk: false, isPrinter: false },
  { name: "Cable", isBackupDisk: false, isPrinter: false },
  { name: "Otro", isBackupDisk: false, isPrinter: false },
];

async function main() {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        isBackupDisk: category.isBackupDisk,
        isPrinter: category.isPrinter,
      },
      create: category,
    });
  }

  const updated = await syncOperatorPasswordsFromEnv(prisma);
  for (const user of ["nsosa", "nwei", "ebellon", "rpardo"] as const) {
    if (!updated.includes(user)) {
      console.warn(`Saltando ${user}: falta PASS_* en el entorno.`);
    }
  }

  console.log(
    `Seed OK — categorías + operadores con clave actualizada: ${updated.join(", ") || "(ninguno; definí PASS_*)"}`,
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
