"use client";

import { deleteIpReservation } from "@/app/actions/ips";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DeleteIpReservationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn-danger !py-0.5 !text-xs"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("¿Liberar esta reserva de IP?")) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", id);
          await deleteIpReservation(fd);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Liberar"}
    </button>
  );
}
