import Link from "next/link";
import { CreateServerForm } from "@/components/create-server-form";
import { prisma } from "@/lib/prisma";

export default async function ServersPage() {
  const servers = await prisma.server.findMany({
    include: {
      _count: { select: { vms: true } },
      vms: {
        select: {
          _count: { select: { services: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Servidores</h1>
          <p className="text-muted">
            Hosts, VMs internas y servicios con sus IPs. Mirá el mapa LAN en{" "}
            <Link href="/ips" className="text-accent underline">
              IPs
            </Link>
            .
          </p>
        </div>
      </div>

      <CreateServerForm />

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>IP</th>
              <th>VMs</th>
              <th>Servicios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => {
              const serviceCount = server.vms.reduce(
                (sum, vm) => sum + vm._count.services,
                0,
              );
              return (
                <tr key={server.id}>
                  <td>
                    <Link
                      href={`/servers/${server.id}`}
                      className="font-medium text-accent"
                    >
                      {server.name}
                    </Link>
                  </td>
                  <td className="font-mono text-sm">
                    {server.ipAddress ?? "—"}
                  </td>
                  <td>{server._count.vms}</td>
                  <td>{serviceCount}</td>
                  <td>{server.active ? "Activo" : "Inactivo"}</td>
                </tr>
              );
            })}
            {servers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted">
                  Todavía no hay servidores. Creá el primero arriba.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
