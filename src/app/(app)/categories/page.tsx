import { createCategory } from "@/app/actions/catalog";
import { prisma } from "@/lib/prisma";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categorías</h1>
        <p className="text-muted">Tipos de material técnico</p>
      </div>

      <form action={createCategory} className="card flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="label">Nombre</label>
          <input name="name" required className="input" />
        </div>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="isBackupDisk" />
          Es disco de backup
        </label>
        <button type="submit" className="btn-primary">
          Crear
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Backup</th>
              <th>Activos</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.isBackupDisk ? "Sí" : "No"}</td>
                <td>{category._count.assets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
