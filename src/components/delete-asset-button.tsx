"use client";

import { deleteAsset } from "@/app/actions/catalog";

export function DeleteAssetButton({
  assetId,
  assetName,
}: {
  assetId: string;
  assetName: string;
}) {
  return (
    <form
      action={deleteAsset.bind(null, assetId)}
      onSubmit={(event) => {
        const ok = window.confirm(
          `¿Eliminar permanentemente “${assetName}”? Se borra el historial. Esta acción no se puede deshacer.`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <button type="submit" className="btn-danger">
        Eliminar
      </button>
    </form>
  );
}
