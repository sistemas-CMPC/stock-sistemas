"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
          Stock Sistemas
        </p>
        <p className="mt-1 text-sm text-muted">
          Ingresá con tu usuario de la oficina
        </p>
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
              placeholder="ej. nsosa"
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
    </div>
  );
}
