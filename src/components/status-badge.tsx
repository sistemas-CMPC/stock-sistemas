import { AssetStatus } from "@prisma/client";
import { ASSET_STATUS_LABELS } from "@/lib/labels";

const styles: Record<AssetStatus, string> = {
  IN_STOCK: "bg-emerald-100 text-ok",
  ON_LOAN: "bg-amber-100 text-warning",
  ASSIGNED: "bg-sky-100 text-sky-800",
  RETIRED: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span className={`badge ${styles[status]}`}>
      {ASSET_STATUS_LABELS[status]}
    </span>
  );
}
