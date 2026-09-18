"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { generateAssetCode } from "@/lib/labels";
import { parseOptionalLanIps } from "@/lib/lan-ip";

export type CreateWorkstationState = { error?: string } | undefined;
export type UpdateWorkstationState = { error?: string; ok?: boolean } | undefined;

function duplicateNameMessage(name: string) {
  return `Ya existe una estación con el nombre “${name}”. Elegí otro nombre o editá la existente.`;
}

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseOptionalDate(formData: FormData, key: string): Date | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha de mantenimiento inválida");
  }
  return date;
}

function parseWorkstationFields(formData: FormData) {
  return {
    os: optionalText(formData, "os"),
    ram: optionalText(formData, "ram"),
    diskType: optionalText(formData, "diskType"),
    storage: optionalText(formData, "storage"),
    notes: optionalText(formData, "notes"),
  };
}

async function findDuplicateWorkstationName(name: string, excludeId?: string) {
  return prisma.workstation.findFirst({
    where: excludeId ? { name, NOT: { id: excludeId } } : { name },
    select: { id: true },
  });
}

function revalidateWorkstation(workstationId?: string) {
  revalidatePath("/workstations");
  revalidatePath("/ips");
  revalidatePath("/scan");
  if (workstationId) revalidatePath(`/workstations/${workstationId}`);
}

export async function createWorkstation(
  _prev: CreateWorkstationState,
  formData: FormData,
): Promise<CreateWorkstationState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const personId = String(formData.get("personId") ?? "").trim() || null;

  if (!name) {
    return { error: "El nombre de la PC es obligatorio" };
  }

  if (await findDuplicateWorkstationName(name)) {
    return { error: duplicateNameMessage(name) };
  }

  let ipAddress: string | null;
  let lastMaintenanceAt: Date | null;
  let fields;
  try {
    ipAddress = parseOptionalLanIps(String(formData.get("ipAddress") ?? ""));
    lastMaintenanceAt = parseOptionalDate(formData, "lastMaintenanceAt");
    fields = parseWorkstationFields(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Datos inválidos" };
  }

  const code = generateAssetCode("PC");

  try {
    const workstation = await prisma.workstation.create({
      data: {
        code,
        name,
        ipAddress,
        personId,
        lastMaintenanceAt,
        ...fields,
      },
    });

    revalidateWorkstation(workstation.id);
    redirect(`/workstations/${workstation.id}`);
  } catch (error) {
    unstable_rethrow(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: duplicateNameMessage(name) };
    }
    console.error("[createWorkstation]", error);
    return { error: "No se pudo crear la estación. Intentá de nuevo." };
  }
}

export async function updateWorkstation(
  _prev: UpdateWorkstationState,
  formData: FormData,
): Promise<UpdateWorkstationState> {
  await requireUser();
  const workstationId = String(formData.get("workstationId") ?? "").trim();
  if (!workstationId) {
    return { error: "Estación inválida" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const personId = String(formData.get("personId") ?? "").trim() || null;
  const active = formData.get("active") === "on";

  if (!name) {
    return { error: "El nombre de la PC es obligatorio" };
  }

  if (await findDuplicateWorkstationName(name, workstationId)) {
    return { error: duplicateNameMessage(name) };
  }

  let ipAddress: string | null;
  let lastMaintenanceAt: Date | null;
  let fields;
  try {
    ipAddress = parseOptionalLanIps(String(formData.get("ipAddress") ?? ""));
    lastMaintenanceAt = parseOptionalDate(formData, "lastMaintenanceAt");
    fields = parseWorkstationFields(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Datos inválidos" };
  }

  try {
    await prisma.workstation.update({
      where: { id: workstationId },
      data: {
        name,
        ipAddress,
        personId,
        active,
        lastMaintenanceAt,
        ...fields,
      },
    });

    revalidateWorkstation(workstationId);
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: duplicateNameMessage(name) };
    }
    console.error("[updateWorkstation]", error);
    return { error: "No se pudo guardar. Intentá de nuevo." };
  }
}

export async function addWorkstationMaintenance(formData: FormData) {
  const user = await requireUser();
  const userId = user.id;
  if (!userId) throw new Error("Sesión inválida");

  const workstationId = String(formData.get("workstationId") ?? "").trim();
  if (!workstationId) throw new Error("PC inválida");

  const note = optionalText(formData, "note");
  let performedAt = new Date();
  const rawDate = String(formData.get("performedAt") ?? "").trim();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) throw new Error("Fecha inválida");
    performedAt = parsed;
  }

  await prisma.$transaction([
    prisma.workstationMaintenance.create({
      data: {
        workstationId,
        performedAt,
        note,
        userId,
      },
    }),
    prisma.workstation.update({
      where: { id: workstationId },
      data: { lastMaintenanceAt: performedAt },
    }),
  ]);

  revalidateWorkstation(workstationId);
}

