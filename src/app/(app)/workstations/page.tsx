import Link from "next/link";
import { CreateWorkstationForm } from "@/components/create-workstation-form";
import { formatDate } from "@/lib/datetime";
import { isMaintenanceDue } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";

export default async function WorkstationsPage() {
  const [workstations, people] = await Promise.all([
    prisma.workstation.findMany({
      include: {
        person: true,
        _count: {
          select: {
            components: { where: { removedAt: null } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.person.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const dueCount = workstations.filter((pc) =>
    isMaintenanceDue(pc.lastMaintenanceAt),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Estaciones de trabajo</h1>
        <p className="text-muted">
          PCs con QR, IP, usuario, hardware, componentes y mantenimiento anual
        </p>
      </div>

      {dueCount > 0 ? (
        <div className="card border border-warning/40 bg-warning/5 text-sm text-warning">
          {dueCount} PC(s) necesitan mantenimiento (más de 1 año o sin fecha).
        </div>
      ) : null}

      <CreateWorkstationForm people={people} />

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>IP</th>
              <th>Quién la usa</th>
              <th>SO / RAM / Disco</th>
              <th>Mant.</th>
              <th>Comp.</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {workstations.map((pc) => {
              const due = isMaintenanceDue(pc.lastMaintenanceAt);
              const hw = [pc.os, pc.ram, [pc.diskType, pc.storage].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(" · ");
              return (
                <tr key={pc.id}>
                  <td>
                    <Link
                      href={`/workstations/${pc.id}`}
                      className="font-medium text-accent"
                    >
                      {pc.name}
                    </Link>
                    <div className="font-mono text-xs text-muted">{pc.code}</div>
                  </td>
                  <td className="font-mono text-sm">{pc.ipAddress ?? "—"}</td>
                  <td>
                    {pc.person ? (
                      <Link href={`/people/${pc.personId}`} className="text-accent">
                        {pc.person.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-sm">{hw || "—"}</td>
                  <td className={due ? "text-warning" : ""}>
                    {pc.lastMaintenanceAt
                      ? formatDate(pc.lastMaintenanceAt)
                      : "Sin fecha"}
                    {due ? " ⚠" : ""}
                  </td>
                  <td>{pc._count.components}</td>
                  <td>{pc.active ? "Activa" : "Inactiva"}</td>
                </tr>
              );
            })}
            {workstations.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  Todavía no hay estaciones cargadas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
