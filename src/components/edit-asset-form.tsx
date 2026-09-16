"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateAsset, type UpdateAssetState } from "@/app/actions/catalog";

type CategoryOption = {
  id: string;
  name: string;
};

type Props = {
  assetId: string;
  name: string;
  description: string | null;
  categoryId: string;
  code: string;
  codeType: "BARCODE" | "QR";
  categories: CategoryOption[];
};

export function EditAssetForm({
  assetId,
  name,
  description,
  categoryId,
  code,
  codeType,
  categories,
}: Props) {
  const router = useRouter();
  const action = updateAsset.bind(null, assetId);
  const [state, formAction, pending] = useActionState(
    action,
    undefined as UpdateAssetState,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="card space-y-4">
      <h2 className="text-lg font-semibold">Editar</h2>
      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          className="input"
          defaultValue={name}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          className="input"
          rows={3}
          defaultValue={description ?? ""}
        />
      </div>
      <div>
        <label className="label" htmlFor="categoryId">
          Categoría
        </label>
        <select
          id="categoryId"
          name="categoryId"
          className="input"
          defaultValue={categoryId}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="codeType">
          Tipo de código
        </label>
        <select
          id="codeType"
          name="codeType"
          className="input"
          defaultValue={codeType}
        >
          <option value="BARCODE">Código de barras (Code128)</option>
          <option value="QR">Código QR</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="code">
          Código
        </label>
        <input
          id="code"
          name="code"
          className="input font-mono"
          defaultValue={code}
          required
        />
      </div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm text-ok">Cambios guardados.</p>
      ) : null}
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