export async function findWorkstationByCode(code: string) {
  await requireUser();
  const trimmed = code.trim();
  if (!trimmed) return null;

  return prisma.workstation.findUnique({
    where: { code: trimmed },
    include: {
      person: true,
      components: {
        where: { removedAt: null },
        include: {
          asset: { include: { category: true } },
        },
        orderBy: { installedAt: "desc" },
      },
      maintenances: {
        include: { user: { select: { name: true } } },
        orderBy: { performedAt: "desc" },
        take: 8,
      },
    },
  });
}

export async function installComponentByCode(
  workstationId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!code) throw new Error("Escaneá un código");

  const workstation = await prisma.workstation.findUniqueOrThrow({
    where: { id: workstationId },
  });

  const asset = await prisma.asset.findUnique({
    where: { code },
    include: {
      pcInstalls: {
        where: { removedAt: null },
        include: { workstation: true },
        take: 1,
      },
    },
  });

  if (!asset) throw new Error(`No existe un activo con código “${code}”`);
  if (asset.status === "RETIRED") {
    throw new Error("El activo está dado de baja");
  }
  if (asset.status === "ON_LOAN") {
    throw new Error("El activo está prestado; primero registrá la devolución");
  }

  const currentInstall = asset.pcInstalls[0];
  if (currentInstall?.workstationId === workstationId) {
    throw new Error("Ese componente ya está instalado en esta PC");
  }

  await prisma.$transaction(async (tx) => {
    if (currentInstall) {
      await tx.workstationComponent.update({
        where: { id: currentInstall.id },
        data: { removedAt: new Date() },
      });
      await tx.movement.create({
        data: {
          type: "FIN_ASIGNACION_PC",
          assetId: asset.id,
          userId: user.id!,
          note: `Retirado de ${currentInstall.workstation.name} (reubicación)`,
        },
      });
    }

    const personAssignment = await tx.assignment.findFirst({
      where: { assetId: asset.id, endedAt: null },
    });
    if (personAssignment) {
      await tx.assignment.update({
        where: { id: personAssignment.id },
        data: { endedAt: new Date() },
      });
      await tx.movement.create({
        data: {
          type: "FIN_ASIGNACION",
          assetId: asset.id,
          userId: user.id!,
          note: "Cerrada al instalar en PC",
        },
      });
    }

    await tx.workstationComponent.create({
      data: {
        workstationId,
        assetId: asset.id,
        note: note || null,
      },
    });

    await tx.asset.update({
      where: { id: asset.id },
      data: { status: "ASSIGNED" },
    });

    await tx.movement.create({
      data: {
        type: "ASIGNACION_PC",
        assetId: asset.id,
        userId: user.id!,
        note: note || `Instalado en ${workstation.name}`,
      },
    });
  });

  revalidateWorkstation(workstationId);
  revalidatePath(`/assets/${asset.id}`);
  revalidatePath("/assets");
  revalidatePath("/movements");
  revalidatePath("/");
}

export async function removeComponent(formData: FormData) {
  const user = await requireUser();
  const componentId = String(formData.get("componentId") ?? "").trim();
  if (!componentId) throw new Error("Componente inválido");

  const component = await prisma.workstationComponent.findUniqueOrThrow({
    where: { id: componentId },
    include: { workstation: true, asset: true },
  });

  if (component.removedAt) {
    throw new Error("El componente ya fue retirado");
  }

  const userId = user.id;
  if (!userId) throw new Error("Sesión inválida");

  await prisma.$transaction(async (tx) => {
    await tx.workstationComponent.update({
      where: { id: componentId },
      data: { removedAt: new Date() },
    });
    await tx.asset.update({
      where: { id: component.assetId },
      data: { status: "IN_STOCK" },
    });
    await tx.movement.create({
      data: {
        type: "FIN_ASIGNACION_PC",
        assetId: component.assetId,
        userId,
        note: `Retirado de ${component.workstation.name}`,
      },
    });
  });

  revalidateWorkstation(component.workstationId);
  revalidatePath(`/assets/${component.assetId}`);
  revalidatePath("/assets");
  revalidatePath("/movements");
  revalidatePath("/");
}
