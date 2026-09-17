"use client";

import { useState, useTransition } from "react";
import { addPrinterEvent, updatePrinterInfo } from "@/app/actions/printers";
import { consumeTonerByBarcode } from "@/app/actions/toners";
import { ScanInput } from "@/components/scan-input";
import { PRINTER_EVENT_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/datetime";

type PrinterInfo = {
  printerModelId: string | null;
  printerModel: { id: string; name: string } | null;
  location: string | null;
  ipAddress: string | null;
  connectedTo: string | null;
  lastTonerAt: Date | string | null;
  notes: string;
} | null;

type PrinterEvent = {
  id: string;
  type: string;
  note: string | null;
  createdAt: Date | string;
  user: { name: string };
};

type PrinterModelOption = { id: string; name: string };

type Props = {
  assetId: string;
  printerInfo: PrinterInfo;
  printerModels: PrinterModelOption[];
  events: PrinterEvent[];
  onDone: (message: string) => void;
  onError: (message: string) => void;
};

export function ScanPrinterPanel({
  assetId,
  printerInfo,
  printerModels,
  events,
  onDone,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [tonerMode, setTonerMode] = useState(false);

  function runEvent(type: string, note?: string) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("assetId", assetId);
        formData.set("type", type);
        if (note) formData.set("note", note);
        await addPrinterEvent(formData);
        onDone(
          type === "TONER_CHANGE"
            ? "Cambio de toner registrado."
            : type === "REPAIR"
              ? "Reparación registrada."
              : "Evento registrado.",
        );
      } catch (err) {
        onError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function handleTonerScan(barcode: string) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("barcode", barcode);
        formData.set("quantity", "1");
        formData.set("printerAssetId", assetId);
        formData.set("keepEmpty", "on");
        await consumeTonerByBarcode(formData);
        setTonerMode(false);
        onDone(`Toner cambiado y stock actualizado (${barcode}).`);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div>
        <h4 className="font-semibold">Impresora</h4>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Modelo</dt>
            <dd>{printerInfo?.printerModel?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Ubicación</dt>
            <dd>{printerInfo?.location || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">IP</dt>
            <dd className="font-mono">{printerInfo?.ipAddress || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Conectada a</dt>
            <dd>{printerInfo?.connectedTo || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Último toner</dt>
            <dd>
              {printerInfo?.lastTonerAt
                ? formatDateTime(printerInfo.lastTonerAt)
                : "Sin registro"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={tonerMode ? "btn-primary" : "btn-secondary"}
          disabled={pending}
          onClick={() => setTonerMode((v) => !v)}
        >
          Cambiar toner (escanear)
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => runEvent("TONER_CHANGE")}
        >
          Solo anotar cambio
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => {
            const note = window.prompt("Detalle de la reparación (opcional):");
            if (note === null) return;
            runEvent("REPAIR", note.trim() || undefined);
          }}
        >
          Registrar reparación
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => {
            const note = window.prompt("Nota:");
            if (!note?.trim()) return;
            runEvent("NOTE", note.trim());
          }}
        >
          Agregar nota
        </button>
      </div>

      {tonerMode ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-sm text-muted">
            Escaneá el código de barras del toner nuevo: descuenta 1 lleno,
            suma 1 vacío y registra el cambio en esta impresora.
          </p>
          <ScanInput
            onScan={handleTonerScan}
            placeholder="Código de barras del toner…"
          />
        </div>
      ) : null}

      <form
        className="grid gap-3 sm:grid-cols-2"
        action={(formData) => {
          startTransition(async () => {
            try {
              formData.set("assetId", assetId);
              await updatePrinterInfo(formData);
              onDone("Datos de impresora actualizados.");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Error");
            }
          });
        }}
      >
        <div>
          <label className="label">Modelo de impresora</label>
          <select
            name="printerModelId"
            className="input"
            defaultValue={printerInfo?.printerModelId ?? ""}
          >
            <option value="">Sin modelo</option>
            {printerModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ubicación</label>
          <input
            name="location"
            className="input"
            defaultValue={printerInfo?.location ?? ""}
            placeholder="Recepción / Piso 2"
          />
        </div>
        <div>
          <label className="label">IP</label>
          <input
            name="ipAddress"
            className="input font-mono"
            defaultValue={printerInfo?.ipAddress ?? ""}
            placeholder="192.168.x.x"
          />
        </div>
        <div>
          <label className="label">Conectada a</label>
          <input
            name="connectedTo"
            className="input"
            defaultValue={printerInfo?.connectedTo ?? ""}
            placeholder="PC Contaduría / red"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notas</label>
          <textarea
            name="notes"
            className="input"
            rows={2}
            defaultValue={printerInfo?.notes ?? ""}
          />
        </div>
        <button
          type="submit"
          className="btn-secondary sm:col-span-2"
          disabled={pending}
        >
          Guardar datos
        </button>
      </form>

      {events.length > 0 ? (
        <div>
          <h5 className="mb-2 text-sm font-semibold">Últimos eventos</h5>
          <ul className="space-y-2 text-sm">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"
              >
                <span>
                  <strong>
                    {PRINTER_EVENT_LABELS[event.type] ?? event.type}
                  </strong>
                  {event.note ? ` · ${event.note}` : ""}
                  <span className="text-muted"> · {event.user.name}</span>
                </span>
                <span className="text-xs text-muted">
                  {formatDateTime(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">Sin eventos de mantenimiento aún.</p>
      )}
    </div>
  );
}
