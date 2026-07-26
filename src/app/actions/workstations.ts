"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function createWorkstation(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const ipAddress = String(formData.get("ipAddress") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const personId = String(formData.get("personId") ?? "").trim();

  if (!name) throw new Error("El nombre de la PC es obligatorio");

  const workstation = await prisma.workstation.create({
    data: {
      name,
      ipAddress: ipAddress || null,
      notes: notes || null,
      personId: personId || null,
    },
  });

  revalidatePath("/workstations");
  redirect(`/workstations/${workstation.id}`);
}

export async function updateWorkstation(
  workstationId: string,
  formData: FormData,
) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const ipAddress = String(formData.get("ipAddress") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const personId = String(formData.get("personId") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) throw new Error("El nombre de la PC es obligatorio");

  await prisma.workstation.update({
    where: { id: workstationId },
    data: {
      name,
      ipAddress: ipAddress || null,
      notes: notes || null,
      personId: personId || null,
      active,
    },
  });

  revalidatePath("/workstations");
  revalidatePath(`/workstations/${workstationId}`);
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

  revalidatePath(`/workstations/${workstationId}`);
  revalidatePath("/workstations");
  revalidatePath(`/assets/${asset.id}`);
  revalidatePath("/assets");
  revalidatePath("/movements");
  revalidatePath("/");
}

export async function removeComponent(componentId: string) {
  const user = await requireUser();

  const component = await prisma.workstationComponent.findUniqueOrThrow({
    where: { id: componentId },
    include: { workstation: true, asset: true },
  });

  if (component.removedAt) {
    throw new Error("El componente ya fue retirado");
  }

  await prisma.$transaction([
    prisma.workstationComponent.update({
      where: { id: componentId },
      data: { removedAt: new Date() },
    }),
    prisma.asset.update({
      where: { id: component.assetId },
      data: { status: "IN_STOCK" },
    }),
    prisma.movement.create({
      data: {
        type: "FIN_ASIGNACION_PC",
        assetId: component.assetId,
        userId: user.id!,
        note: `Retirado de ${component.workstation.name}`,
      },
    }),
  ]);

  revalidatePath(`/workstations/${component.workstationId}`);
  revalidatePath("/workstations");
  revalidatePath(`/assets/${component.assetId}`);
  revalidatePath("/assets");
  revalidatePath("/movements");
  revalidatePath("/");
}
