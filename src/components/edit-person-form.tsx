"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePerson, type UpdatePersonState } from "@/app/actions/catalog";

type Props = {
  personId: string;
  name: string;
  area: string | null;
  username: string | null;
  active: boolean;
};

export function EditPersonForm({
  personId,
  name,
  area,
  username,
  active,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updatePerson,
    undefined as UpdatePersonState,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="personId" value={personId} />
      <h2 className="text-lg font-semibold sm:col-span-2">Editar cliente</h2>
      <div>
        <label className="label" htmlFor="person-name">
          Nombre
        </label>
        <input
          id="person-name"
          name="name"
          required
          className="input"
          defaultValue={name}
        />
      </div>
      <div>
        <label className="label" htmlFor="person-area">
          Área
        </label>
        <input
          id="person-area"
          name="area"
          className="input"
          defaultValue={area ?? ""}
          placeholder="Opcional"
        />
      </div>
      <div>
        <label className="label">Usuario AD</label>
        <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-muted">
          {username ?? "—"}
        </p>
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={active} />
        Cliente activo
      </label>
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-ok sm:col-span-2">Cliente actualizado.</p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
