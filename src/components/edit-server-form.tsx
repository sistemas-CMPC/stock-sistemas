"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateServer, type ServerFormState } from "@/app/actions/servers";

type Props = {
  serverId: string;
  name: string;
  ipAddress: string | null;
  os: string | null;
  username: string | null;
  vcpu: number | null;
  ramGb: number | null;
  disks: string | null;
  notes: string | null;
  active: boolean;
};

export function EditServerForm({
  serverId,
  name,
  ipAddress,
  os,
  username,
  vcpu,
  ramGb,
  disks,
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
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      <div>
        <label className="label">Sistema operativo</label>
        <input name="os" className="input" defaultValue={os ?? ""} />
      </div>
      <div>
        <label className="label">Usuario de acceso</label>
        <input
          name="username"
          className="input font-mono"
          defaultValue={username ?? ""}
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label">vCPU</label>
        <input
          name="vcpu"
          type="number"
          min={0}
          step={1}
          className="input"
          defaultValue={vcpu ?? ""}
        />
      </div>
      <div>
        <label className="label">RAM (GB)</label>
        <input
          name="ramGb"
          type="number"
          min={0}
          step={1}
          className="input"
          defaultValue={ramGb ?? ""}
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-2">
        <label className="label">Discos</label>
        <input name="disks" className="input" defaultValue={disks ?? ""} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={notes ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="active" defaultChecked={active} />
        Activo
      </label>
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-ok sm:col-span-2 lg:col-span-3">Guardado.</p>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar servidor"}
        </button>
      </div>
    </form>
  );
}
