import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetLabel } from "@/components/asset-label";
import { EditWorkstationForm } from "@/components/edit-workstation-form";
import { WorkstationComponents } from "@/components/workstation-components";
import { WorkstationMaintenancePanel } from "@/components/workstation-maintenance-panel";
import { formatDateInput } from "@/lib/datetime";
import { isMaintenanceDue } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function WorkstationDetailPage({ params }: Props) {
  const { id } = await params;
  const [workstation, people] = await Promise.all([
    prisma.workstation.findUnique({
      where: { id },
      include: {
        person: true,
        components: {
          where: { removedAt: null },
          include: {
            asset: { include: { category: true } },
          },
          orderBy: { installedAt: "desc" },
        },
        maintenances: {
          include: { user: { select: { name: true } } },
          orderBy: { performedAt: "desc" },
          take: 15,
        },
      },
    }),
    prisma.person.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!workstation) notFound();

  const due = isMaintenanceDue(workstation.lastMaintenanceAt);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/workstations" className="text-sm text-accent">
          ← Estaciones
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{workstation.name}</h1>
        <p className="text-muted">
          {workstation.ipAddress
            ? `IP ${workstation.ipAddress}`
            : "Sin IP cargada"}
          {workstation.person ? ` · ${workstation.person.name}` : ""}
          {workstation.os ? ` · ${workstation.os}` : ""}
        </p>
        <p className="mt-1 font-mono text-xs text-muted">{workstation.code}</p>
        {due ? (
          <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            Alerta: esta PC necesita mantenimiento (más de 1 año o sin registro).
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AssetLabel
          code={workstation.code}
          codeType="QR"
          name={workstation.name}
        />
        <div className="card space-y-2 text-sm">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <p>
            <span className="text-muted">RAM:</span> {workstation.ram ?? "—"}
          </p>
          <p>
            <span className="text-muted">Disco:</span>{" "}
            {[workstation.diskType, workstation.storage]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <p>
            <span className="text-muted">Notas:</span>{" "}
            {workstation.notes ?? "—"}
          </p>
        </div>
      </div>

      <EditWorkstationForm
        workstationId={workstation.id}
        name={workstation.name}
        ipAddress={workstation.ipAddress}
        os={workstation.os}
        ram={workstation.ram}
        diskType={workstation.diskType}
        storage={workstation.storage}
        notes={workstation.notes}
        lastMaintenanceAt={
          workstation.lastMaintenanceAt
            ? formatDateInput(workstation.lastMaintenanceAt)
            : null
        }
        personId={workstation.personId}
        active={workstation.active}
        people={people}
      />

      <WorkstationMaintenancePanel
        workstationId={workstation.id}
        lastMaintenanceAt={workstation.lastMaintenanceAt}
        maintenances={workstation.maintenances}
      />

      <WorkstationComponents
        workstationId={workstation.id}
        components={workstation.components}
      />
    </div>
  );
}
