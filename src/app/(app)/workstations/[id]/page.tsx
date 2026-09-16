import Link from "next/link";
import { notFound } from "next/navigation";
import { EditWorkstationForm } from "@/components/edit-workstation-form";
import { WorkstationComponents } from "@/components/workstation-components";
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
      },
    }),
    prisma.person.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!workstation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/workstations" className="text-sm text-accent">
          ← Estaciones
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{workstation.name}</h1>
        <p className="text-muted">
          {workstation.ipAddress
            ? `IP ${workstation.ipAddress}`
            : "Sin IP cargada"}
          {workstation.person ? ` · ${workstation.person.name}` : ""}
        </p>
      </div>

      <EditWorkstationForm
        workstationId={workstation.id}
        name={workstation.name}
        ipAddress={workstation.ipAddress}
        notes={workstation.notes}
        personId={workstation.personId}
        active={workstation.active}
        people={people}
      />

      <WorkstationComponents
        workstationId={workstation.id}
        components={workstation.components}
      />
    </div>
  );
}
