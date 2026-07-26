import Link from "next/link";
import { createWorkstation } from "@/app/actions/workstations";
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

      <form action={createWorkstation} className="card grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Nombre de la PC</label>
          <input
            name="name"
            required
            className="input"
            placeholder="Ej. PC-CONTADURIA-01"
          />
        </div>
        <div>
          <label className="label">IP</label>
          <input
            name="ipAddress"
            className="input font-mono"
            placeholder="Ej. 192.168.1.45"
          />
        </div>
        <div>
          <label className="label">Quién la tiene</label>
          <select name="personId" className="input">
            <option value="">Sin asignar</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.area ? ` (${person.area})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notas</label>
          <input name="notes" className="input" placeholder="Opcional" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Crear estación
          </button>
        </div>
      </form>

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
