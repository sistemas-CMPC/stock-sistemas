import Link from "next/link";
import { createPerson, updatePerson } from "@/app/actions/catalog";
import { SyncPeopleFromAdButton } from "@/components/sync-people-button";
import { prisma } from "@/lib/prisma";

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    include: {
      loans: { where: { returnedAt: null } },
      assignments: { where: { endedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Personas</h1>
          <p className="text-muted">
            Compañeros a quienes se presta o asigna material
          </p>
        </div>
        <SyncPeopleFromAdButton />
      </div>

      <form action={createPerson} className="card grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Nombre</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">Área</label>
          <input name="area" className="input" placeholder="Opcional" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            Agregar persona
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario AD</th>
              <th>Área</th>
              <th>Activo</th>
              <th>En préstamo / asignado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>
                  <Link href={`/people/${person.id}`} className="font-medium text-accent">
                    {person.name}
                  </Link>
                </td>
                <td className="font-mono text-xs text-muted">
                  {person.username ?? "—"}
                </td>
                <td>{person.area ?? "—"}</td>
                <td>{person.active ? "Sí" : "No"}</td>
                <td>
                  {person.loans.length + person.assignments.length} ítem(s)
                </td>
                <td>
                  <form
                    action={updatePerson.bind(null, person.id)}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="name" value={person.name} />
                    <input type="hidden" name="area" value={person.area ?? ""} />
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={person.active}
                      />
                      Activo
                    </label>
                    <button type="submit" className="btn-secondary !py-1 !text-xs">
                      Actualizar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
