import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteServerButton } from "@/components/delete-server-button";
import { EditServerForm } from "@/components/edit-server-form";
import { ServerVmsPanel } from "@/components/server-vms-panel";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function ServerDetailPage({ params }: Props) {
  const { id } = await params;
  const server = await prisma.server.findUnique({
    where: { id },
    include: {
      vms: {
        include: {
          services: { orderBy: { name: "asc" } },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!server) notFound();

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
            {server.active ? "" : " · inactivo"}
          </p>
        </div>
        <DeleteServerButton serverId={server.id} serverName={server.name} />
      </div>

      <EditServerForm
        serverId={server.id}
        name={server.name}
        ipAddress={server.ipAddress}
        notes={server.notes}
        active={server.active}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Máquinas virtuales</h2>
        <ServerVmsPanel serverId={server.id} vms={server.vms} />
      </section>
    </div>
  );
}
