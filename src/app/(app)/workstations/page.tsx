import Link from "next/link";
import { CreateWorkstationForm } from "@/components/create-workstation-form";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estaciones de trabajo</h1>
        <p className="text-muted">
          PCs con responsable, IP y componentes asociados por escaneo
        </p>
      </div>

      <CreateWorkstationForm people={people} />

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>IP</th>
              <th>Responsable</th>
              <th>Componentes</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {workstations.map((pc) => (
              <tr key={pc.id}>
                <td>
                  <Link
                    href={`/workstations/${pc.id}`}
                    className="font-medium text-accent"
                  >
                    {pc.name}
                  </Link>
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
                <td>{pc._count.components}</td>
                <td>{pc.active ? "Activa" : "Inactiva"}</td>
              </tr>
            ))}
            {workstations.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted">
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
