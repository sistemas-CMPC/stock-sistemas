"use client";

import { deleteServer } from "@/app/actions/servers";

export function DeleteServerButton({
  serverId,
  serverName,
}: {
  serverId: string;
  serverName: string;
}) {
  return (
    <form
      action={deleteServer}
      onSubmit={(event) => {
        const ok = window.confirm(
          `¿Eliminar el servidor “${serverName}” y todas sus VMs?`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="serverId" value={serverId} />
      <button type="submit" className="btn-danger">
        Eliminar servidor
      </button>
    </form>
  );
}
