"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("error") === "session";

  return (
    <div className="card w-full max-w-md">
      <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
        Stock Sistemas
      </p>
      <p className="mt-1 text-sm text-muted">
        Ingresá con tu usuario de Sistemas
      </p>
      {sessionExpired ? (
        <p className="mt-3 text-sm text-warning">
          Tu sesión quedó desactualizada (cambio de base). Volvé a ingresar.
        </p>
      ) : null}
      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="username">
            Usuario
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>
        {state?.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
