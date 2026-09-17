import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatDate } from "@/lib/datetime";

export default async function DashboardPage() {
  const [inStock, onLoan, assigned, workstationCount, overdueLoans, recentMovements] =
    await Promise.all([
      prisma.asset.count({ where: { status: "IN_STOCK" } }),
      prisma.asset.count({ where: { status: "ON_LOAN" } }),
      prisma.asset.count({ where: { status: "ASSIGNED" } }),
      prisma.workstation.count({ where: { active: true } }),
      prisma.loan.findMany({
        where: {
          returnedAt: null,
          dueAt: { lt: new Date() },
        },
        include: { asset: true, person: true },
        orderBy: { dueAt: "asc" },
        take: 8,
      }),
      prisma.movement.findMany({
        include: { asset: true, user: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const stats = [
    { label: "En stock", value: inStock, href: "/assets?status=IN_STOCK" },
    { label: "Prestados", value: onLoan, href: "/assets?status=ON_LOAN" },
    { label: "Asignados", value: assigned, href: "/assets?status=ASSIGNED" },
    { label: "PCs activas", value: workstationCount, href: "/workstations" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="text-muted">Resumen del depósito técnico</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/scan" className="btn-primary">
            Escanear
          </Link>
          <Link href="/assets/new" className="btn-secondary">
            Nuevo activo
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card block hover:border-accent">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </Link>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Préstamos vencidos</h2>
        {overdueLoans.length === 0 ? (
          <p className="text-sm text-muted">No hay préstamos vencidos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Activo</th>
                <th>Persona</th>
                <th>Vencimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {overdueLoans.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <Link href={`/assets/${loan.assetId}`} className="font-medium text-accent">
                      {loan.asset.name}
                    </Link>
                  </td>
                  <td>{loan.person.name}</td>
                  <td>
                    {loan.dueAt
                      ? formatDate(loan.dueAt)
                      : "—"}
                  </td>
                  <td>
                    <StatusBadge status={loan.asset.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos movimientos</h2>
          <Link href="/movements" className="text-sm text-accent">
            Ver todos
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Activo</th>
              <th>Tipo</th>
              <th>Operador</th>
            </tr>
          </thead>
          <tbody>
            {recentMovements.map((movement) => (
              <tr key={movement.id}>
                <td>
                  {formatDateTime(movement.createdAt)}
                </td>
                <td>{movement.asset.name}</td>
                <td>{movement.type}</td>
                <td>{movement.user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
