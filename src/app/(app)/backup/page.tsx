import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { updateBackupInfo } from "@/app/actions/catalog";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";

export default async function BackupPage() {
  const disks = await prisma.asset.findMany({
    where: {
      OR: [
        { category: { isBackupDisk: true } },
        { backupInfo: { isNot: null } },
      ],
    },
    include: {
      category: true,
      backupInfo: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discos de backup</h1>
        <p className="text-muted">
          Registro de contenido y fecha del último backup, sin conectar el disco
        </p>
      </div>

      <div className="space-y-4">
        {disks.map((disk) => (
          <div key={disk.id} className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/assets/${disk.id}`} className="text-xl font-semibold text-accent">
                  {disk.name}
                </Link>
                <p className="font-mono text-xs text-muted">{disk.code}</p>
              </div>
              <StatusBadge status={disk.status} />
            </div>

            <form action={updateBackupInfo.bind(null, disk.id)} className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
              <div>
                <label className="label">Qué tiene guardado</label>
                <textarea
                  name="description"
                  className="input"
                  rows={2}
                  defaultValue={disk.backupInfo?.description ?? ""}
                />
              </div>
              <div>
                <label className="label">Último backup</label>
                <input
                  type="date"
                  name="lastBackupAt"
                  className="input"
                  defaultValue={
                    disk.backupInfo?.lastBackupAt
                      ? format(disk.backupInfo.lastBackupAt, "yyyy-MM-dd")
                      : ""
                  }
                />
                {disk.backupInfo?.lastBackupAt ? (
                  <p className="mt-1 text-xs text-muted">
                    {format(disk.backupInfo.lastBackupAt, "dd/MM/yyyy", {
                      locale: es,
                    })}
                  </p>
                ) : null}
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-secondary w-full">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        ))}

        {disks.length === 0 ? (
          <div className="card text-sm text-muted">
            Todavía no hay discos de backup. Creá un activo con categoría marcada
            como backup.
          </div>
        ) : null}
      </div>
    </div>
  );
}
