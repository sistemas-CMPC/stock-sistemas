"use server";

import { revalidatePath } from "next/cache";
import { PrinterEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function revalidatePrinter(assetId?: string) {
  revalidatePath("/scan");
  revalidatePath("/printers");
  revalidatePath("/toners");
  revalidatePath("/assets/new");
  if (assetId) revalidatePath(`/assets/${assetId}`);
}

export async function createPrinterModel(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const notes = String(formData.get("notes") ?? "");
  if (!name) throw new Error("Nombre del modelo requerido");

  await prisma.printerModel.create({
    data: { name, notes },
  });
  revalidatePrinter();
}

export async function updatePrinterInfo(formData: FormData) {
  await requireUser();

  const assetId = String(formData.get("assetId") ?? "").trim();
  if (!assetId) throw new Error("Activo inválido");

  const printerModelId =
    String(formData.get("printerModelId") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const ipAddress = String(formData.get("ipAddress") ?? "").trim() || null;
  const connectedTo = String(formData.get("connectedTo") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "");

  if (printerModelId) {
    const exists = await prisma.printerModel.findUnique({
      where: { id: printerModelId },
      select: { id: true },
    });
    if (!exists) throw new Error("Modelo de impresora inválido");
  }

  await prisma.printerInfo.upsert({
    where: { assetId },
    update: { printerModelId, location, ipAddress, connectedTo, notes },
    create: {
      assetId,
      printerModelId,
      location,
      ipAddress,
      connectedTo,
      notes,
    },
  });

  revalidatePrinter(assetId);
  revalidatePath("/ips");
}

/** Asigna o cambia el responsable de una impresora (sin exigir “en stock”). */
export async function setPrinterResponsible(formData: FormData) {
  const user = await requireUser();
  const userId = user.id;
  if (!userId) throw new Error("Sesión inválida");

  const assetId = String(formData.get("assetId") ?? "").trim();
  if (!assetId) throw new Error("Impresora inválida");

  const personId = String(formData.get("personId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      category: true,
      printerInfo: true,
      loans: { where: { returnedAt: null }, take: 1 },
    },
  });

  if (!asset) throw new Error("Impresora no encontrada");
  if (!asset.category.isPrinter && !asset.printerInfo) {
    throw new Error("El activo no es una impresora");
  }
  if (asset.status === "RETIRED") {
    throw new Error("La impresora está dada de baja");
  }
  if (asset.loans.length > 0) {
    throw new Error("La impresora está en préstamo; primero devolvéla");
  }

  if (personId) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, active: true },
    });
    if (!person) throw new Error("Cliente inválido");
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.assignment.findFirst({
      where: { assetId, endedAt: null },
      orderBy: { assignedAt: "desc" },
    });

    if (current) {
      if (current.personId === personId) {
        await tx.assignment.update({
          where: { id: current.id },
          data: { note },
        });
        return;
      }
      await tx.assignment.update({
        where: { id: current.id },
        data: { endedAt: new Date() },
      });
      await tx.movement.create({
        data: {
          type: "FIN_ASIGNACION",
          assetId,
          userId,
          note: "Cambio de responsable de impresora",
        },
      });
    }

    if (personId) {
      await tx.assignment.create({
        data: { assetId, personId, note },
      });
      await tx.asset.update({
        where: { id: assetId },
        data: { status: "ASSIGNED" },
      });
      await tx.movement.create({
        data: {
          type: "ASIGNACION",
          assetId,
          userId,
          note: note ?? "Responsable de impresora",
        },
      });
    } else {
      await tx.asset.update({
        where: { id: assetId },
        data: { status: "IN_STOCK" },
      });
    }
  });

  revalidatePrinter(assetId);
  revalidatePath("/people");
  if (personId) revalidatePath(`/people/${personId}`);
}

export async function addPrinterEvent(formData: FormData) {
  const user = await requireUser();
  const userId = user.id;
  if (!userId) throw new Error("Sesión inválida");

  const assetId = String(formData.get("assetId") ?? "").trim();
  if (!assetId) throw new Error("Activo inválido");

  const typeRaw = String(formData.get("type") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  const allowed: PrinterEventType[] = [
    "TONER_CHANGE",
    "REPAIR",
    "SERVICE",
    "NOTE",
  ];
  if (!allowed.includes(typeRaw as PrinterEventType)) {
    throw new Error("Tipo de evento inválido");
  }
  const type = typeRaw as PrinterEventType;

  await prisma.$transaction(async (tx) => {
    await tx.printerEvent.create({
      data: {
        assetId,
        type,
        userId,
        note,
      },
    });

    if (type === "TONER_CHANGE") {
      await tx.printerInfo.upsert({
        where: { assetId },
        update: { lastTonerAt: new Date() },
        create: { assetId, lastTonerAt: new Date() },
      });
    } else {
      await tx.printerInfo.upsert({
        where: { assetId },
        update: {},
        create: { assetId },
      });
    }
  });

  revalidatePrinter(assetId);
}
