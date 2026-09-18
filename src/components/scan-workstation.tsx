"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  checkoutLoan,
  createAssignment,
  endAssignment,
  findAssetByCode,
  returnLoan,
} from "@/app/actions/movements";
import {
  findWorkstationByCode,
  removeComponent,
} from "@/app/actions/workstations";
import { ScanInput } from "@/components/scan-input";
import { ScanPcPanel } from "@/components/scan-pc-panel";
import { ScanPrinterPanel } from "@/components/scan-printer-panel";
import { StatusBadge } from "@/components/status-badge";
import { ASSET_STATUS_LABELS } from "@/lib/labels";

type PersonOption = { id: string; name: string; area: string | null };

type ScannedAsset = NonNullable<Awaited<ReturnType<typeof findAssetByCode>>>;
type ScannedPc = NonNullable<Awaited<ReturnType<typeof findWorkstationByCode>>>;

export function ScanWorkstation({
  people,
  printerModels,
}: {
  people: PersonOption[];
  printerModels: { id: string; name: string }[];
}) {
  const [asset, setAsset] = useState<ScannedAsset | null>(null);
  const [pc, setPc] = useState<ScannedPc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"loan" | "assignment">("loan");
  const [pending, startTransition] = useTransition();

  const isPrinter = Boolean(asset?.category.isPrinter || asset?.printerInfo);

  useEffect(() => {
    if (isPrinter) setMode("assignment");
  }, [isPrinter, asset?.id]);

  function handleScan(code: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const foundAsset = await findAssetByCode(code);
      if (foundAsset) {
        setPc(null);
        setAsset(foundAsset);
        return;
      }

      const foundPc = await findWorkstationByCode(code);
      if (foundPc) {
        setAsset(null);
        setPc(foundPc);
        return;
      }

      setAsset(null);
      setPc(null);
      setError(`No se encontró activo ni PC con código “${code}”.`);
    });
  }

  async function refreshAsset(code: string) {
    const found = await findAssetByCode(code);
    setAsset(found);
  }

  async function refreshPc(code: string) {
    const found = await findWorkstationByCode(code);
    setPc(found);
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Pistola / teclado</h2>
        <p className="text-sm text-muted">
          Escaneá QR/barras de activos, impresoras o PCs. En PCs ves IP,
          usuario, componentes y mantenimiento.
        </p>
        <ScanInput onScan={handleScan} />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-ok">{message}</p> : null}
      </div>

      {pc ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">PC</p>
              <h3 className="text-2xl font-bold">{pc.name}</h3>
              <p className="font-mono text-sm text-muted">{pc.code}</p>
            </div>
            <Link href={`/workstations/${pc.id}`} className="text-sm text-accent">
              Ver ficha
            </Link>
          </div>
          <ScanPcPanel
            pc={pc}
            onDone={async (msg) => {
              setError(null);
              setMessage(msg);
              await refreshPc(pc.code);
            }}
            onError={(msg) => {
              setMessage(null);
              setError(msg);
            }}
          />
        </div>
      ) : null}

      {asset ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                {isPrinter ? "Impresora" : "Activo"}
              </p>
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

          {isPrinter ? (
            <>
              {asset.assignments[0] ? (
                <p className="text-sm">
                  Responsable:{" "}
                  <strong>{asset.assignments[0].person.name}</strong>
                  {asset.assignments[0].note
                    ? ` · ${asset.assignments[0].note}`
                    : ""}
                </p>
              ) : (
                <p className="text-sm text-muted">Sin responsable asignado.</p>
              )}
              <ScanPrinterPanel
                assetId={asset.id}
                printerInfo={asset.printerInfo}
                printerModels={printerModels}
                events={asset.printerEvents}
                onDone={async (msg) => {
                  setError(null);
                  setMessage(msg);
                  await refreshAsset(asset.code);
                }}
                onError={(msg) => {
                  setMessage(null);
                  setError(msg);
                }}
              />
            </>
          ) : null}

          {asset.status === "IN_STOCK" ? (
            <div className="space-y-4 border-t border-border pt-4">
              {!isPrinter ? (
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
                    className={
                      mode === "assignment" ? "btn-primary" : "btn-secondary"
                    }
                    onClick={() => setMode("assignment")}
                  >
                    Asignación
                  </button>
                </div>
              ) : (
                <h4 className="font-semibold">Asignar responsable</h4>
              )}

              {mode === "loan" && !isPrinter ? (
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
                  <button
                    type="submit"
                    className="btn-primary sm:col-span-2"
                    disabled={pending}
                  >
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
                    <label className="label">
                      {isPrinter
                        ? "Nota (área / uso)"
                        : "Nota (ej. PC Contaduría)"}
                    </label>
                    <input name="note" className="input" />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary sm:col-span-2"
                    disabled={pending}
                  >
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
                      const fd = new FormData();
                      fd.set("assetId", asset.id);
                      await returnLoan(fd);
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
                          const fd = new FormData();
                          fd.set("componentId", asset.pcInstalls[0].id);
                          await removeComponent(fd);
                          setMessage("Retirado de la PC. Volvió a stock.");
                          await refreshAsset(asset.code);
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Error",
                          );
                        }
                      });
                    }}
                  >
                    Retirar de PC / ingreso
                  </button>
                </>
              ) : (
                <>
                  {!isPrinter ? (
                    <p className="text-sm">
                      Asignado a{" "}
                      <strong>
                        {asset.assignments[0]?.person.name ?? "desconocido"}
                      </strong>
                      {asset.assignments[0]?.note
                        ? ` · ${asset.assignments[0].note}`
                        : ""}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          const fd = new FormData();
                          fd.set("assetId", asset.id);
                          await endAssignment(fd);
                          setMessage("Asignación finalizada. Volvió a stock.");
                          await refreshAsset(asset.code);
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Error",
                          );
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
