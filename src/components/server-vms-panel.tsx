"use client";

import {
  createVm,
  createVmService,
  deleteVm,
  deleteVmService,
  migrateVm,
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
  os: string | null;
  username: string | null;
  vcpu: number | null;
  ramGb: number | null;
  disks: string | null;
  contents: string | null;
  notes: string | null;
  active: boolean;
  services: Service[];
};

type ServerOption = {
  id: string;
  name: string;
};

function resourcesSummary(vm: Vm) {
  const parts: string[] = [];
  if (vm.vcpu != null) parts.push(`${vm.vcpu} vCPU`);
  if (vm.ramGb != null) parts.push(`${vm.ramGb} GB RAM`);
  if (vm.disks) parts.push(vm.disks);
  return parts.length ? parts.join(" · ") : null;
}

export function ServerVmsPanel({
  serverId,
  vms,
  otherServers,
}: {
  serverId: string;
  vms: Vm[];
  otherServers: ServerOption[];
}) {
  return (
    <div className="space-y-4">
      <form
        action={createVm}
        className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <input type="hidden" name="serverId" value={serverId} />
        <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-3">
          Agregar VM
        </h2>
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
          <label className="label">IP(s)</label>
          <input
            name="ipAddress"
            className="input font-mono"
            placeholder="192.168.0.20, 192.168.0.21"
          />
        </div>
        <div>
          <label className="label">Sistema operativo</label>
          <input
            name="os"
            className="input"
            placeholder="Ej. Windows Server 2019"
          />
        </div>
        <div>
          <label className="label">Usuario de acceso</label>
          <input
            name="username"
            className="input font-mono"
            placeholder="administrator"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label">vCPU</label>
          <input name="vcpu" type="number" min={0} step={1} className="input" />
        </div>
        <div>
          <label className="label">RAM (GB)</label>
          <input name="ramGb" type="number" min={0} step={1} className="input" />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="label">Discos</label>
          <input
            name="disks"
            className="input"
            placeholder="Ej. 100GB OS + 500GB datos"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="label">Qué tiene adentro</label>
          <textarea
            name="contents"
            className="input"
            rows={2}
            placeholder="Ej. Controlador de dominio, DNS, DHCP…"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="label">Notas</label>
          <input name="notes" className="input" placeholder="Opcional" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
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
              <p className="text-sm text-muted">
                <span className="font-mono">{vm.ipAddress ?? "Sin IP"}</span>
                {vm.os ? ` · ${vm.os}` : ""}
                {vm.username ? ` · user ${vm.username}` : ""}
                {!vm.active ? " · inactiva" : ""}
              </p>
              {resourcesSummary(vm) ? (
                <p className="mt-1 text-sm text-muted">{resourcesSummary(vm)}</p>
              ) : null}
              {vm.contents ? (
                <p className="mt-2 text-sm">{vm.contents}</p>
              ) : null}
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

          {otherServers.length > 0 ? (
            <form
              action={migrateVm}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-2 p-3"
              onSubmit={(event) => {
                const select = event.currentTarget.elements.namedItem(
                  "toServerId",
                ) as HTMLSelectElement | null;
                const targetName =
                  select?.selectedOptions[0]?.textContent?.trim() ?? "otro servidor";
                if (
                  !window.confirm(
                    `¿Migrar “${vm.name}” a ${targetName}?`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="vmId" value={vm.id} />
              <input type="hidden" name="fromServerId" value={serverId} />
              <div className="min-w-[12rem] flex-1">
                <label className="label">Migrar a servidor</label>
                <select name="toServerId" required className="input">
                  <option value="">Elegir destino…</option>
                  {otherServers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-secondary">
                Migrar VM
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted">
              Para migrar esta VM necesitás al menos otro servidor cargado.
            </p>
          )}

          <form
            action={updateVm}
            className="grid gap-3 border-b border-border pb-4 sm:grid-cols-2 lg:grid-cols-3"
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
              <label className="label">IP(s)</label>
              <input
                name="ipAddress"
                className="input font-mono"
                defaultValue={vm.ipAddress ?? ""}
                placeholder="192.168.0.20, 192.168.0.21"
              />
            </div>
            <div>
              <label className="label">Sistema operativo</label>
              <input name="os" className="input" defaultValue={vm.os ?? ""} />
            </div>
            <div>
              <label className="label">Usuario de acceso</label>
              <input
                name="username"
                className="input font-mono"
                defaultValue={vm.username ?? ""}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label">vCPU</label>
              <input
                name="vcpu"
                type="number"
                min={0}
                step={1}
                className="input"
                defaultValue={vm.vcpu ?? ""}
              />
            </div>
            <div>
              <label className="label">RAM (GB)</label>
              <input
                name="ramGb"
                type="number"
                min={0}
                step={1}
                className="input"
                defaultValue={vm.ramGb ?? ""}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="label">Discos</label>
              <input
                name="disks"
                className="input"
                defaultValue={vm.disks ?? ""}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Qué tiene adentro</label>
              <textarea
                name="contents"
                className="input"
                rows={2}
                defaultValue={vm.contents ?? ""}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Notas</label>
              <input
                name="notes"
                className="input"
                defaultValue={vm.notes ?? ""}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
              <input type="checkbox" name="active" defaultChecked={vm.active} />
              Activa
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <button type="submit" className="btn-secondary">
                Guardar VM
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="font-medium">Servicios / roles (detalle)</h4>
            {vm.services.length === 0 ? (
              <p className="text-sm text-muted">
                Podés listar ítems concretos (AD, SQL, IIS…) con IP propia.
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
                        <button
                          type="submit"
                          className="btn-secondary !py-1.5 !text-xs"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                    <form
                      action={deleteVmService}
                      className="mt-2"
                      onSubmit={(event) => {
                        if (!window.confirm(`¿Eliminar “${service.name}”?`)) {
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
                placeholder="Servicio (ej. SQL Server)"
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
