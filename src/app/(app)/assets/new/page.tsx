import { prisma } from "@/lib/prisma";
import { NewAssetForm } from "@/components/new-asset-form";

export default async function NewAssetPage() {
  const [categories, printerModels] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.printerModel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo activo</h1>
        <p className="text-muted">
          Escaneá un código existente o generá uno nuevo para imprimir
        </p>
      </div>

      <NewAssetForm categories={categories} printerModels={printerModels} />
    </div>
  );
}
