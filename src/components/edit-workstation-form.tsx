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
  notes: string | null;
  personId: string | null;
  active: boolean;
  people: PersonOption[];
};

export function EditWorkstationForm({
  workstationId,
  name,
  ipAddress,
  notes,
  personId,
  active,
  people,
}: Props) {
  const router = useRouter();
  const action = updateWorkstation.bind(null, workstationId);
  const [state, formAction, pending] = useActionState(
    action,
    undefined as UpdateWorkstationState,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="card grid gap-3 md:grid-cols-2">
      <div>
        <label className="label">Nombre de la PC</label>
        <input name="name" required className="input" defaultValue={name} />
      </div>
      <div>
        <label className="label">IP</label>
        <input
          name="ipAddress"
          className="input font-mono"
          defaultValue={ipAddress ?? ""}
        />
      </div>
      <div>
        <label className="label">Quién la tiene</label>
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
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={notes ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="active" defaultChecked={active} />
        Estación activa
      </label>
      {state?.error ? (
        <p className="text-sm text-danger md:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-ok md:col-span-2">Cambios guardados.</p>
      ) : null}
      <div className="md:col-span-2">
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
