import { AssetStatus, CodeType, MovementType } from "@prisma/client";

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: "En stock",
  ON_LOAN: "Prestado",
  ASSIGNED: "Asignado",
  RETIRED: "Baja",
};

export const CODE_TYPE_LABELS: Record<CodeType, string> = {
  BARCODE: "Código de barras",
  QR: "Código QR",
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ALTA: "Alta",
  BAJA: "Baja",
  INGRESO: "Ingreso",
  SALIDA_PRESTAMO: "Salida (préstamo)",
  DEVOLUCION: "Devolución",
  ASIGNACION: "Asignación",
  FIN_ASIGNACION: "Fin asignación",
  ASIGNACION_PC: "Instalado en PC",
  FIN_ASIGNACION_PC: "Retirado de PC",
};

export function generateAssetCode(prefix = "IT"): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}
