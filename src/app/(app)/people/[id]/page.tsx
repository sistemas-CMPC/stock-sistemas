import Link from "next/link";
import { notFound } from "next/navigation";
import { EditPersonForm } from "@/components/edit-person-form";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";

type Props = { params: Promise<{ id: string }> };

export default async function PersonDetailPage({ params }: Props) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      loans: {
        include: { asset: true },
        orderBy: { checkedOutAt: "desc" },
      },
      assignments: {
        include: { asset: true },
        orderBy: { assignedAt: "desc" },
      },
      workstations: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!person) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/people" className="text-sm text-accent">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{person.name}</h1>
        <p className="text-muted">
          {person.area ?? "Sin área"}
          {person.username ? ` · ${person.username}` : ""}
          {person.active ? "" : " · inactivo"}
        </p>
      </div>

      <EditPersonForm
        personId={person.id}
        name={person.name}
        area={person.area}
        username={person.username}
        active={person.active}
      />

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Estaciones de trabajo</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>IP</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {person.workstations.map((pc) => (
              <tr key={pc.id}>
                <td>
                  <Link href={`/workstations/${pc.id}`} className="text-accent">
                    {pc.name}
                  </Link>
                </td>
                <td className="font-mono text-sm">{pc.ipAddress ?? "—"}</td>
                <td>{pc.active ? "Activa" : "Inactiva"}</td>
              </tr>
            ))}
            {person.workstations.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted">
                  Sin PCs asociadas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Préstamos</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Activo</th>
              <th>Salida</th>
              <th>Devolución</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {person.loans.map((loan) => (
              <tr key={loan.id}>
                <td>
                  <Link href={`/assets/${loan.assetId}`} className="text-accent">
                    {loan.asset.name}
                  </Link>
                </td>
                <td>{formatDateTime(loan.checkedOutAt)}</td>
                <td>
                  {loan.returnedAt
                    ? formatDateTime(loan.returnedAt)
                    : "Pendiente"}
                </td>
                <td>
                  <StatusBadge status={loan.asset.status} />
                </td>
              </tr>
            ))}
            {person.loans.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  Sin préstamos.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Asignaciones</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Activo</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {person.assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>
                  <Link
                    href={`/assets/${assignment.assetId}`}
                    className="text-accent"
                  >
                    {assignment.asset.name}
                  </Link>
                </td>
                <td>{formatDateTime(assignment.assignedAt)}</td>
                <td>
                  {assignment.endedAt
                    ? formatDateTime(assignment.endedAt)
                    : "Activa"}
                </td>
                <td>{assignment.note ?? "—"}</td>
              </tr>
            ))}
            {person.assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  Sin asignaciones.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
