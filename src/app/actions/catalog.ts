"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CodeType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { generateAssetCode } from "@/lib/labels";

const assetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  codeType: z.enum(["BARCODE", "QR"]),
  code: z.string().optional(),
  generateCode: z.string().optional(),
});

export async function createAsset(formData: FormData) {
  const user = await requireUser();
  const parsed = assetSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId"),
    codeType: formData.get("codeType"),
    code: formData.get("code") || undefined,
    generateCode: formData.get("generateCode") || undefined,
  });

  const existingCode = parsed.code?.trim();
  let code = existingCode;
  if (!code) {
    if (parsed.generateCode === "on") {
      code = generateAssetCode(parsed.codeType === "QR" ? "QR" : "BC");
    } else {
      throw new Error("Indicá un código o activá la generación automática");
    }
  }

  const category = await prisma.category.findUniqueOrThrow({
    where: { id: parsed.categoryId },
  });

  const asset = await prisma.asset.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      categoryId: parsed.categoryId,
      code,
      codeType: parsed.codeType as CodeType,
      backupInfo: category.isBackupDisk
        ? { create: { description: "" } }
        : undefined,
      movements: {
        create: {
          type: "ALTA",
          userId: user.id!,
          note: "Alta de activo",
        },
      },
    },
  });

  revalidatePath("/assets");
  revalidatePath("/backup");
  redirect(`/assets/${asset.id}`);
}

export async function updateAsset(assetId: string, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!name || !categoryId) {
    throw new Error("Datos incompletos");
  }

  const category = await prisma.category.findUniqueOrThrow({
    where: { id: categoryId },
  });

  await prisma.asset.update({
    where: { id: assetId },
    data: { name, description: description || null, categoryId },
  });

  if (category.isBackupDisk) {
    await prisma.backupInfo.upsert({
      where: { assetId },
      update: {},
      create: { assetId, description: "" },
    });
  }

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/backup");
}

export async function retireAsset(assetId: string) {
  const user = await requireUser();
  await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: "RETIRED",
      movements: {
        create: {
          type: "BAJA",
          userId: user.id!,
          note: "Activo dado de baja",
        },
      },
    },
  });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
}

export async function createPerson(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  if (!name) throw new Error("Nombre requerido");

  await prisma.person.create({
    data: { name, area: area || null },
  });
  revalidatePath("/people");
}

export async function updatePerson(personId: string, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!name) throw new Error("Nombre requerido");

  await prisma.person.update({
    where: { id: personId },
    data: { name, area: area || null, active },
  });
  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
}

export async function createCategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const isBackupDisk = formData.get("isBackupDisk") === "on";
  if (!name) throw new Error("Nombre requerido");

  await prisma.category.create({
    data: { name, isBackupDisk },
  });
  revalidatePath("/categories");
}

export async function updateBackupInfo(assetId: string, formData: FormData) {
  await requireUser();
  const description = String(formData.get("description") ?? "");
  const lastBackupRaw = String(formData.get("lastBackupAt") ?? "").trim();
  const lastBackupAt = lastBackupRaw ? new Date(lastBackupRaw) : null;

  await prisma.backupInfo.upsert({
    where: { assetId },
    update: { description, lastBackupAt },
    create: { assetId, description, lastBackupAt },
  });

  revalidatePath("/backup");
  revalidatePath(`/assets/${assetId}`);
}
