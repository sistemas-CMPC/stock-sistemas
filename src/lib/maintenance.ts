/** Días desde el último mantenimiento para marcar alerta. */
export const MAINTENANCE_INTERVAL_DAYS = 365;

export function daysSince(date: Date | string | number | null | undefined): number | null {
  if (!date) return null;
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return null;
  const ms = Date.now() - then;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isMaintenanceDue(
  lastMaintenanceAt: Date | string | number | null | undefined,
): boolean {
  if (!lastMaintenanceAt) return true;
  const days = daysSince(lastMaintenanceAt);
  if (days === null) return true;
  return days >= MAINTENANCE_INTERVAL_DAYS;
}
