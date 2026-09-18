"use client";

import { useActionState } from "react";
import { createServer, type ServerFormState } from "@/app/actions/servers";

export function CreateServerForm() {
  const [state, formAction, pending] = useActionState(
    createServer,
    undefined as ServerFormState,
  );

  return (
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="label">Nombre</label>
        <input
          name="name"
          required
          className="input"
          placeholder="Ej. ESXI-01 / HYPERV-PROD"
        />
      </div>
      <div>
        <label className="label">IP</label>
        <input
          name="ipAddress"
          className="input font-mono"
          placeholder="192.168.0.10"
        />
      </div>
      <div>
        <label className="label">Sistema operativo</label>
        <input
          name="os"
          className="input"
          placeholder="Ej. Windows Server 2022 / ESXi 8"
        />
      </div>
      <div>
        <label className="label">Usuario de acceso</label>
        <input
          name="username"
          className="input font-mono"
          placeholder="Ej. administrator / root"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label">vCPU</label>
        <input name="vcpu" type="number" min={0} step={1} className="input" placeholder="8" />
      </div>
      <div>
        <label className="label">RAM (GB)</label>
        <input name="ramGb" type="number" min={0} step={1} className="input" placeholder="64" />
      </div>
      <div className="sm:col-span-2 lg:col-span-2">
        <label className="label">Discos</label>
        <input
          name="disks"
          className="input"
          placeholder="Ej. 2×500GB SSD + 4TB HDD"
        />
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
          {pending ? "Creando…" : "Crear servidor"}
        </button>
      </div>
    </form>
  );
}
