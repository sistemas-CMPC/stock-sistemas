import Link from "next/link";
import { notFound } from "next/navigation";
import { updateWorkstation } from "@/app/actions/workstations";
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

      <form
        action={updateWorkstation.bind(null, workstation.id)}
        className="card grid gap-3 md:grid-cols-2"
      >
        <div>
          <label className="label">Nombre de la PC</label>
          <input
            name="name"
            required
            className="input"
            defaultValue={workstation.name}
          />
        </div>
        <div>
          <label className="label">IP</label>
          <input
            name="ipAddress"
            className="input font-mono"
            defaultValue={workstation.ipAddress ?? ""}
          />
        </div>
        <div>
          <label className="label">Quién la tiene</label>
          <select
            name="personId"
            className="input"
            defaultValue={workstation.personId ?? ""}
          >
            <option value="">Sin asignar</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.area ? ` (${person.area})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notas</label>
          <input
            name="notes"
            className="input"
            defaultValue={workstation.notes ?? ""}
          />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="active" defaultChecked={workstation.active} />
          Estación activa
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="btn-secondary">
            Guardar cambios
          </button>
        </div>
      </form>

      <WorkstationComponents
        workstationId={workstation.id}
        components={workstation.components}
      />
    </div>
  );
}
