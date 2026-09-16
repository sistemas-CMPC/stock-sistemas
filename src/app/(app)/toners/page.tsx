import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getTonerCoverage } from "@/app/actions/toners";
import { TonerCompatManager } from "@/components/toner-compat-manager";
import { TonerScanPanel } from "@/components/toner-scan-panel";
import { TONER_MOVEMENT_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ok: { label: "OK", className: "text-ok" },
  low: { label: "Bajo", className: "text-warning" },
  critical: { label: "Crítico", className: "text-danger" },
  unlinked: { label: "Sin vínculo", className: "text-muted" },
};

export default async function TonersPage() {
  const [coverage, skus, compats, printerAssets, recentMovements, modelRows] =
    await Promise.all([
      getTonerCoverage(),
      prisma.tonerSku.findMany({ orderBy: { name: "asc" } }),
      prisma.printerTonerCompat.findMany({ orderBy: { printerModel: "asc" } }),
      prisma.asset.findMany({
        where: {
          OR: [
            { category: { isPrinter: true } },
            { printerInfo: { isNot: null } },
          ],
          status: { not: "RETIRED" },
        },
        include: { printerInfo: true },
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
      prisma.printerInfo.findMany({
        where: { model: { not: null } },
        select: { model: true },
        distinct: ["model"],
      }),
    ]);

  const printerOptions = printerAssets.map((p) => ({
    id: p.id,
    name: p.name,
    model: p.printerInfo?.model ?? null,
  }));

  const printerModels = [
    ...new Set(
      modelRows
        .map((m) => m.model?.trim())
        .filter((m): m is string => Boolean(m)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const alerts = coverage.filter(
    (row) => row.status === "critical" || row.status === "low",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Toners</h1>
        <p className="text-muted">
          Stock llenos/vacíos por código de barras, vínculo con impresoras y
          cobertura para pedir recarga a tiempo.
        </p>
      </div>

      {alerts.length > 0 ? (
        <div className="card border border-warning/40 bg-warning/5 space-y-2">
          <h2 className="font-semibold text-warning">Alertas de stock</h2>
          <ul className="space-y-1 text-sm">
            {alerts.map((row) => (
              <li key={row.sku.id}>
                <strong>{row.sku.name}</strong>: {row.sku.fullQty} lleno(s)
                {row.printerCount > 0
                  ? ` para ${row.printerCount} impresora(s)`
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
                <th>Llenos</th>
                <th>Vacíos</th>
                <th>Mín.</th>
                <th>Modelos</th>
                <th>Impresoras</th>
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
                    <td>{row.sku.emptyQty}</td>
                    <td>{row.sku.minStock}</td>
                    <td className="text-sm">
                      {row.printerModels.length
                        ? row.printerModels.join(", ")
                        : "—"}
                    </td>
                    <td>{row.printerCount}</td>
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
                  <td colSpan={9} className="text-muted">
                    Todavía no hay toners. Escaneá un ingreso arriba.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Cobertura = llenos ÷ impresoras del/los modelo(s) vinculados. Ideal ≥
          1× (al menos un toner de respaldo por impresora).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Vínculos y ajustes</h2>
        <p className="text-sm text-muted">
          El modelo debe coincidir con el campo <strong>Modelo</strong> de la{" "}
          <Link href="/printers" className="text-accent underline">
            impresora
          </Link>
          .
        </p>
        <TonerCompatManager
          skus={skus}
          compats={compats}
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
                    {format(m.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
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
