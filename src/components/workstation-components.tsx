"use client";

import { useState, useTransition } from "react";
import {
  installComponentByCode,
  removeComponent,
} from "@/app/actions/workstations";
import { ScanInput } from "@/components/scan-input";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ComponentRow = {
  id: string;
  installedAt: Date | string;
  note: string | null;
  asset: {
    id: string;
    name: string;
    code: string;
    status: "IN_STOCK" | "ON_LOAN" | "ASSIGNED" | "RETIRED";
    category: { name: string };
  };
};

export function WorkstationComponents({
  workstationId,
  components,
}: {
  workstationId: string;
  components: ComponentRow[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleScan(code: string) {
    setMessage(null);
    setError(null);
    const formData = new FormData();
    formData.set("code", code);
    startTransition(async () => {
      try {
        await installComponentByCode(workstationId, formData);
        setMessage(`Componente “${code}” asociado a la PC.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo asociar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Asociar componente (escaneo)</h2>
        <p className="text-sm text-muted">
          Escaneá el SSD, RAM u otro activo en stock para vincularlo a esta PC.
        </p>
        <ScanInput onScan={handleScan} placeholder="Escaneá el componente…" />
        {pending ? <p className="text-sm text-muted">Procesando…</p> : null}
        {message ? <p className="text-sm text-ok">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 text-lg font-semibold">Componentes instalados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Componente</th>
              <th>Código</th>
              <th>Categoría</th>
              <th>Instalado</th>
              <th>Nota</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {components.map((component) => (
              <tr key={component.id}>
                <td>
                  <Link
                    href={`/assets/${component.asset.id}`}
                    className="font-medium text-accent"
                  >
                    {component.asset.name}
                  </Link>
                  <div className="mt-1">
                    <StatusBadge status={component.asset.status} />
                  </div>
                </td>
                <td className="font-mono text-xs">{component.asset.code}</td>
                <td>{component.asset.category.name}</td>
                <td>
                  {format(new Date(component.installedAt), "dd/MM/yyyy HH:mm", {
                    locale: es,
                  })}
                </td>
                <td>{component.note ?? "—"}</td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary !py-1 !text-xs"
                    disabled={pending}
                    onClick={() => {
                      setMessage(null);
                      setError(null);
                      startTransition(async () => {
                        try {
                          await removeComponent(component.id);
                          setMessage("Componente retirado; volvió a stock.");
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Error al retirar",
                          );
                        }
                      });
                    }}
                  >
                    Retirar
                  </button>
                </td>
              </tr>
            ))}
            {components.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  Sin componentes asociados todavía.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
