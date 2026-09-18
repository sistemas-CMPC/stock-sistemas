import Link from "next/link";
import { createPerson } from "@/app/actions/catalog";
import { SyncPeopleFromAdButton } from "@/components/sync-people-button";
import { prisma } from "@/lib/prisma";

function canSyncFromAd() {
  return Boolean(
    process.env.LDAP_URL?.trim() &&
      process.env.LDAP_BIND_USER?.trim() &&
      process.env.LDAP_BIND_PASSWORD &&
      process.env.AUTH_MODE?.trim().toLowerCase() !== "local",
  );
}

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    include: {
      loans: { where: { returnedAt: null } },
      assignments: { where: { endedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  const showAdSync = canSyncFromAd();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Clientes</h1>
          <p className="text-muted">
            Personas a quienes se presta o asigna material
          </p>
        </div>
        {showAdSync ? <SyncPeopleFromAdButton /> : null}
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
            Agregar cliente
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
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
                  <Link
                    href={`/people/${person.id}`}
                    className="font-medium text-accent"
                  >
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
                  <Link
                    href={`/people/${person.id}`}
                    className="btn-secondary !py-1.5 !text-xs"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {people.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  Todavía no hay clientes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
