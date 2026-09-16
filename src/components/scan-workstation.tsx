"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  checkoutLoan,
  createAssignment,
  endAssignment,
  findAssetByCode,
  returnLoan,
} from "@/app/actions/movements";
import { removeComponent } from "@/app/actions/workstations";
import { ScanInput } from "@/components/scan-input";
import { StatusBadge } from "@/components/status-badge";
import { ASSET_STATUS_LABELS } from "@/lib/labels";

type PersonOption = { id: string; name: string; area: string | null };

type ScannedAsset = NonNullable<Awaited<ReturnType<typeof findAssetByCode>>>;

export function ScanWorkstation({ people }: { people: PersonOption[] }) {
  const [asset, setAsset] = useState<ScannedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"loan" | "assignment">("loan");
  const [pending, startTransition] = useTransition();

  function handleScan(code: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const found = await findAssetByCode(code);
      if (!found) {
        setAsset(null);
        setError(`No se encontró un activo con código “${code}”.`);
        return;
      }
      setAsset(found);
    });
  }

  async function refreshAsset(code: string) {
    const found = await findAssetByCode(code);
    setAsset(found);
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Pistola / teclado</h2>
        <p className="text-sm text-muted">
          Escaneá el código y presioná Enter (la mayoría de pistolas lo envían solas).
        </p>
        <ScanInput onScan={handleScan} />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-ok">{message}</p> : null}
      </div>

      {asset ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Activo</p>
              <h3 className="text-2xl font-bold">{asset.name}</h3>
              <p className="font-mono text-sm text-muted">{asset.code}</p>
              <p className="text-sm text-muted">{asset.category.name}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={asset.status} />
              <Link href={`/assets/${asset.id}`} className="text-sm text-accent">
                Ver ficha
              </Link>
            </div>
          </div>

          {asset.status === "IN_STOCK" ? (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={mode === "loan" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setMode("loan")}
                >
                  Préstamo
                </button>
                <button
                  type="button"
                  className={mode === "assignment" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setMode("assignment")}
                >
                  Asignación
                </button>
              </div>

              {mode === "loan" ? (
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  action={(formData) => {
                    startTransition(async () => {
                      try {
                        await checkoutLoan(formData);
                        setMessage("Préstamo registrado.");
                        await refreshAsset(asset.code);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Error");
                      }
                    });
                  }}
                >
                  <input type="hidden" name="assetId" value={asset.id} />
                  <div className="sm:col-span-2">
                    <label className="label">Persona</label>
                    <select name="personId" required className="input">
                      <option value="">Seleccionar…</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                          {person.area ? ` (${person.area})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Vencimiento (opcional)</label>
                    <input type="date" name="dueAt" className="input" />
                  </div>
                  <div>
                    <label className="label">Notas</label>
                    <input name="notes" className="input" />
                  </div>
                  <button type="submit" className="btn-primary sm:col-span-2" disabled={pending}>
                    Confirmar salida por préstamo
                  </button>
                </form>
              ) : (
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  action={(formData) => {
                    startTransition(async () => {
                      try {
                        await createAssignment(formData);
                        setMessage("Asignación registrada.");
                        await refreshAsset(asset.code);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Error");
                      }
                    });
                  }}
                >
                  <input type="hidden" name="assetId" value={asset.id} />
                  <div>
                    <label className="label">Persona / responsable</label>
                    <select name="personId" required className="input">
                      <option value="">Seleccionar…</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                          {person.area ? ` (${person.area})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Nota (ej. PC Contaduría)</label>
                    <input name="note" className="input" />
                  </div>
                  <button type="submit" className="btn-primary sm:col-span-2" disabled={pending}>
                    Confirmar asignación
                  </button>
                </form>
              )}
            </div>
          ) : null}

          {asset.status === "ON_LOAN" ? (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm">
                Prestado a{" "}
                <strong>{asset.loans[0]?.person.name ?? "desconocido"}</strong>
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await returnLoan(asset.id);
                      setMessage("Devolución registrada.");
                      await refreshAsset(asset.code);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Error");
                    }
                  });
                }}
              >
                Registrar ingreso / devolución
              </button>
            </div>
          ) : null}

          {asset.status === "ASSIGNED" ? (
            <div className="space-y-3 border-t border-border pt-4">
              {asset.pcInstalls[0] ? (
                <>
                  <p className="text-sm">
                    Instalado en{" "}
                    <Link
                      href={`/workstations/${asset.pcInstalls[0].workstationId}`}
                      className="font-semibold text-accent"
                    >
                      {asset.pcInstalls[0].workstation.name}
                    </Link>
                    {asset.pcInstalls[0].workstation.ipAddress
                      ? ` (${asset.pcInstalls[0].workstation.ipAddress})`
                      : ""}
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await removeComponent(asset.pcInstalls[0].id);
                          setMessage("Retirado de la PC. Volvió a stock.");
                          await refreshAsset(asset.code);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Error");
                        }
                      });
                    }}
                  >
                    Retirar de PC / ingreso
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm">
                    Asignado a{" "}
                    <strong>
                      {asset.assignments[0]?.person.name ?? "desconocido"}
                    </strong>
                    {asset.assignments[0]?.note
                      ? ` · ${asset.assignments[0].note}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await endAssignment(asset.id);
                          setMessage("Asignación finalizada. Volvió a stock.");
                          await refreshAsset(asset.code);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Error");
                        }
                      });
                    }}
                  >
                    Finalizar asignación / ingreso
                  </button>
                </>
              )}
            </div>
          ) : null}

          {asset.status === "RETIRED" ? (
            <p className="text-sm text-muted">
              Este activo está dado de baja ({ASSET_STATUS_LABELS.RETIRED}).
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
