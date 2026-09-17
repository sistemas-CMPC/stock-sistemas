import { MOVEMENT_TYPE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDateTime } from "@/lib/datetime";

export default async function MovementsPage() {
  const movements = await prisma.movement.findMany({
    include: { asset: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movimientos</h1>
        <p className="text-muted">Auditoría de altas, salidas e ingresos</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Activo</th>
              <th>Tipo</th>
              <th>Operador</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>
                  {formatDateTime(movement.createdAt)}
                </td>
                <td>
                  <Link href={`/assets/${movement.assetId}`} className="text-accent">
                    {movement.asset.name}
                  </Link>
                </td>
                <td>{MOVEMENT_TYPE_LABELS[movement.type]}</td>
                <td>{movement.user.name}</td>
                <td>{movement.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
