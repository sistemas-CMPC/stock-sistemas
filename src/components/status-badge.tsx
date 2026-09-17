import { AssetStatus } from "@prisma/client";
import { ASSET_STATUS_LABELS } from "@/lib/labels";

const styles: Record<AssetStatus, string> = {
  IN_STOCK: "bg-ok/15 text-ok",
  ON_LOAN: "bg-warning/15 text-warning",
  ASSIGNED: "bg-accent/15 text-accent",
  RETIRED: "bg-surface-2 text-muted",
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span className={`badge ${styles[status]}`}>
      {ASSET_STATUS_LABELS[status]}
    </span>
  );
}
