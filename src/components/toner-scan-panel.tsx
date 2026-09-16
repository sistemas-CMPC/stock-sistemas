"use client";

import { useState, useTransition } from "react";
import {
  disposeEmptyToner,
  receiveTonerByBarcode,
  useTonerByBarcode,
} from "@/app/actions/toners";
import { ScanInput } from "@/components/scan-input";

type Mode = "incoming" | "used" | "empty_out";

type PrinterOption = { id: string; name: string; model: string | null };

export function TonerScanPanel({ printers }: { printers: PrinterOption[] }) {
  const [mode, setMode] = useState<Mode>("incoming");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastBarcode, setLastBarcode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [printerAssetId, setPrinterAssetId] = useState("");
  const [keepEmpty, setKeepEmpty] = useState(true);

  function handleScan(code: string) {
    setLastBarcode(code);
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("barcode", code);
        formData.set("quantity", String(quantity));

        if (mode === "incoming") {
          if (name.trim()) formData.set("name", name.trim());
          if (color.trim()) formData.set("color", color.trim());
          await receiveTonerByBarcode(formData);
          setMessage(`Ingreso OK: +${quantity} lleno(s) · ${code}`);
          setName("");
        } else if (mode === "used") {
          if (printerAssetId) formData.set("printerAssetId", printerAssetId);
          formData.set("keepEmpty", keepEmpty ? "on" : "off");
          await useTonerByBarcode(formData);
          setMessage(
            `Uso OK: −${quantity} lleno(s)${keepEmpty ? `, +${quantity} vacío(s)` : ""} · ${code}`,
          );
        } else {
          await disposeEmptyToner(formData);
          setMessage(`Salida de vacíos OK: −${quantity} · ${code}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Escanear toner</h2>
        <p className="text-sm text-muted">
          El código de barras identifica la familia/modelo. Escaneá al llegar
          (ingreso) o al cambiar (uso).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["incoming", "Ingreso (llenos)"],
            ["used", "Cambio / uso"],
            ["empty_out", "Sacar vacíos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mode === value ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Cantidad</label>
          <input
            type="number"
            min={1}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        {mode === "incoming" ? (
          <>
            <div>
              <label className="label">Nombre (solo la 1ª vez)</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="HP 26A Negro"
              />
            </div>
            <div>
              <label className="label">Color (opcional)</label>
              <input
                className="input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Negro / Cian / …"
              />
            </div>
          </>
        ) : null}
        {mode === "used" ? (
          <>
            <div>
              <label className="label">Impresora (opcional)</label>
              <select
                className="input"
                value={printerAssetId}
                onChange={(e) => setPrinterAssetId(e.target.value)}
              >
                <option value="">Sin vincular</option>
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.model ? ` · ${p.model}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={keepEmpty}
                onChange={(e) => setKeepEmpty(e.target.checked)}
              />
              Guardar el vacío en stock
            </label>
          </>
        ) : null}
      </div>

      <ScanInput onScan={handleScan} placeholder="Escaneá el código de barras…" />
      {lastBarcode ? (
        <p className="font-mono text-xs text-muted">Último: {lastBarcode}</p>
      ) : null}
      {pending ? <p className="text-sm text-muted">Procesando…</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-ok">{message}</p> : null}
    </div>
  );
}
