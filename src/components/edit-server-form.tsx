"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateServer, type ServerFormState } from "@/app/actions/servers";

type Props = {
  serverId: string;
  name: string;
  ipAddress: string | null;
  notes: string | null;
  active: boolean;
};

export function EditServerForm({
  serverId,
  name,
  ipAddress,
  notes,
  active,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateServer,
    undefined as ServerFormState,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="serverId" value={serverId} />
      <div>
        <label className="label">Nombre</label>
        <input name="name" required className="input" defaultValue={name} />
      </div>
      <div>
        <label className="label">IP</label>
        <input
          name="ipAddress"
          className="input font-mono"
          defaultValue={ipAddress ?? ""}
          placeholder="192.168.0.10"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={notes ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={active} />
        Activo
      </label>
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-ok sm:col-span-2">Guardado.</p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar servidor"}
        </button>
      </div>
    </form>
  );
}
