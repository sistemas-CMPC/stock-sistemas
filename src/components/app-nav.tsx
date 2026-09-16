import Link from "next/link";
import { signOut } from "@/auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/scan", label: "Escanear" },
  { href: "/assets", label: "Activos" },
  { href: "/workstations", label: "PCs" },
  { href: "/people", label: "Clientes" },
  { href: "/backup", label: "Discos backup" },
  { href: "/movements", label: "Movimientos" },
  { href: "/categories", label: "Categorías" },
];

export function AppNav({ userName }: { userName: string }) {
  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-accent">
            Stock Sistemas
          </p>
          <p className="text-xs text-muted">Control de activos y préstamos</p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-background hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">{userName}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-secondary !py-1.5 !text-xs">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
