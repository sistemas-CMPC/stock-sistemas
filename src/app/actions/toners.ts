"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function revalidateToners(printerAssetId?: string | null) {
  revalidatePath("/toners");
  revalidatePath("/scan");
  revalidatePath("/printers");
  if (printerAssetId) revalidatePath(`/assets/${printerAssetId}`);
}

function normalizeBarcode(raw: string) {
  return raw.trim();
}

export async function upsertTonerSku(formData: FormData) {
  await requireUser();

  const barcode = normalizeBarcode(String(formData.get("barcode") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "");
  const minStock = Math.max(0, Number(formData.get("minStock") ?? 1) || 1);

  if (!barcode || !name) {
    throw new Error("Código de barras y nombre son obligatorios");
  }

  await prisma.tonerSku.upsert({
    where: { barcode },
    update: { name, color, notes, minStock },
    create: { barcode, name, color, notes, minStock },
  });

  revalidateToners();
}

export async function receiveTonerByBarcode(formData: FormData) {
  const user = await requireUser();

  const barcode = normalizeBarcode(String(formData.get("barcode") ?? ""));
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1) || 1);
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!barcode) throw new Error("Escaneá el código de barras del toner");

  const existing = await prisma.tonerSku.findUnique({ where: { barcode } });
  if (!existing && !name) {
    throw new Error(
      "Toner nuevo: indicá un nombre (ej. HP 26A Negro) la primera vez",
    );
  }

  await prisma.$transaction(async (tx) => {
    const sku = await tx.tonerSku.upsert({
      where: { barcode },
      update: {
        fullQty: { increment: quantity },
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
      },
      create: {
        barcode,
        name: name || barcode,
        color,
        fullQty: quantity,
      },
    });

    await tx.tonerMovement.create({
      data: {
        tonerSkuId: sku.id,
        type: "INCOMING",
        quantity,
        userId: user.id!,
        note,
      },
    });
  });

  revalidateToners();
}

