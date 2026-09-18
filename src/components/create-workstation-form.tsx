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
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <label className="label">IP(s)</label>
        <input
          name="ipAddress"
          className="input font-mono"
          placeholder="192.168.0.45"
        />
      </div>
      <div>
        <label className="label">Quién la usa</label>
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
        <label className="label">Sistema operativo</label>
        <input name="os" className="input" placeholder="Ej. Windows 11 Pro" />
      </div>
      <div>
        <label className="label">RAM</label>
        <input name="ram" className="input" placeholder="Ej. 16 GB DDR4" />
      </div>
      <div>
        <label className="label">Tipo de disco</label>
        <input name="diskType" className="input" placeholder="SSD / HDD / NVMe" />
      </div>
      <div>
        <label className="label">Almacenamiento</label>
        <input name="storage" className="input" placeholder="Ej. 512 GB" />
      </div>
      <div>
        <label className="label">Último mantenimiento</label>
        <input name="lastMaintenanceAt" type="date" className="input" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="label">Notas</label>
        <input name="notes" className="input" placeholder="Opcional" />
      </div>
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creando…" : "Crear estación"}
        </button>
      </div>
    </form>
  );
}
