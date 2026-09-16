"use client";

import { useActionState } from "react";
import { createAsset } from "@/app/actions/catalog";

type CategoryOption = {
  id: string;
  name: string;
  isBackupDisk: boolean;
};

export function NewAssetForm({ categories }: { categories: CategoryOption[] }) {
  const [state, formAction, pending] = useActionState(createAsset, undefined);

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
        <textarea id="description" name="description" rows={3} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="categoryId">
          Categoría
        </label>
        <select id="categoryId" name="categoryId" required className="input">
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.isBackupDisk ? " (backup)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="codeType">
          Tipo de código
        </label>
        <select id="codeType" name="codeType" className="input" defaultValue="BARCODE">
          <option value="BARCODE">Código de barras (Code128)</option>
          <option value="QR">Código QR</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Usá barras en equipos chicos (pendrive) y QR en equipos más grandes si preferís.
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
