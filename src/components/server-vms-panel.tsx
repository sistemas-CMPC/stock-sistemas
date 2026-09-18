"use client";

import {
  createVm,
  createVmService,
  deleteVm,
  deleteVmService,
  updateVm,
  updateVmService,
} from "@/app/actions/servers";

type Service = {
  id: string;
  name: string;
  ipAddress: string | null;
  notes: string | null;
};

type Vm = {
  id: string;
  name: string;
  ipAddress: string | null;
  notes: string | null;
  active: boolean;
  services: Service[];
};

export function ServerVmsPanel({
  serverId,
  vms,
}: {
  serverId: string;
  vms: Vm[];
}) {
  return (
    <div className="space-y-4">
      <form action={createVm} className="card grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="serverId" value={serverId} />
        <h2 className="text-lg font-semibold sm:col-span-2">Agregar VM</h2>
        <div>
          <label className="label">Nombre</label>
          <input
            name="name"
            required
            className="input"
            placeholder="Ej. VM-AD / VM-FILES"
          />
        </div>
        <div>
          <label className="label">IP</label>
          <input
            name="ipAddress"
            className="input font-mono"
            placeholder="192.168.0.20"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notas</label>
          <input name="notes" className="input" placeholder="Opcional" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            Agregar VM
          </button>
        </div>
      </form>

      {vms.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay VMs en este servidor.</p>
      ) : null}

      {vms.map((vm) => (
        <article key={vm.id} className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{vm.name}</h3>
              <p className="font-mono text-sm text-muted">
                {vm.ipAddress ?? "Sin IP"}
                {!vm.active ? " · inactiva" : ""}
              </p>
            </div>
            <form
              action={deleteVm}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    `¿Eliminar la VM “${vm.name}” y todo su contenido?`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="vmId" value={vm.id} />
              <input type="hidden" name="serverId" value={serverId} />
              <button type="submit" className="btn-danger !py-1.5 !text-xs">
                Eliminar VM
              </button>
            </form>
          </div>

          <form
            action={updateVm}
            className="grid gap-3 border-b border-border pb-4 sm:grid-cols-2"
          >
            <input type="hidden" name="vmId" value={vm.id} />
            <input type="hidden" name="serverId" value={serverId} />
            <div>
              <label className="label">Nombre</label>
              <input
                name="name"
                required
                className="input"
                defaultValue={vm.name}
              />
            </div>
            <div>
              <label className="label">IP</label>
              <input
                name="ipAddress"
                className="input font-mono"
                defaultValue={vm.ipAddress ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <input
                name="notes"
                className="input"
                defaultValue={vm.notes ?? ""}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="active" defaultChecked={vm.active} />
              Activa
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-secondary">
                Guardar VM
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="font-medium">Contenido / servicios</h4>
            {vm.services.length === 0 ? (
              <p className="text-sm text-muted">
                Sin servicios cargados (AD, SQL, IIS, etc.).
              </p>
            ) : (
              <ul className="space-y-3">
                {vm.services.map((service) => (
                  <li
                    key={service.id}
                    className="rounded-lg border border-border bg-surface-2 p-3"
                  >
                    <form
                      action={updateVmService}
                      className="grid gap-2 sm:grid-cols-[1fr_10rem_1fr_auto]"
                    >
                      <input type="hidden" name="serviceId" value={service.id} />
                      <input type="hidden" name="serverId" value={serverId} />
                      <input
                        name="name"
                        required
                        className="input"
                        defaultValue={service.name}
                        aria-label="Nombre del servicio"
                      />
                      <input
                        name="ipAddress"
                        className="input font-mono"
                        defaultValue={service.ipAddress ?? ""}
                        placeholder="IP"
                        aria-label="IP del servicio"
                      />
                      <input
                        name="notes"
                        className="input"
                        defaultValue={service.notes ?? ""}
                        placeholder="Notas"
                        aria-label="Notas"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="btn-secondary !py-1.5 !text-xs">
                          Guardar
                        </button>
                      </div>
                    </form>
                    <form
                      action={deleteVmService}
                      className="mt-2"
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `¿Eliminar “${service.name}”?`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="serviceId" value={service.id} />
                      <input type="hidden" name="serverId" value={serverId} />
                      <button type="submit" className="btn-danger !py-1 !text-xs">
                        Quitar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={createVmService}
              className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_10rem_1fr_auto]"
            >
              <input type="hidden" name="vmId" value={vm.id} />
              <input type="hidden" name="serverId" value={serverId} />
              <input
                name="name"
                required
                className="input"
                placeholder="Qué hay adentro (ej. SQL Server)"
              />
              <input
                name="ipAddress"
                className="input font-mono"
                placeholder="IP"
              />
              <input name="notes" className="input" placeholder="Notas" />
              <button type="submit" className="btn-primary !text-xs">
                Agregar
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
