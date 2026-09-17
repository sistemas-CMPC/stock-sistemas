import Link from "next/link";
import { createPrinterModel } from "@/app/actions/printers";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/datetime";

export default async function PrintersPage() {
  const [printers, models] = await Promise.all([
    prisma.asset.findMany({
      where: {
        OR: [
          { category: { isPrinter: true } },
          { printerInfo: { isNot: null } },
        ],
      },
      include: {
        category: true,
        printerInfo: { include: { printerModel: true } },
        assignments: {
          where: { endedAt: null },
          include: { person: true },
          take: 1,
          orderBy: { assignedAt: "desc" },
        },
        printerEvents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.printerModel.findMany({
      include: {
        _count: { select: { printers: true, toners: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Impresoras</h1>
          <p className="text-muted">
            Modelos, equipos, ubicación y mantenimiento. Escaneá el QR en{" "}
            <Link href="/scan" className="text-accent underline">
              Escanear
            </Link>
            .
          </p>
        </div>
        <Link href="/assets/new" className="btn-primary">
          Nueva impresora
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Modelos de impresora</h2>
        <p className="text-sm text-muted">
          Cada equipo se asocia a un modelo; los toners se vinculan al modelo
          (no a cada unidad).
        </p>
        <form
          action={createPrinterModel}
          className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label className="label">Nombre del modelo</label>
            <input
              name="name"
              required
              className="input"
              placeholder="HP LaserJet Pro M404"
            />
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input name="notes" className="input" placeholder="Oficina / color" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              Crear modelo
            </button>
          </div>
        </form>

        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Equipos</th>
                <th>Toners vinculados</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id}>
                  <td className="font-medium">{model.name}</td>
                  <td>{model._count.printers}</td>
                  <td>{model._count.toners}</td>
                  <td className="text-sm text-muted">{model.notes || "—"}</td>
                </tr>
              ))}
              {models.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted">
                    Todavía no hay modelos. Creá el primero arriba.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Equipos</h2>
        <div className="space-y-4">
          {printers.map((printer) => {
            const assignment = printer.assignments[0];
            const lastEvent = printer.printerEvents[0];
            return (
              <div key={printer.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/assets/${printer.id}`}
                      className="text-xl font-semibold text-accent"
                    >
                      {printer.name}
                    </Link>
                    <p className="font-mono text-xs text-muted">
                      {printer.code}
                    </p>
                  </div>
                  <StatusBadge status={printer.status} />
                </div>

                <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted">Modelo</dt>
                    <dd>
                      {printer.printerInfo?.printerModel?.name || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Ubicación</dt>
                    <dd>{printer.printerInfo?.location || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">IP</dt>
                    <dd className="font-mono">
                      {printer.printerInfo?.ipAddress || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Conectada a</dt>
                    <dd>{printer.printerInfo?.connectedTo || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Responsable</dt>
                    <dd>
                      {assignment
                        ? `${assignment.person.name}${assignment.note ? ` · ${assignment.note}` : ""}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Último toner</dt>
                    <dd>
                      {printer.printerInfo?.lastTonerAt
                        ? formatDate(printer.printerInfo.lastTonerAt)
                        : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Último evento</dt>
                    <dd>
                      {lastEvent
                        ? `${lastEvent.type} · ${formatDateTime(lastEvent.createdAt)} · ${lastEvent.user.name}`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}

          {printers.length === 0 ? (
            <div className="card text-sm text-muted">
              Todavía no hay impresoras. Creá un modelo arriba y luego un activo
              con categoría <strong>Impresora</strong>.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
