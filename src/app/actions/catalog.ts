"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { CodeType, Prisma } from "@prisma/client";
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
  printerModelId: z.string().optional(),
});

export type CreateAssetState = { error?: string } | undefined;

export async function createAsset(
  _prev: CreateAssetState,
  formData: FormData,
): Promise<CreateAssetState> {
  const user = await requireUser();

  let parsed;
  try {
    parsed = assetSchema.parse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      categoryId: formData.get("categoryId"),
      codeType: formData.get("codeType"),
      code: formData.get("code") || undefined,
      generateCode: formData.get("generateCode") || undefined,
      printerModelId: formData.get("printerModelId") || undefined,
    });
  } catch {
    return { error: "Completá los datos obligatorios del activo" };
  }

  const existingCode = parsed.code?.trim();
  let code = existingCode;
  if (!code) {
    if (parsed.generateCode === "on") {
      code = generateAssetCode(parsed.codeType === "QR" ? "QR" : "BC");
    } else {
      return { error: "Indicá un código o activá la generación automática" };
    }
  }

  const alreadyExists = await prisma.asset.findUnique({
    where: { code },
    select: { id: true },
  });
  if (alreadyExists) {
    return {
      error: `Ya existe un activo con el código “${code}”. Buscalo en Activos o usá otro código.`,
    };
  }

  try {
    const category = await prisma.category.findUniqueOrThrow({
      where: { id: parsed.categoryId },
    });

    if (category.isPrinter && !parsed.printerModelId?.trim()) {
      return {
        error:
          "Para una impresora elegí el modelo (crealo antes en Impresoras si falta).",
      };
    }

    let printerModelId: string | undefined;
    if (category.isPrinter && parsed.printerModelId) {
      const model = await prisma.printerModel.findUnique({
        where: { id: parsed.printerModelId },
        select: { id: true },
      });
      if (!model) return { error: "Modelo de impresora inválido" };
      printerModelId = model.id;
    }

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
        printerInfo: category.isPrinter
          ? { create: { printerModelId } }
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
    revalidatePath("/printers");
    redirect(`/assets/${asset.id}`);
  } catch (error) {
    unstable_rethrow(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: `Ya existe un activo con el código “${code}”. Buscalo en Activos o usá otro código.`,
      };
    }
    console.error("[createAsset]", error);
    return { error: "No se pudo registrar el activo. Intentá de nuevo." };
  }
}

export type UpdateAssetState = { error?: string; ok?: boolean } | undefined;

export async function updateAsset(
  assetId: string,
  _prev: UpdateAssetState,
  formData: FormData,
): Promise<UpdateAssetState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const codeTypeRaw = String(formData.get("codeType") ?? "").trim();

  if (!name || !categoryId || !code) {
    return { error: "Nombre, categoría y código son obligatorios" };
  }

  if (codeTypeRaw !== "BARCODE" && codeTypeRaw !== "QR") {
    return { error: "Tipo de código inválido" };
  }
  const codeType = codeTypeRaw as CodeType;

  const duplicate = await prisma.asset.findFirst({
    where: { code, NOT: { id: assetId } },
    select: { id: true },
  });
  if (duplicate) {
    return {
      error: `Ya existe otro activo con el código “${code}”`,
    };
  }

  try {
    const category = await prisma.category.findUniqueOrThrow({
      where: { id: categoryId },
    });

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        name,
        description: description || null,
        categoryId,
        code,
        codeType,
      },
    });

    if (category.isBackupDisk) {
      await prisma.backupInfo.upsert({
        where: { assetId },
        update: {},
        create: { assetId, description: "" },
      });
    }

    if (category.isPrinter) {
      await prisma.printerInfo.upsert({
        where: { assetId },
        update: {},
        create: { assetId },
      });
    }

    revalidatePath(`/assets/${assetId}`);
    revalidatePath("/assets");
    revalidatePath("/backup");
    revalidatePath("/printers");
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: `Ya existe otro activo con el código “${code}”` };
    }
    console.error("[updateAsset]", error);
    return { error: "No se pudo guardar. Intentá de nuevo." };
  }
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

/** Elimina el activo y su historial. Bloqueado si está prestado/asignado/en PC. */
export async function deleteAsset(assetId: string) {
  await requireUser();

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      loans: { where: { returnedAt: null }, take: 1 },
      assignments: { where: { endedAt: null }, take: 1 },
      pcInstalls: { where: { removedAt: null }, take: 1 },
    },
  });

  if (!asset) {
    throw new Error("Activo no encontrado");
  }

  if (
    asset.loans.length > 0 ||
    asset.assignments.length > 0 ||
    asset.pcInstalls.length > 0
  ) {
    throw new Error(
      "No se puede eliminar: primero devolvé el préstamo, finalizá la asignación o retiralo de la PC",
    );
  }

  await prisma.$transaction([
    prisma.movement.deleteMany({ where: { assetId } }),
    prisma.loan.deleteMany({ where: { assetId } }),
    prisma.assignment.deleteMany({ where: { assetId } }),
    prisma.workstationComponent.deleteMany({ where: { assetId } }),
    prisma.printerEvent.deleteMany({ where: { assetId } }),
    prisma.asset.delete({ where: { id: assetId } }),
  ]);

  revalidatePath("/assets");
  revalidatePath("/backup");
  revalidatePath("/printers");
  revalidatePath("/movements");
  redirect("/assets");
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
  const isPrinter = formData.get("isPrinter") === "on";
  if (!name) throw new Error("Nombre requerido");

  await prisma.category.create({
    data: { name, isBackupDisk, isPrinter },
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
