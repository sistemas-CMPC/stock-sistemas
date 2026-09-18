import Link from "next/link";
import { ScanWorkstation } from "@/components/scan-workstation";
import { prisma } from "@/lib/prisma";

export default async function ScanPage() {
  const [people, printerModels] = await Promise.all([
    prisma.person.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, area: true },
    }),
    prisma.printerModel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Escanear</h1>
        <p className="text-muted">
          Activos, impresoras y PCs por pistola/QR
        </p>
      </div>
      {people.length === 0 ? (
        <div className="card text-sm text-warning">
          Primero cargá al menos un cliente en{" "}
          <Link href="/people" className="text-accent underline">
            Clientes
          </Link>{" "}
          para poder registrar salidas.
        </div>
      ) : null}
      <ScanWorkstation people={people} printerModels={printerModels} />
    </div>
  );
}
