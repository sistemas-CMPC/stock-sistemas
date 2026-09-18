/** Red LAN del depósito: 192.168.0.1 – 192.168.0.255 */

export const LAN_PREFIX = "192.168.0.";
export const LAN_HOST_MIN = 1;
export const LAN_HOST_MAX = 255;

const FULL_IP_RE = /^192\.168\.0\.(\d{1,3})$/;

/** Normaliza a `192.168.0.N` o null si está fuera de rango / inválida. */
export function normalizeLanIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const full = trimmed.match(FULL_IP_RE);
  if (full) {
    const host = Number(full[1]);
    if (host < LAN_HOST_MIN || host > LAN_HOST_MAX) return null;
    return `${LAN_PREFIX}${host}`;
  }

  // Acepta solo el host: "42" → 192.168.0.42
  if (/^\d{1,3}$/.test(trimmed)) {
    const host = Number(trimmed);
    if (host < LAN_HOST_MIN || host > LAN_HOST_MAX) return null;
    return `${LAN_PREFIX}${host}`;
  }

  return null;
}

export function parseLanHost(ip: string): number | null {
  const normalized = normalizeLanIp(ip);
  if (!normalized) return null;
  return Number(normalized.slice(LAN_PREFIX.length));
}

export function isLanIp(raw: string | null | undefined): boolean {
  return normalizeLanIp(raw) !== null;
}

/** Valida IP opcional: vacía = ok (null), si hay valor debe ser LAN. */
export function parseOptionalLanIp(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = normalizeLanIp(trimmed);
  if (!normalized) {
    throw new Error(
      `IP inválida: usá 192.168.0.1–192.168.0.255 (recibido “${trimmed}”)`,
    );
  }
  return normalized;
}

export type IpKind =
  | "workstation"
  | "printer"
  | "server"
  | "vm"
  | "vm_service";

export type IpOccupant = {
  ip: string;
  host: number;
  kind: IpKind;
  kindLabel: string;
  name: string;
  detail?: string;
  href: string;
};

export const IP_KIND_LABELS: Record<IpKind, string> = {
  workstation: "PC",
  printer: "Impresora",
  server: "Servidor",
  vm: "VM",
  vm_service: "Servicio VM",
};
