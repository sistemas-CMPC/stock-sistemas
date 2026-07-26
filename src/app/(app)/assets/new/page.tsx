import { createAsset } from "@/app/actions/catalog";
import { prisma } from "@/lib/prisma";

export default async function NewAssetPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo activo</h1>
        <p className="text-muted">
          Escaneá un código existente o generá uno nuevo para imprimir
        </p>
      </div>

      <form action={createAsset} className="card space-y-4">
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
        <button type="submit" className="btn-primary">
          Registrar activo
        </button>
      </form>
    </div>
  );
}
