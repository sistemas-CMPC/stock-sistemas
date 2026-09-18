import Link from "next/link";
import { getIpInventory } from "@/lib/ip-inventory";
import { LAN_HOST_MAX, LAN_HOST_MIN, LAN_PREFIX } from "@/lib/lan-ip";

type Props = {
  searchParams: Promise<{ q?: string; filter?: string }>;
};

export default async function IpsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const filterRaw = params.filter ?? "all";
  const filter =
    filterRaw === "free" || filterRaw === "occupied" ? filterRaw : "all";

  const { slots, freeCount, occupiedCount, conflictCount } =
    await getIpInventory({ filter, query });

  const filters = [
    { value: "all", label: "Todas" },
    { value: "occupied", label: "Ocupadas" },
    { value: "free", label: "Libres" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">IPs de red</h1>
        <p className="text-muted">
          Rango {LAN_PREFIX}
          {LAN_HOST_MIN} – {LAN_PREFIX}
          {LAN_HOST_MAX}. Reúne PCs, impresoras, servidores, VMs y servicios.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-muted">Ocupadas</p>
          <p className="mt-1 text-2xl font-bold text-warning">{occupiedCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Libres</p>
          <p className="mt-1 text-2xl font-bold text-ok">{freeCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Conflictos (misma IP)</p>
          <p className="mt-1 text-2xl font-bold text-danger">{conflictCount}</p>
        </div>
      </div>

      <form className="card flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[12rem] flex-1">
          <label className="label" htmlFor="q">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={query}
            placeholder="IP, nombre, PC, VM…"
          />
        </div>
        <div>
          <label className="label" htmlFor="filter">
            Ver
          </label>
          <select
            id="filter"
            name="filter"
            className="input"
            defaultValue={filter}
          >
            {filters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Filtrar
        </button>
        {query || filter !== "all" ? (
          <Link href="/ips" className="btn-secondary text-center">
            Limpiar
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        {filters.map((item) => {
          const href =
            item.value === "all"
              ? query
                ? `/ips?q=${encodeURIComponent(query)}`
                : "/ips"
              : `/ips?filter=${item.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
          const active = filter === item.value;
          return (
            <Link
              key={item.value}
              href={href}
              className={`rounded-lg px-3 py-1.5 ${
                active
                  ? "bg-accent/20 text-accent"
                  : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>IP</th>
              <th>Estado</th>
              <th>Ocupada por</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.host}>
                <td className="font-mono text-sm font-medium">{slot.ip}</td>
                <td>
                  {slot.status === "free" ? (
                    <span className="text-ok">Libre</span>
                  ) : slot.occupants.length > 1 ? (
                    <span className="text-danger">Conflicto</span>
                  ) : (
                    <span className="text-warning">Ocupada</span>
                  )}
                </td>
                <td>
                  {slot.occupants.length === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <ul className="space-y-1">
                      {slot.occupants.map((occupant, index) => (
                        <li key={`${occupant.href}-${index}`}>
                          <Link
                            href={occupant.href}
                            className="font-medium text-accent"
                          >
                            {occupant.name}
                          </Link>
                          <span className="text-muted">
                            {" "}
                            · {occupant.kindLabel}
                            {occupant.detail ? ` · ${occupant.detail}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
            {slots.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted">
                  No hay resultados con ese filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
