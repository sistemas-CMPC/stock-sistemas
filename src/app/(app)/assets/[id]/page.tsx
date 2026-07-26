import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AssetLabel } from "@/components/asset-label";
import { StatusBadge } from "@/components/status-badge";
import {
  endAssignment,
  returnLoan,
} from "@/app/actions/movements";
import { retireAsset, updateAsset, updateBackupInfo } from "@/app/actions/catalog";
import { removeComponent } from "@/app/actions/workstations";
import { CODE_TYPE_LABELS, MOVEMENT_TYPE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const [asset, categories] = await Promise.all([
    prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        backupInfo: true,
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
  ]);

  if (!asset) notFound();

  const activeLoan = asset.loans.find((loan) => !loan.returnedAt);
  const activeAssignment = asset.assignments.find((item) => !item.endedAt);
  const activePcInstall = asset.pcInstalls[0];

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
            <form action={returnLoan.bind(null, asset.id)}>
              <button type="submit" className="btn-primary">
                Registrar devolución
              </button>
            </form>
          ) : null}
          {activeAssignment && !activePcInstall ? (
            <form action={endAssignment.bind(null, asset.id)}>
              <button type="submit" className="btn-primary">
                Finalizar asignación
              </button>
            </form>
          ) : null}
          {activePcInstall ? (
            <form action={removeComponent.bind(null, activePcInstall.id)}>
              <button type="submit" className="btn-primary">
                Retirar de PC
              </button>
            </form>
          ) : null}
          {asset.status !== "RETIRED" ? (
            <form action={retireAsset.bind(null, asset.id)}>
              <button type="submit" className="btn-danger">
                Dar de baja
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AssetLabel
          code={asset.code}
          codeType={asset.codeType}
          name={asset.name}
        />

        <form action={updateAsset.bind(null, asset.id)} className="card space-y-4">
          <h2 className="text-lg font-semibold">Editar</h2>
          <div>
            <label className="label">Nombre</label>
            <input name="name" className="input" defaultValue={asset.name} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              name="description"
              className="input"
              rows={3}
              defaultValue={asset.description ?? ""}
            />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select name="categoryId" className="input" defaultValue={asset.categoryId}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">
            Tipo de código: {CODE_TYPE_LABELS[asset.codeType]} (no editable)
          </p>
          <button type="submit" className="btn-secondary">
            Guardar cambios
          </button>
        </form>
      </div>

      {asset.category.isBackupDisk || asset.backupInfo ? (
        <form action={updateBackupInfo.bind(null, asset.id)} className="card space-y-4">
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
                  ? format(asset.backupInfo.lastBackupAt, "yyyy-MM-dd")
                  : ""
              }
            />
          </div>
          <button type="submit" className="btn-primary">
            Guardar info backup
          </button>
        </form>
      ) : null}

      {(activeLoan || activeAssignment || activePcInstall) && (
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">Situación actual</h2>
          {activeLoan ? (
            <p className="text-sm">
              Prestado a <strong>{activeLoan.person.name}</strong> desde{" "}
              {format(activeLoan.checkedOutAt, "dd/MM/yyyy HH:mm", { locale: es })}
              {activeLoan.dueAt
                ? ` · vencimiento ${format(activeLoan.dueAt, "dd/MM/yyyy", { locale: es })}`
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
              {format(activePcInstall.installedAt, "dd/MM/yyyy HH:mm", {
                locale: es,
              })}
            </p>
          ) : null}
          {activeAssignment && !activePcInstall ? (
            <p className="text-sm">
              Asignado a <strong>{activeAssignment.person.name}</strong>
              {activeAssignment.note ? ` · ${activeAssignment.note}` : ""} desde{" "}
              {format(activeAssignment.assignedAt, "dd/MM/yyyy HH:mm", { locale: es })}
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
                  {format(movement.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
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
