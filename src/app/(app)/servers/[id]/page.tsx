import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteServerButton } from "@/components/delete-server-button";
import { EditServerForm } from "@/components/edit-server-form";
import { ServerVmsPanel } from "@/components/server-vms-panel";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function ServerDetailPage({ params }: Props) {
  const { id } = await params;
  const [server, otherServers] = await Promise.all([
    prisma.server.findUnique({
      where: { id },
      include: {
        vms: {
          include: {
            services: { orderBy: { name: "asc" } },
          },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.server.findMany({
      where: { id: { not: id }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!server) notFound();

  const resources = [
    server.vcpu != null ? `${server.vcpu} vCPU` : null,
    server.ramGb != null ? `${server.ramGb} GB RAM` : null,
    server.disks,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/servers" className="text-sm text-accent">
            ← Servidores
          </Link>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{server.name}</h1>
          <p className="text-muted">
            {server.ipAddress ? `IP ${server.ipAddress}` : "Sin IP"}
            {server.notes ? ` · ${server.notes}` : ""}
            {server.active ? "" : " · inactivo"}
          </p>
          {resources ? <p className="mt-1 text-sm text-muted">{resources}</p> : null}
        </div>
        <DeleteServerButton serverId={server.id} serverName={server.name} />
      </div>

      <EditServerForm
        serverId={server.id}
        name={server.name}
        ipAddress={server.ipAddress}
        os={server.os}
        username={server.username}
        vcpu={server.vcpu}
        ramGb={server.ramGb}
        disks={server.disks}
        notes={server.notes}
        active={server.active}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Máquinas virtuales</h2>
        <ServerVmsPanel
          serverId={server.id}
          vms={server.vms}
          otherServers={otherServers}
        />
      </section>
    </div>
  );
}
