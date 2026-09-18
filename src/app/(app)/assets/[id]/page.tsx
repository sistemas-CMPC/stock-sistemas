import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetLabel } from "@/components/asset-label";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { EditAssetForm } from "@/components/edit-asset-form";
import { StatusBadge } from "@/components/status-badge";
import { endAssignment, returnLoan } from "@/app/actions/movements";
import { retireAsset, updateBackupInfo } from "@/app/actions/catalog";
import { addPrinterEvent, updatePrinterInfo } from "@/app/actions/printers";
import { removeComponent } from "@/app/actions/workstations";
import { PrinterResponsibleForm } from "@/components/printer-responsible-form";
import { formatDate, formatDateInput, formatDateTime } from "@/lib/datetime";
import { MOVEMENT_TYPE_LABELS, PRINTER_EVENT_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const [asset, categories, printerModels, people] = await Promise.all([
    prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        backupInfo: true,
        printerInfo: { include: { printerModel: true } },
        printerEvents: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        loans: {
          include: { person: true },
          orderBy: { checkedOutAt: "desc" },
          take: 10,
        },
        assignments: {
          include: { person: true },
          orderBy: { assignedAt: "desc" },
          take: 10,
        },
        pcInstalls: {
          where: { removedAt: null },
          include: { workstation: true },
          take: 1,
          orderBy: { installedAt: "desc" },
        },
        movements: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 15,
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.printerModel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.person.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, area: true },
    }),
  ]);

  if (!asset) notFound();

  const activeLoan = asset.loans.find((loan) => !loan.returnedAt);
  const activeAssignment = asset.assignments.find((item) => !item.endedAt);
  const activePcInstall = asset.pcInstalls[0];
  const canDelete = !activeLoan && !activeAssignment && !activePcInstall;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/assets" className="text-sm text-accent">
            ← Activos
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{asset.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={asset.status} />
            <span className="text-sm text-muted">{asset.category.name}</span>
            <span className="font-mono text-sm text-muted">{asset.code}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {asset.status === "ON_LOAN" ? (
            <form action={returnLoan}>
              <input type="hidden" name="assetId" value={asset.id} />
              <button type="submit" className="btn-primary">
                Registrar devolución
              </button>
            </form>
          ) : null}
          {activeAssignment && !activePcInstall ? (
            <form action={endAssignment}>
              <input type="hidden" name="assetId" value={asset.id} />
              <button type="submit" className="btn-primary">
                Finalizar asignación
              </button>
            </form>
          ) : null}
          {activePcInstall ? (
            <form action={removeComponent}>
              <input type="hidden" name="componentId" value={activePcInstall.id} />
              <button type="submit" className="btn-primary">
                Retirar de PC
              </button>
            </form>
          ) : null}
          {asset.status !== "RETIRED" ? (
            <form action={retireAsset}>
              <input type="hidden" name="assetId" value={asset.id} />
              <button type="submit" className="btn-danger">
                Dar de baja
              </button>
            </form>
          ) : null}
          {canDelete ? (
            <DeleteAssetButton assetId={asset.id} assetName={asset.name} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AssetLabel
          code={asset.code}
          codeType={asset.codeType}
          name={asset.name}
        />

        <EditAssetForm
          assetId={asset.id}
          name={asset.name}
          description={asset.description}
          categoryId={asset.categoryId}
          code={asset.code}
          codeType={asset.codeType}
          categories={categories}
        />
      </div>

      {asset.category.isBackupDisk || asset.backupInfo ? (
        <form action={updateBackupInfo} className="card space-y-4">
          <input type="hidden" name="assetId" value={asset.id} />
          <h2 className="text-lg font-semibold">Info de backup</h2>
          <div>
            <label className="label">Qué tiene guardado</label>
            <textarea
              name="description"
              className="input"
              rows={4}
              defaultValue={asset.backupInfo?.description ?? ""}
              placeholder="Ej: backup completo de servidor fileserver al 2026-07"
            />
          </div>
          <div>
            <label className="label">Fecha del último backup</label>
            <input
              type="date"
              name="lastBackupAt"
              className="input max-w-xs"
              defaultValue={
                asset.backupInfo?.lastBackupAt
                  ? formatDateInput(asset.backupInfo.lastBackupAt)
                  : ""
              }
            />
          </div>
          <button type="submit" className="btn-primary">
            Guardar info backup
          </button>
        </form>
      ) : null}

      {asset.category.isPrinter || asset.printerInfo ? (
        <div className="space-y-4">
          <form action={updatePrinterInfo} className="card space-y-4">
            <input type="hidden" name="assetId" value={asset.id} />
            <h2 className="text-lg font-semibold">Info de impresora</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Modelo de impresora</label>
                <select
                  name="printerModelId"
                  className="input"
                  defaultValue={asset.printerInfo?.printerModelId ?? ""}
                >
                  <option value="">Sin modelo</option>
                  {printerModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ubicación</label>
                <input
                  name="location"
                  className="input"
                  defaultValue={asset.printerInfo?.location ?? ""}
                />
              </div>
              <div>
                <label className="label">IP</label>
                <input
                  name="ipAddress"
                  className="input font-mono"
                  defaultValue={asset.printerInfo?.ipAddress ?? ""}
                />
              </div>
              <div>
                <label className="label">Conectada a</label>
                <input
                  name="connectedTo"
                  className="input"
                  defaultValue={asset.printerInfo?.connectedTo ?? ""}
                  placeholder="PC / red / área"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notas</label>
                <textarea
                  name="notes"
                  className="input"
                  rows={2}
                  defaultValue={asset.printerInfo?.notes ?? ""}
                />
              </div>
            </div>
            <p className="text-sm text-muted">
              Último toner:{" "}
              {asset.printerInfo?.lastTonerAt
                ? formatDateTime(asset.printerInfo.lastTonerAt)
                : "sin registro"}
            </p>
            <button type="submit" className="btn-primary">
              Guardar impresora
            </button>
          </form>

          <div className="card space-y-3">
            <PrinterResponsibleForm
              assetId={asset.id}
              people={people}
              currentPersonId={activeAssignment?.personId}
              currentNote={activeAssignment?.note}
            />
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">Mantenimiento</h2>
            <div className="flex flex-wrap gap-2">
              <form action={addPrinterEvent}>
                <input type="hidden" name="assetId" value={asset.id} />
                <input type="hidden" name="type" value="TONER_CHANGE" />
                <button type="submit" className="btn-primary">
                  Cambiar toner
                </button>
              </form>
              <form action={addPrinterEvent} className="flex flex-wrap gap-2">
                <input type="hidden" name="assetId" value={asset.id} />
                <input type="hidden" name="type" value="REPAIR" />
                <input
                  name="note"
                  className="input max-w-xs"
                  placeholder="Detalle reparación"
                />
                <button type="submit" className="btn-secondary">
                  Registrar reparación
                </button>
              </form>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Operador</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {asset.printerEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td>{PRINTER_EVENT_LABELS[event.type] ?? event.type}</td>
                    <td>{event.user.name}</td>
                    <td>{event.note ?? "—"}</td>
                  </tr>
                ))}
                {asset.printerEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted">
                      Sin eventos aún
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {(activeLoan || activeAssignment || activePcInstall) && (
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">Situación actual</h2>
          {activeLoan ? (
            <p className="text-sm">
              Prestado a <strong>{activeLoan.person.name}</strong> desde{" "}
              {formatDateTime(activeLoan.checkedOutAt)}
              {activeLoan.dueAt
                ? ` · vencimiento ${formatDate(activeLoan.dueAt)}`
                : ""}
            </p>
          ) : null}
          {activePcInstall ? (
            <p className="text-sm">
              Instalado en{" "}
              <Link
                href={`/workstations/${activePcInstall.workstationId}`}
                className="font-semibold text-accent"
              >
                {activePcInstall.workstation.name}
              </Link>
              {activePcInstall.workstation.ipAddress
                ? ` (${activePcInstall.workstation.ipAddress})`
                : ""}{" "}
              desde{" "}
              {formatDateTime(activePcInstall.installedAt)}
            </p>
          ) : null}
          {activeAssignment && !activePcInstall ? (
            <p className="text-sm">
              Asignado a <strong>{activeAssignment.person.name}</strong>
              {activeAssignment.note ? ` · ${activeAssignment.note}` : ""} desde{" "}
              {formatDateTime(activeAssignment.assignedAt)}
            </p>
          ) : null}
        </div>
      )}

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Historial de movimientos</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Operador</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {asset.movements.map((movement) => (
              <tr key={movement.id}>
                <td>
                  {formatDateTime(movement.createdAt)}
                </td>
                <td>{MOVEMENT_TYPE_LABELS[movement.type]}</td>
                <td>{movement.user.name}</td>
                <td>{movement.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
