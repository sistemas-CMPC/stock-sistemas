import { prisma } from "@/lib/prisma";
import {
  IP_KIND_LABELS,
  LAN_HOST_MAX,
  LAN_HOST_MIN,
  LAN_PREFIX,
  normalizeLanIp,
  type IpOccupant,
} from "@/lib/lan-ip";

export type IpSlotStatus = "free" | "occupied";

export type IpSlot = {
  host: number;
  ip: string;
  status: IpSlotStatus;
  occupants: IpOccupant[];
};

function pushOccupant(
  byHost: Map<number, IpOccupant[]>,
  rawIp: string | null | undefined,
  occupant: Omit<IpOccupant, "ip" | "host">,
) {
  const ip = normalizeLanIp(rawIp);
  if (!ip) return;
  const host = Number(ip.slice(LAN_PREFIX.length));
  const list = byHost.get(host) ?? [];
  list.push({ ...occupant, ip, host });
  byHost.set(host, list);
}

/** Reúne todas las IPs LAN cargadas en el sistema. */
export async function collectOccupiedIps(): Promise<Map<number, IpOccupant[]>> {
  const byHost = new Map<number, IpOccupant[]>();

  const [workstations, printers, servers, vms, services] = await Promise.all([
    prisma.workstation.findMany({
      where: { ipAddress: { not: null } },
      select: { id: true, name: true, ipAddress: true, active: true },
    }),
    prisma.printerInfo.findMany({
      where: { ipAddress: { not: null } },
      select: {
        ipAddress: true,
        asset: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.server.findMany({
      where: { ipAddress: { not: null } },
      select: { id: true, name: true, ipAddress: true, active: true },
    }),
    prisma.virtualMachine.findMany({
      where: { ipAddress: { not: null } },
      select: {
        id: true,
        name: true,
        ipAddress: true,
        active: true,
        serverId: true,
        server: { select: { name: true } },
      },
    }),
    prisma.vmService.findMany({
      where: { ipAddress: { not: null } },
      select: {
        id: true,
        name: true,
        ipAddress: true,
        vm: {
          select: {
            id: true,
            name: true,
            serverId: true,
            server: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  for (const pc of workstations) {
    pushOccupant(byHost, pc.ipAddress, {
      kind: "workstation",
      kindLabel: IP_KIND_LABELS.workstation,
      name: pc.name,
      detail: pc.active ? undefined : "inactiva",
      href: `/workstations/${pc.id}`,
    });
  }

  for (const printer of printers) {
    pushOccupant(byHost, printer.ipAddress, {
      kind: "printer",
      kindLabel: IP_KIND_LABELS.printer,
      name: printer.asset.name,
      detail:
        printer.asset.status === "RETIRED" ? "dada de baja" : undefined,
      href: `/assets/${printer.asset.id}`,
    });
  }

  for (const server of servers) {
    pushOccupant(byHost, server.ipAddress, {
      kind: "server",
      kindLabel: IP_KIND_LABELS.server,
      name: server.name,
      detail: server.active ? undefined : "inactivo",
      href: `/servers/${server.id}`,
    });
  }

  for (const vm of vms) {
    pushOccupant(byHost, vm.ipAddress, {
      kind: "vm",
      kindLabel: IP_KIND_LABELS.vm,
      name: vm.name,
      detail: `en ${vm.server.name}${vm.active ? "" : " · inactiva"}`,
      href: `/servers/${vm.serverId}`,
    });
  }

  for (const service of services) {
    pushOccupant(byHost, service.ipAddress, {
      kind: "vm_service",
      kindLabel: IP_KIND_LABELS.vm_service,
      name: service.name,
      detail: `VM ${service.vm.name} · ${service.vm.server.name}`,
      href: `/servers/${service.vm.serverId}`,
    });
  }

  return byHost;
}

export async function getIpInventory(options?: {
  filter?: "all" | "free" | "occupied";
  query?: string;
}): Promise<{
  slots: IpSlot[];
  freeCount: number;
  occupiedCount: number;
  conflictCount: number;
}> {
  const byHost = await collectOccupiedIps();
  const filter = options?.filter ?? "all";
  const query = options?.query?.trim().toLowerCase() ?? "";

  const slots: IpSlot[] = [];
  let freeCount = 0;
  let occupiedCount = 0;
  let conflictCount = 0;

  for (let host = LAN_HOST_MIN; host <= LAN_HOST_MAX; host++) {
    const occupants = byHost.get(host) ?? [];
    const status: IpSlotStatus = occupants.length > 0 ? "occupied" : "free";
    if (status === "free") freeCount += 1;
    else {
      occupiedCount += 1;
      if (occupants.length > 1) conflictCount += 1;
    }

    const slot: IpSlot = {
      host,
      ip: `${LAN_PREFIX}${host}`,
      status,
      occupants,
    };

    if (filter === "free" && status !== "free") continue;
    if (filter === "occupied" && status !== "occupied") continue;

    if (query) {
      const haystack = [
        slot.ip,
        String(host),
        ...occupants.flatMap((o) => [
          o.name,
          o.kindLabel,
          o.detail ?? "",
          o.ip,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) continue;
    }

    slots.push(slot);
  }

  return { slots, freeCount, occupiedCount, conflictCount };
}
