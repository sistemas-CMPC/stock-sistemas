"use client";

import { useActionState } from "react";
import {
  syncPeopleFromAd,
  type SyncPeopleState,
} from "@/app/actions/people-sync";

export function SyncPeopleFromAdButton() {
  const [state, formAction, pending] = useActionState(
    syncPeopleFromAd,
    undefined as SyncPeopleState,
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "Sincronizando…" : "Sincronizar desde AD"}
        </button>
      </form>
      {state?.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      {state && !state.error && state.total != null ? (
        <p className="text-sm text-ok">
          Sync OK — {state.total} en AD · {state.created} creados ·{" "}
          {state.updated} actualizados
        </p>
      ) : null}
    </div>
  );
}
