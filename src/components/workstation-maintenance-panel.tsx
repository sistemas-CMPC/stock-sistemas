"use client";

import { addWorkstationMaintenance } from "@/app/actions/workstations";
import { formatDate, formatDateTime } from "@/lib/datetime";
import {
  MAINTENANCE_INTERVAL_DAYS,
  daysSince,
  isMaintenanceDue,
} from "@/lib/maintenance";

type EventRow = {
  id: string;
  performedAt: Date | string;
  note: string | null;
  user: { name: string };
};

type Props = {
  workstationId: string;
  lastMaintenanceAt: Date | string | null;
  maintenances: EventRow[];
  onDone?: () => void;
};

export function WorkstationMaintenancePanel({
  workstationId,
  lastMaintenanceAt,
  maintenances,
  onDone,
}: Props) {
  const due = isMaintenanceDue(lastMaintenanceAt);
  const days = daysSince(lastMaintenanceAt);

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mantenimiento</h2>
          <p className="text-sm text-muted">
            Último:{" "}
            {lastMaintenanceAt ? formatDate(lastMaintenanceAt) : "sin registro"}
            {days != null ? ` (${days} día(s))` : ""}
          </p>
        </div>
        {due ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            Alerta: necesita mantenimiento
            {lastMaintenanceAt
              ? ` (más de ${MAINTENANCE_INTERVAL_DAYS} días)`
              : " (nunca registrado)"}
          </p>
        ) : (
          <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
            Al día
          </p>
        )}
      </div>

      <form
        action={async (formData) => {
          await addWorkstationMaintenance(formData);
          onDone?.();
        }}
        className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]"
      >
        <input type="hidden" name="workstationId" value={workstationId} />
        <div>
          <label className="label">Fecha</label>
          <input name="performedAt" type="date" className="input" />
        </div>
        <div>
          <label className="label">Qué se hizo</label>
          <input
            name="note"
            className="input"
            placeholder="Limpieza, cambio de pasta, arreglo…"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Registrar
          </button>
        </div>
      </form>

      {maintenances.length > 0 ? (
        <ul className="space-y-2 border-t border-border pt-3 text-sm">
          {maintenances.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"
            >
              <span>
                <strong>{formatDateTime(event.performedAt)}</strong>
                {event.note ? ` · ${event.note}` : ""}
              </span>
              <span className="text-muted">{event.user.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Sin historial de mantenimiento.</p>
      )}
    </div>
  );
}
