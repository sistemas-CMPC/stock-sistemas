"use client";

import { useTransition } from "react";
import { setPrinterResponsible } from "@/app/actions/printers";

type PersonOption = {
  id: string;
  name: string;
  area: string | null;
};

type Props = {
  assetId: string;
  people: PersonOption[];
  currentPersonId?: string | null;
  currentNote?: string | null;
  onDone?: (message: string) => void;
  onError?: (message: string) => void;
  compact?: boolean;
};

export function PrinterResponsibleForm({
  assetId,
  people,
  currentPersonId = null,
  currentNote = null,
  onDone,
  onError,
  compact = false,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={
        compact
          ? "grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          : "grid gap-3 sm:grid-cols-2"
      }
      action={(formData) => {
        startTransition(async () => {
          try {
            formData.set("assetId", assetId);
            await setPrinterResponsible(formData);
            onDone?.("Responsable actualizado.");
          } catch (err) {
            onError?.(err instanceof Error ? err.message : "Error");
          }
        });
      }}
    >
      {!compact ? (
        <h3 className="text-base font-semibold sm:col-span-2">
          Responsable
        </h3>
      ) : null}
      <div>
        <label className="label">De quién es / responsable</label>
        <select
          name="personId"
          className="input"
          defaultValue={currentPersonId ?? ""}
        >
          <option value="">Sin asignar</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
              {person.area ? ` (${person.area})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Nota (área / uso)</label>
        <input
          name="note"
          className="input"
          defaultValue={currentNote ?? ""}
          placeholder="Ej. Contaduría / recepción"
        />
      </div>
      <div className={compact ? "flex items-end" : "sm:col-span-2"}>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar responsable"}
        </button>
      </div>
    </form>
  );
}
