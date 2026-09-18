"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseOptionalLanIp } from "@/lib/lan-ip";

function revalidateServers(serverId?: string) {
  revalidatePath("/servers");
  revalidatePath("/ips");
  if (serverId) revalidatePath(`/servers/${serverId}`);
}

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function optionalPositiveInt(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(`${key} debe ser un número entero ≥ 0`);
  }
  return value;
}

function parseMachineFields(formData: FormData) {
  return {
    os: optionalText(formData, "os"),
    username: optionalText(formData, "username"),
    vcpu: optionalPositiveInt(formData, "vcpu"),
    ramGb: optionalPositiveInt(formData, "ramGb"),
    disks: optionalText(formData, "disks"),
    notes: optionalText(formData, "notes"),
  };
}

export type ServerFormState = { error?: string; ok?: boolean } | undefined;

export async function createServer(
  _prev: ServerFormState,
  formData: FormData,
): Promise<ServerFormState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre del servidor es obligatorio" };

  let ipAddress: string | null;
  let machine;
  try {
    ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));
    machine = parseMachineFields(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Datos inválidos" };
  }

  try {
    const server = await prisma.server.create({
      data: { name, ipAddress, ...machine },
    });
    revalidateServers(server.id);
    redirect(`/servers/${server.id}`);
  } catch (error) {
    unstable_rethrow(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: `Ya existe un servidor llamado “${name}”` };
    }
    console.error("[createServer]", error);
    return { error: "No se pudo crear el servidor. Intentá de nuevo." };
  }
}

export async function updateServer(
  _prev: ServerFormState,
  formData: FormData,
): Promise<ServerFormState> {
  await requireUser();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!serverId) return { error: "Servidor inválido" };

  const name = String(formData.get("name") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!name) return { error: "El nombre del servidor es obligatorio" };

  let ipAddress: string | null;
  let machine;
  try {
    ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));
    machine = parseMachineFields(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Datos inválidos" };
  }

  try {
    await prisma.server.update({
      where: { id: serverId },
      data: { name, ipAddress, active, ...machine },
    });
    revalidateServers(serverId);
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: `Ya existe un servidor llamado “${name}”` };
    }
    console.error("[updateServer]", error);
    return { error: "No se pudo guardar. Intentá de nuevo." };
  }
}

export async function deleteServer(formData: FormData) {
  await requireUser();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!serverId) throw new Error("Servidor inválido");

  await prisma.server.delete({ where: { id: serverId } });
  revalidateServers();
  redirect("/servers");
}

export async function createVm(formData: FormData) {
  await requireUser();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!serverId) throw new Error("Servidor inválido");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nombre de la VM requerido");

  const ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));
  const machine = parseMachineFields(formData);
  const contents = optionalText(formData, "contents");

  try {
    await prisma.virtualMachine.create({
      data: { serverId, name, ipAddress, contents, ...machine },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(`Ya existe una VM “${name}” en este servidor`);
    }
    throw error;
  }

  revalidateServers(serverId);
}

export async function updateVm(formData: FormData) {
  await requireUser();
  const vmId = String(formData.get("vmId") ?? "").trim();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!vmId || !serverId) throw new Error("VM inválida");

  const name = String(formData.get("name") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!name) throw new Error("Nombre de la VM requerido");

  const ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));
  const machine = parseMachineFields(formData);
  const contents = optionalText(formData, "contents");

  try {
    await prisma.virtualMachine.update({
      where: { id: vmId },
      data: { name, ipAddress, active, contents, ...machine },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(`Ya existe una VM “${name}” en este servidor`);
    }
    throw error;
  }

  revalidateServers(serverId);
}

export async function deleteVm(formData: FormData) {
  await requireUser();
  const vmId = String(formData.get("vmId") ?? "").trim();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!vmId || !serverId) throw new Error("VM inválida");

  await prisma.virtualMachine.delete({ where: { id: vmId } });
  revalidateServers(serverId);
}

export async function createVmService(formData: FormData) {
  await requireUser();
  const vmId = String(formData.get("vmId") ?? "").trim();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!vmId || !serverId) throw new Error("VM inválida");

  const name = String(formData.get("name") ?? "").trim();
  const notes = optionalText(formData, "notes");
  if (!name) throw new Error("Nombre del servicio/contenido requerido");

  const ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));

  await prisma.vmService.create({
    data: { vmId, name, ipAddress, notes },
  });

  revalidateServers(serverId);
}

export async function updateVmService(formData: FormData) {
  await requireUser();
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!serviceId || !serverId) throw new Error("Servicio inválido");

  const name = String(formData.get("name") ?? "").trim();
  const notes = optionalText(formData, "notes");
  if (!name) throw new Error("Nombre requerido");

  const ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));

  await prisma.vmService.update({
    where: { id: serviceId },
    data: { name, ipAddress, notes },
  });

  revalidateServers(serverId);
}

export async function deleteVmService(formData: FormData) {
  await requireUser();
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const serverId = String(formData.get("serverId") ?? "").trim();
  if (!serviceId || !serverId) throw new Error("Servicio inválido");

  await prisma.vmService.delete({ where: { id: serviceId } });
  revalidateServers(serverId);
}
