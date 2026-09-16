"use server";

import { revalidatePath } from "next/cache";
import { PrinterEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function revalidatePrinter(assetId: string) {
  revalidatePath("/scan");
  revalidatePath("/printers");
  revalidatePath(`/assets/${assetId}`);
}

export async function updatePrinterInfo(assetId: string, formData: FormData) {
  await requireUser();

  const model = String(formData.get("model") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const ipAddress = String(formData.get("ipAddress") ?? "").trim() || null;
  const connectedTo = String(formData.get("connectedTo") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "");

  await prisma.printerInfo.upsert({
    where: { assetId },
    update: { model, location, ipAddress, connectedTo, notes },
    create: { assetId, model, location, ipAddress, connectedTo, notes },
  });

  revalidatePrinter(assetId);
}

export async function addPrinterEvent(assetId: string, formData: FormData) {
  const user = await requireUser();

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
        userId: user.id!,
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
