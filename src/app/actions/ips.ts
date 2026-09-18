"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseOptionalLanIp } from "@/lib/lan-ip";
import { assertLanIpsAvailable } from "@/lib/ip-inventory";

function revalidateIps() {
  revalidatePath("/ips");
}

export async function createIpReservation(formData: FormData) {
  await requireUser();

  const label = String(formData.get("label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!label) throw new Error("Indicá qué ocupa la IP (ej. MikroTik)");

  const ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));
  if (!ipAddress) throw new Error("IP requerida (192.168.0.1–255)");

  await assertLanIpsAvailable(ipAddress);

  try {
    await prisma.ipReservation.create({
      data: { ipAddress, label, notes },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(`La IP ${ipAddress} ya tiene una reserva registrada`);
    }
    throw error;
  }

  revalidateIps();
}

export async function updateIpReservation(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Reserva inválida");

  const label = String(formData.get("label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!label) throw new Error("Indicá qué ocupa la IP");

  const ipAddress = parseOptionalLanIp(String(formData.get("ipAddress") ?? ""));
  if (!ipAddress) throw new Error("IP requerida");

  await assertLanIpsAvailable(ipAddress, {
    kind: "reservation",
    sourceId: id,
  });

  try {
    await prisma.ipReservation.update({
      where: { id },
      data: { ipAddress, label, notes },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(`La IP ${ipAddress} ya está reservada`);
    }
    throw error;
  }

  revalidateIps();
}

export async function deleteIpReservation(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Reserva inválida");

  await prisma.ipReservation.delete({ where: { id } });
  revalidateIps();
}
