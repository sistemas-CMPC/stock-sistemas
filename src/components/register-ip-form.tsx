"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIpReservation } from "@/app/actions/ips";

export function RegisterIpForm({ defaultIp = "" }: { defaultIp?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      id="ip-register-form"
      className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await createIpReservation(formData);
            router.refresh();
            (
              document.getElementById("ip-register-form") as HTMLFormElement | null
            )?.reset();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "No se pudo registrar",
            );
          }
        });
      }}
    >
      <div className="sm:col-span-2 lg:col-span-4">
        <h2 className="text-lg font-semibold">Registrar IP ocupada</h2>
        <p className="text-sm text-muted">
          Para cosas de red que no están en stock: MikroTik, AP, cámara, switch,
          etc.
        </p>
      </div>
      <div>
        <label className="label">IP</label>
        <input
          name="ipAddress"
          required
          className="input font-mono"
          placeholder="192.168.0.1 o 1"
          defaultValue={defaultIp}
        />
      </div>
      <div>
        <label className="label">Ocupada por</label>
        <input
          name="label"
          required
          className="input"
          placeholder="Ej. MikroTik / AP sala"
        />
      </div>
      <div>
        <label className="label">Notas</label>
        <input name="notes" className="input" placeholder="Opcional" />
      </div>
      <div className="flex items-end">
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Guardando…" : "Registrar"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{error}</p>
      ) : null}
    </form>
  );
}
