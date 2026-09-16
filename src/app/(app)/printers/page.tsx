import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { StatusBadge } from "@/components/status-badge";
import { PRINTER_EVENT_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function PrintersPage() {
  const printers = await prisma.asset.findMany({
    where: {
      OR: [
        { category: { isPrinter: true } },
        { printerInfo: { isNot: null } },
      ],
    },
    include: {
      category: true,
      printerInfo: true,
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
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Impresoras</h1>
          <p className="text-muted">
            Ubicación, conexión, toner y reparaciones. Escaneá el QR en{" "}
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
                  <p className="font-mono text-xs text-muted">{printer.code}</p>
                </div>
                <StatusBadge status={printer.status} />
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted">Modelo</dt>
                  <dd>{printer.printerInfo?.model || "—"}</dd>
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
                      ? format(printer.printerInfo.lastTonerAt, "dd/MM/yyyy", {
                          locale: es,
                        })
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Último evento</dt>
                  <dd>
                    {lastEvent
                      ? `${PRINTER_EVENT_LABELS[lastEvent.type] ?? lastEvent.type} · ${format(lastEvent.createdAt, "dd/MM/yyyy HH:mm", { locale: es })} · ${lastEvent.user.name}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}

        {printers.length === 0 ? (
          <div className="card text-sm text-muted">
            Todavía no hay impresoras. Creá un activo con categoría{" "}
            <strong>Impresora</strong> y tipo de código <strong>QR</strong>,
            imprimí la etiqueta y pegala en el equipo.
          </div>
        ) : null}
      </div>
    </div>
  );
}
