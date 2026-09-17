"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/scan", label: "Escanear" },
  { href: "/assets", label: "Activos" },
  { href: "/printers", label: "Impresoras" },
  { href: "/toners", label: "Toners" },
  { href: "/workstations", label: "PCs" },
  { href: "/people", label: "Clientes" },
  { href: "/backup", label: "Discos backup" },
  { href: "/movements", label: "Movimientos" },
  { href: "/categories", label: "Categorías" },
];

function NavLinks({
  onNavigate,
  className = "",
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={`flex flex-col gap-0.5 ${className}`}>
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent/20 text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "px-1"}>
      <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-accent">
        Stock Sistemas
      </p>
      {!compact ? (
        <p className="mt-0.5 text-xs text-muted">Activos y préstamos</p>
      ) : null}
    </div>
  );
}

function UserFooter({ userName }: { userName: string }) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="truncate px-1 text-sm text-muted" title={userName}>
        {userName}
      </p>
      <form action={logoutAction}>
        <button type="submit" className="btn-secondary w-full !py-2 !text-xs">
          Salir
        </button>
      </form>
    </div>
  );
}

export function AppNav({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand compact />
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/55 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-surface p-4 shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6">
            <Brand />
          </div>
          <NavLinks onNavigate={() => setOpen(false)} className="flex-1 overflow-y-auto" />
          <UserFooter userName={userName} />
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-full flex-col p-4">
          <div className="mb-8 px-1 pt-2">
            <Brand />
          </div>
          <NavLinks className="flex-1 overflow-y-auto" />
          <UserFooter userName={userName} />
        </div>
      </aside>
    </>
  );
}
