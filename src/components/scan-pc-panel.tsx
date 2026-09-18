"use client";

import Link from "next/link";
import { addWorkstationMaintenance } from "@/app/actions/workstations";
import { formatDate } from "@/lib/datetime";
import {
  MAINTENANCE_INTERVAL_DAYS,
  daysSince,
  isMaintenanceDue,
} from "@/lib/maintenance";

type ComponentRow = {
  id: string;
  asset: {
    id: string;
    name: string;
    code: string;
    category: { name: string };
  };
};

type EventRow = {
  id: string;
  performedAt: Date | string;
  note: string | null;
  user: { name: string };
};

type Pc = {
  id: string;
  code: string;
  name: string;
  ipAddress: string | null;
  os: string | null;
  ram: string | null;
  diskType: string | null;
  storage: string | null;
  notes: string | null;
  lastMaintenanceAt: Date | string | null;
  person: { id: string; name: string; area: string | null } | null;
  components: ComponentRow[];
  maintenances: EventRow[];
};

export function ScanPcPanel({
  pc,
  onDone,
  onError,
}: {
  pc: Pc;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const due = isMaintenanceDue(pc.lastMaintenanceAt);
  const days = daysSince(pc.lastMaintenanceAt);

  return (
    <div className="space-y-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">IP</dt>
          <dd className="font-mono">{pc.ipAddress || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Quién la usa</dt>
          <dd>
            {pc.person ? (
              <Link href={`/people/${pc.person.id}`} className="text-accent">
                {pc.person.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted">SO</dt>
          <dd>{pc.os || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">RAM</dt>
          <dd>{pc.ram || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Disco</dt>
          <dd>
            {[pc.diskType, pc.storage].filter(Boolean).join(" · ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Último mantenimiento</dt>
          <dd>
            {pc.lastMaintenanceAt ? formatDate(pc.lastMaintenanceAt) : "—"}
            {days != null ? ` (${days} d)` : ""}
          </dd>
        </div>
      </dl>

      {pc.notes ? (
        <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
          {pc.notes}
        </p>
      ) : null}

      {due ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          Alerta: necesita mantenimiento
          {pc.lastMaintenanceAt
            ? ` (más de ${MAINTENANCE_INTERVAL_DAYS} días)`
            : " (nunca registrado)"}
        </p>
      ) : null}

      <div>
        <h4 className="mb-2 font-medium">Componentes</h4>
        {pc.components.length === 0 ? (
          <p className="text-sm text-muted">Sin componentes asociados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {pc.components.map((c) => (
              <li key={c.id}>
                <Link href={`/assets/${c.asset.id}`} className="text-accent">
                  {c.asset.name}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {c.asset.category.name} ·{" "}
                  <span className="font-mono text-xs">{c.asset.code}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]"
        action={(formData) => {
          void (async () => {
            try {
              await addWorkstationMaintenance(formData);
              onDone("Mantenimiento registrado.");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Error");
            }
          })();
        }}
      >
        <input type="hidden" name="workstationId" value={pc.id} />
        <div>
          <label className="label">Fecha</label>
          <input name="performedAt" type="date" className="input" />
        </div>
        <div>
          <label className="label">Arreglo / nota</label>
          <input
            name="note"
            className="input"
            placeholder="Qué se hizo"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            Registrar
          </button>
        </div>
      </form>

      {pc.maintenances.length > 0 ? (
        <ul className="space-y-1 border-t border-border pt-3 text-sm text-muted">
          {pc.maintenances.slice(0, 5).map((m) => (
            <li key={m.id}>
              {formatDate(m.performedAt)}
              {m.note ? ` · ${m.note}` : ""} · {m.user.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
