"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function checkoutLoan(formData: FormData) {
  const user = await requireUser();
  const assetId = String(formData.get("assetId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.status !== "IN_STOCK") {
    throw new Error("El activo no está en stock");
  }

  await prisma.$transaction([
    prisma.loan.create({
      data: {
        assetId,
        personId,
        dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
        notes: notes || null,
      },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: { status: "ON_LOAN" },
    }),
    prisma.movement.create({
      data: {
        type: "SALIDA_PRESTAMO",
        assetId,
        userId: user.id!,
        note: notes || null,
      },
    }),
  ]);

  revalidatePath("/scan");
  revalidatePath("/assets");
  revalidatePath("/");
  revalidatePath("/movements");
}

export async function returnLoan(formData: FormData) {
  const user = await requireUser();
  const assetId = String(formData.get("assetId") ?? "").trim();
  if (!assetId) throw new Error("Activo inválido");

  const loan = await prisma.loan.findFirst({
    where: { assetId, returnedAt: null },
    orderBy: { checkedOutAt: "desc" },
  });

  if (!loan) throw new Error("No hay préstamo activo");

  const userId = user.id;
  if (!userId) throw new Error("Sesión inválida");

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loan.id },
      data: { returnedAt: new Date() },
    });
    await tx.asset.update({
      where: { id: assetId },
      data: { status: "IN_STOCK" },
    });
    await tx.movement.create({
      data: {
        type: "DEVOLUCION",
        assetId,
        userId,
        note: "Devolución de préstamo",
      },
    });
  });

  revalidatePath("/scan");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/");
  revalidatePath("/movements");
}

export async function createAssignment(formData: FormData) {
  const user = await requireUser();
  const assetId = String(formData.get("assetId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.status !== "IN_STOCK") {
    throw new Error("El activo no está en stock");
  }

  const userId = user.id;
  if (!userId) throw new Error("Sesión inválida");

  await prisma.$transaction(async (tx) => {
    await tx.assignment.create({
      data: {
        assetId,
        personId,
        note: note || null,
      },
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
        note: note || null,
      },
    });
  });

  revalidatePath("/scan");
  revalidatePath("/assets");
  revalidatePath("/");
  revalidatePath("/movements");
}

export async function endAssignment(formData: FormData) {
  const user = await requireUser();
  const assetId = String(formData.get("assetId") ?? "").trim();
  if (!assetId) throw new Error("Activo inválido");

  const assignment = await prisma.assignment.findFirst({
    where: { assetId, endedAt: null },
    orderBy: { assignedAt: "desc" },
  });

  if (!assignment) throw new Error("No hay asignación activa");

  const userId = user.id;
  if (!userId) throw new Error("Sesión inválida");

  await prisma.$transaction(async (tx) => {
    await tx.assignment.update({
      where: { id: assignment.id },
      data: { endedAt: new Date() },
    });
    await tx.asset.update({
      where: { id: assetId },
      data: { status: "IN_STOCK" },
    });
    await tx.movement.create({
      data: {
        type: "FIN_ASIGNACION",
        assetId,
        userId,
        note: "Fin de asignación / ingreso a stock",
      },
    });
  });

  revalidatePath("/scan");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/");
  revalidatePath("/movements");
}

export async function findAssetByCode(code: string) {
  await requireUser();
  return prisma.asset.findUnique({
    where: { code: code.trim() },
    include: {
      category: true,
      backupInfo: true,
      printerInfo: {
        include: { printerModel: true },
      },
      printerEvents: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      loans: {
        where: { returnedAt: null },
        include: { person: true },
        take: 1,
        orderBy: { checkedOutAt: "desc" },
      },
      assignments: {
        where: { endedAt: null },
        include: { person: true },
        take: 1,
        orderBy: { assignedAt: "desc" },
      },
      pcInstalls: {
        where: { removedAt: null },
        include: { workstation: true },
        take: 1,
        orderBy: { installedAt: "desc" },
      },
    },
  });
}
