"use client";

import { useActionState } from "react";
import { createServer, type ServerFormState } from "@/app/actions/servers";

export function CreateServerForm() {
  const [state, formAction, pending] = useActionState(
    createServer,
    undefined as ServerFormState,
  );

  return (
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2">
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
      <div className="sm:col-span-2">
        <label className="label">Notas</label>
        <input name="notes" className="input" placeholder="Opcional" />
      </div>
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2">{state.error}</p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creando…" : "Crear servidor"}
        </button>
      </div>
    </form>
  );
}
