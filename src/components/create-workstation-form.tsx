"use client";

import { useActionState } from "react";
import { createWorkstation } from "@/app/actions/workstations";

type PersonOption = {
  id: string;
  name: string;
  area: string | null;
};

export function CreateWorkstationForm({ people }: { people: PersonOption[] }) {
  const [state, formAction, pending] = useActionState(createWorkstation, undefined);

  return (
    <form action={formAction} className="card grid gap-3 md:grid-cols-2">
      <div>
        <label className="label">Nombre de la PC</label>
        <input
          name="name"
          required
          className="input"
          placeholder="Ej. PC-CONTADURIA-01"
        />
      </div>
      <div>
        <label className="label">IP</label>
        <input
          name="ipAddress"
          className="input font-mono"
          placeholder="Ej. 192.168.1.45"
        />
      </div>
      <div>
        <label className="label">Quién la tiene</label>
        <select name="personId" className="input">
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
        <input name="notes" className="input" placeholder="Opcional" />
      </div>
      {state?.error ? (
        <p className="text-sm text-danger md:col-span-2">{state.error}</p>
      ) : null}
      <div className="md:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creando…" : "Crear estación"}
        </button>
      </div>
    </form>
  );
}
