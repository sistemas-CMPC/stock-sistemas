"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createAsset } from "@/app/actions/catalog";

type CategoryOption = {
  id: string;
  name: string;
  isBackupDisk: boolean;
  isPrinter: boolean;
};

type PrinterModelOption = {
  id: string;
  name: string;
};

export function NewAssetForm({
  categories,
  printerModels,
}: {
  categories: CategoryOption[];
  printerModels: PrinterModelOption[];
}) {
  const [state, formAction, pending] = useActionState(createAsset, undefined);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  const isPrinter = Boolean(selectedCategory?.isPrinter);

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input id="name" name="name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="categoryId">
          Categoría
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.isBackupDisk ? " (backup)" : ""}
              {category.isPrinter ? " (impresora)" : ""}
            </option>
          ))}
        </select>
      </div>

      {isPrinter ? (
        <div>
          <label className="label" htmlFor="printerModelId">
            Modelo de impresora
          </label>
          <select
            id="printerModelId"
            name="printerModelId"
            required
            className="input"
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar modelo…
            </option>
            {printerModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            El modelo define qué toner usa. Si no está en la lista, crealo en{" "}
            <Link href="/printers" className="text-accent underline">
              Impresoras
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="codeType">
          Tipo de código
        </label>
        <select
          id="codeType"
          name="codeType"
          className="input"
          defaultValue={isPrinter ? "QR" : "BARCODE"}
          key={isPrinter ? "qr" : "bc"}
        >
          <option value="BARCODE">Código de barras (Code128)</option>
          <option value="QR">Código QR</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          {isPrinter
            ? "Para impresoras usá QR: imprimí la etiqueta desde la ficha y pegala en el equipo."
            : "Usá barras en equipos chicos y QR si preferís."}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="code">
          Código existente (opcional)
        </label>
        <input
          id="code"
          name="code"
          className="input font-mono"
          placeholder="Escaneá o pegá el código del fabricante"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="generateCode" defaultChecked />
        Generar código automáticamente si no hay uno existente
      </label>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Registrando…" : "Registrar activo"}
      </button>
    </form>
  );
}
