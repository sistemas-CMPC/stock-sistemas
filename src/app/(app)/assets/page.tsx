import Link from "next/link";
import { AssetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { CODE_TYPE_LABELS } from "@/lib/labels";

type Props = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function AssetsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status as AssetStatus | undefined;
  const q = params.q?.trim();

  const assets = await prisma.asset.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Activos</h1>
          <p className="text-muted">Inventario de material técnico</p>
        </div>
        <Link href="/assets/new" className="btn-primary">
          Nuevo activo
        </Link>
      </div>

      <form className="card flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          className="input max-w-sm"
          placeholder="Buscar por nombre o código"
        />
        <select name="status" defaultValue={status ?? ""} className="input max-w-xs">
          <option value="">Todos los estados</option>
          <option value="IN_STOCK">En stock</option>
          <option value="ON_LOAN">Prestados</option>
          <option value="ASSIGNED">Asignados</option>
          <option value="RETIRED">Baja</option>
        </select>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Código</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <Link href={`/assets/${asset.id}`} className="font-medium text-accent">
                    {asset.name}
                  </Link>
                </td>
                <td className="font-mono text-xs">{asset.code}</td>
                <td>{CODE_TYPE_LABELS[asset.codeType]}</td>
                <td>{asset.category.name}</td>
                <td>
                  <StatusBadge status={asset.status} />
                </td>
              </tr>
            ))}
            {assets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted">
                  No hay activos para mostrar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
