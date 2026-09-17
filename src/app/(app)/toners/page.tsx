import Link from "next/link";
import { getTonerCoverage } from "@/app/actions/toners";
import { TonerCompatManager } from "@/components/toner-compat-manager";
import { TonerScanPanel } from "@/components/toner-scan-panel";
import { TONER_MOVEMENT_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ok: { label: "OK", className: "text-ok" },
  low: { label: "Bajo", className: "text-warning" },
  critical: { label: "Crítico", className: "text-danger" },
  unlinked: { label: "Sin vínculo", className: "text-muted" },
};

export default async function TonersPage() {
  const [coverage, skus, compats, printerAssets, recentMovements, printerModels] =
    await Promise.all([
      getTonerCoverage(),
      prisma.tonerSku.findMany({ orderBy: { name: "asc" } }),
      prisma.printerTonerCompat.findMany({
        include: { printerModel: true },
        orderBy: { printerModel: { name: "asc" } },
      }),
      prisma.asset.findMany({
        where: {
          OR: [
            { category: { isPrinter: true } },
            { printerInfo: { isNot: null } },
          ],
          status: { not: "RETIRED" },
        },
        include: {
          printerInfo: { include: { printerModel: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.tonerMovement.findMany({
        include: {
          tonerSku: true,
          user: { select: { name: true } },
          printerAsset: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.printerModel.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  const printerOptions = printerAssets.map((p) => ({
    id: p.id,
    name: p.name,
    model: p.printerInfo?.printerModel?.name ?? null,
  }));

  const compatRows = compats.map((c) => ({
    id: c.id,
    tonerSkuId: c.tonerSkuId,
    printerModelId: c.printerModelId,
    printerModelName: c.printerModel.name,
  }));

  const alerts = coverage.filter(
    (row) => row.status === "critical" || row.status === "low",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Toners</h1>
        <p className="text-muted">
          Stock sellado, toners en uso en impresoras, vacíos y cobertura para
          pedir recarga a tiempo.
        </p>
      </div>

      {alerts.length > 0 ? (
        <div className="card border border-warning/40 bg-warning/5 space-y-2">
          <h2 className="font-semibold text-warning">Alertas de stock</h2>
          <ul className="space-y-1 text-sm">
            {alerts.map((row) => (
              <li key={row.sku.id}>
                <strong>{row.sku.name}</strong>: {row.sku.fullQty} sellado(s)
                {row.inUseQty > 0 ? `, ${row.inUseQty} en uso` : ""}
                {row.printerCount > 0
                  ? ` · ${row.printerCount} impresora(s)`
                  : ""}
                {row.status === "critical"
                  ? " — sin cobertura, pedí recarga"
                  : " — stock bajo / por debajo de 1 por impresora"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <TonerScanPanel printers={printerOptions} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cobertura</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Toner</th>
                <th>Código</th>
                <th>Sellados</th>
                <th>En uso</th>
                <th>Total</th>
                <th>Vacíos</th>
                <th>Mín.</th>
                <th>Modelos</th>
                <th>Cobertura</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((row) => {
                const status = STATUS_LABEL[row.status];
                return (
                  <tr key={row.sku.id}>
                    <td>
                      {row.sku.name}
                      {row.sku.color ? (
                        <span className="ml-1 text-xs text-muted">
                          ({row.sku.color})
                        </span>
                      ) : null}
                    </td>
                    <td className="font-mono text-xs">{row.sku.barcode}</td>
                    <td>{row.sku.fullQty}</td>
                    <td title="Instalados en impresoras del modelo vinculado">
                      {row.inUseQty}
                    </td>
                    <td
                      className="font-semibold"
                      title="Sellados + en uso (total dando vuelta)"
                    >
                      {row.circulatingQty}
                    </td>
                    <td>{row.sku.emptyQty}</td>
                    <td>{row.sku.minStock}</td>
                    <td className="text-sm">
                      {row.printerModels.length
                        ? row.printerModels.join(", ")
                        : "—"}
                    </td>
                    <td>
                      {row.coverageRatio === null
                        ? "—"
                        : `${row.coverageRatio.toFixed(1)}×`}
                    </td>
                    <td className={status.className}>{status.label}</td>
                  </tr>
                );
              })}
              {coverage.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-muted">
                    Todavía no hay toners. Escaneá un ingreso arriba.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          <strong>En uso</strong> = impresoras activas del modelo vinculado (1
          toner instalado por equipo, sin descontar del stock sellado).{" "}
          <strong>Total</strong> = sellados + en uso. Cobertura = sellados ÷
          impresoras (ideal ≥ 1× de respaldo).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Vínculos y ajustes</h2>
        <p className="text-sm text-muted">
          El vínculo es con el <strong>modelo</strong> de impresora (catálogo en{" "}
          <Link href="/printers" className="text-accent underline">
            Impresoras
          </Link>
          ), no con cada equipo individual.
        </p>
        <TonerCompatManager
          skus={skus}
          compats={compatRows}
          printerModels={printerModels}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Últimos movimientos</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Toner</th>
                <th>Cant.</th>
                <th>Impresora</th>
                <th>Operador</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((m) => (
                <tr key={m.id}>
                  <td>
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td>{TONER_MOVEMENT_LABELS[m.type] ?? m.type}</td>
                  <td>
                    {m.tonerSku.name}
                    <span className="ml-1 font-mono text-xs text-muted">
                      {m.tonerSku.barcode}
                    </span>
                  </td>
                  <td>{m.quantity}</td>
                  <td>{m.printerAsset?.name ?? "—"}</td>
                  <td>{m.user.name}</td>
                  <td>{m.note ?? "—"}</td>
                </tr>
              ))}
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted">
                    Sin movimientos aún
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
