"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateWorkstation,
  type UpdateWorkstationState,
} from "@/app/actions/workstations";

type PersonOption = {
  id: string;
  name: string;
  area: string | null;
};

type Props = {
  workstationId: string;
  name: string;
  ipAddress: string | null;
  os: string | null;
  ram: string | null;
  diskType: string | null;
  storage: string | null;
  notes: string | null;
  lastMaintenanceAt: string | null;
  personId: string | null;
  active: boolean;
  people: PersonOption[];
};

export function EditWorkstationForm({
  workstationId,
  name,
  ipAddress,
  os,
  ram,
  diskType,
  storage,
  notes,
  lastMaintenanceAt,
  personId,
  active,
  people,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateWorkstation,
    undefined as UpdateWorkstationState,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="workstationId" value={workstationId} />
      <div>
        <label className="label">Nombre de la PC</label>
        <input name="name" required className="input" defaultValue={name} />
      </div>
      <div>
        <label className="label">IP(s)</label>
        <input
          name="ipAddress"
          className="input font-mono"
          defaultValue={ipAddress ?? ""}
        />
      </div>
      <div>
        <label className="label">Quién la usa</label>
        <select name="personId" className="input" defaultValue={personId ?? ""}>
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
        <label className="label">Sistema operativo</label>
        <input name="os" className="input" defaultValue={os ?? ""} />
      </div>
      <div>
        <label className="label">RAM</label>
        <input name="ram" className="input" defaultValue={ram ?? ""} />
      </div>
      <div>
        <label className="label">Tipo de disco</label>
        <input name="diskType" className="input" defaultValue={diskType ?? ""} />
      </div>
      <div>
        <label className="label">Almacenamiento</label>
        <input name="storage" className="input" defaultValue={storage ?? ""} />
      </div>
      <div>
        <label className="label">Último mantenimiento</label>
        <input
          name="lastMaintenanceAt"
          type="date"
          className="input"
          defaultValue={lastMaintenanceAt ?? ""}
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="label">Notas</label>
        <textarea
          name="notes"
          className="input"
          rows={2}
          defaultValue={notes ?? ""}
          placeholder="Arreglos, particularidades…"
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="active" defaultChecked={active} />
        Estación activa
      </label>
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-ok sm:col-span-2 lg:col-span-3">Cambios guardados.</p>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
