import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

/** Hora oficial de Argentina (UTC−3, sin DST). */
export const APP_TIMEZONE = "America/Argentina/Buenos_Aires";

export function formatDateTime(
  date: Date | string | number,
  pattern = "dd/MM/yyyy HH:mm",
) {
  return formatInTimeZone(date, APP_TIMEZONE, pattern, { locale: es });
}

export function formatDate(date: Date | string | number) {
  return formatInTimeZone(date, APP_TIMEZONE, "dd/MM/yyyy", { locale: es });
}

/** Valor para <input type="date"> en calendario argentino. */
export function formatDateInput(date: Date | string | number) {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");
}