/** Usa un toner lleno (cambio): baja llenos, sube vacíos; opcionalmente registra en impresora. */
/** Descuenta un toner lleno (cambio en impresora). No es un React Hook. */
export async function consumeTonerByBarcode(formData: FormData) {
  const user = await requireUser();

  const barcode = normalizeBarcode(String(formData.get("barcode") ?? ""));
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1) || 1);
  const printerAssetId =
    String(formData.get("printerAssetId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const keepEmpty = formData.get("keepEmpty") !== "off";

  if (!barcode) throw new Error("Escaneá el código de barras del toner");

  const sku = await prisma.tonerSku.findUnique({ where: { barcode } });
  if (!sku) {
    throw new Error(
      `No hay un toner registrado con código “${barcode}”. Primero registrá un ingreso.`,
    );
  }
  if (sku.fullQty < quantity) {
    throw new Error(
      `Stock insuficiente: hay ${sku.fullQty} lleno(s) de “${sku.name}”`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.tonerSku.update({
      where: { id: sku.id },
      data: {
        fullQty: { decrement: quantity },
        emptyQty: keepEmpty ? { increment: quantity } : undefined,
      },
    });

    await tx.tonerMovement.create({
      data: {
        tonerSkuId: sku.id,
        type: "USED",
        quantity,
        userId: user.id!,
        printerAssetId,
        note:
          note ??
          (keepEmpty
            ? "Cambio de toner (lleno → vacío)"
            : "Cambio de toner (sin guardar vacío)"),
      },
    });

    if (printerAssetId) {
      await tx.printerEvent.create({
        data: {
          assetId: printerAssetId,
          type: "TONER_CHANGE",
          userId: user.id!,
          note: note ?? `Toner ${sku.name} (${sku.barcode})`,
        },
      });
      await tx.printerInfo.upsert({
        where: { assetId: printerAssetId },
        update: { lastTonerAt: new Date() },
        create: { assetId: printerAssetId, lastTonerAt: new Date() },
      });
    }
  });

  revalidateToners(printerAssetId);
}

export async function disposeEmptyToner(formData: FormData) {
  const user = await requireUser();

  const barcode = normalizeBarcode(String(formData.get("barcode") ?? ""));
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1) || 1);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!barcode) throw new Error("Escaneá el código de barras del toner");

  const sku = await prisma.tonerSku.findUnique({ where: { barcode } });
  if (!sku) throw new Error(`Toner “${barcode}” no registrado`);
  if (sku.emptyQty < quantity) {
    throw new Error(
      `Hay ${sku.emptyQty} vacío(s) de “${sku.name}”, no alcanza para sacar ${quantity}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.tonerSku.update({
      where: { id: sku.id },
      data: { emptyQty: { decrement: quantity } },
    });
    await tx.tonerMovement.create({
      data: {
        tonerSkuId: sku.id,
        type: "EMPTY_OUT",
        quantity,
        userId: user.id!,
        note: note ?? "Salida de vacíos",
      },
    });
  });

  revalidateToners();
}

export async function adjustTonerStock(formData: FormData) {
  const user = await requireUser();

  const tonerSkuId = String(formData.get("tonerSkuId") ?? "").trim();
  const fullQty = Math.max(0, Number(formData.get("fullQty") ?? 0) || 0);
  const emptyQty = Math.max(0, Number(formData.get("emptyQty") ?? 0) || 0);
  const note = String(formData.get("note") ?? "").trim() || "Ajuste manual";

  if (!tonerSkuId) throw new Error("Toner requerido");

  const sku = await prisma.tonerSku.findUnique({ where: { id: tonerSkuId } });
  if (!sku) throw new Error("Toner no encontrado");

  await prisma.$transaction(async (tx) => {
    await tx.tonerSku.update({
      where: { id: tonerSkuId },
      data: { fullQty, emptyQty },
    });
    await tx.tonerMovement.create({
      data: {
        tonerSkuId,
        type: "ADJUST",
        quantity: Math.abs(fullQty - sku.fullQty) + Math.abs(emptyQty - sku.emptyQty),
        userId: user.id!,
        note: `${note} → llenos ${fullQty}, vacíos ${emptyQty}`,
      },
    });
  });

  revalidateToners();
}

export async function linkTonerToPrinterModel(formData: FormData) {
  await requireUser();

  const tonerSkuId = String(formData.get("tonerSkuId") ?? "").trim();
  const printerModelId = String(formData.get("printerModelId") ?? "").trim();

  if (!tonerSkuId || !printerModelId) {
    throw new Error("Seleccioná toner y modelo de impresora");
  }

  const model = await prisma.printerModel.findUnique({
    where: { id: printerModelId },
    select: { id: true },
  });
  if (!model) throw new Error("Modelo de impresora inválido");

  await prisma.printerTonerCompat.upsert({
    where: {
      tonerSkuId_printerModelId: { tonerSkuId, printerModelId },
    },
    update: {},
    create: { tonerSkuId, printerModelId },
  });

  revalidateToners();
}

export async function unlinkTonerFromPrinterModel(compatId: string) {
  await requireUser();
  await prisma.printerTonerCompat.delete({ where: { id: compatId } });
  revalidateToners();
}

export async function findTonerByBarcode(barcode: string) {
  await requireUser();
  const code = normalizeBarcode(barcode);
  if (!code) return null;
  return prisma.tonerSku.findUnique({
    where: { barcode: code },
    include: {
      printers: true,
      movements: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export type TonerCoverageRow = {
  sku: {
    id: string;
    barcode: string;
    name: string;
    color: string | null;
    fullQty: number;
    emptyQty: number;
    minStock: number;
  };
  /** Impresoras activas de modelos vinculados (cada una cuenta 1 toner instalado). */
  inUseQty: number;
  /** Sellados + instalados en impresoras. */
  circulatingQty: number;
  printerModels: string[];
  printerCount: number;
  coverageRatio: number | null;
  status: "ok" | "low" | "critical" | "unlinked";
};

/** Cobertura: toners llenos vs impresoras de modelos vinculados. */
export async function getTonerCoverage(): Promise<TonerCoverageRow[]> {
  await requireUser();

  const [skus, printers] = await Promise.all([
    prisma.tonerSku.findMany({
      include: {
        printers: { include: { printerModel: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.printerInfo.findMany({
      where: { printerModelId: { not: null } },
      select: {
        printerModelId: true,
        asset: { select: { status: true } },
      },
    }),
  ]);

  const countByModelId = new Map<string, number>();
  for (const p of printers) {
    if (p.asset.status === "RETIRED" || !p.printerModelId) continue;
    countByModelId.set(
      p.printerModelId,
      (countByModelId.get(p.printerModelId) ?? 0) + 1,
    );
  }

  return skus.map((sku) => {
    const printerModels = sku.printers.map((p) => p.printerModel.name);
    const printerCount = sku.printers.reduce((sum, link) => {
      return sum + (countByModelId.get(link.printerModelId) ?? 0);
    }, 0);

    // Cada impresora activa del modelo vinculado tiene 1 toner de este SKU en uso.
    const inUseQty = printerCount;
    const circulatingQty = sku.fullQty + inUseQty;

    const coverageRatio =
      printerCount > 0 ? sku.fullQty / printerCount : null;

    let status: TonerCoverageRow["status"] = "ok";
    if (printerModels.length === 0) status = "unlinked";
    else if (sku.fullQty === 0 || (printerCount > 0 && sku.fullQty < 1))
      status = "critical";
    else if (
      sku.fullQty <= sku.minStock ||
      (coverageRatio !== null && coverageRatio < 1)
    )
      status = "low";

    return {
      sku: {
        id: sku.id,
        barcode: sku.barcode,
        name: sku.name,
        color: sku.color,
        fullQty: sku.fullQty,
        emptyQty: sku.emptyQty,
        minStock: sku.minStock,
      },
      inUseQty,
      circulatingQty,
      printerModels,
      printerCount,
      coverageRatio,
      status,
    };
  });
}
