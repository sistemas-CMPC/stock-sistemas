"use client";

import { useTransition } from "react";
import {
  adjustTonerStock,
  linkTonerToPrinterModel,
  unlinkTonerFromPrinterModel,
} from "@/app/actions/toners";

type Sku = {
  id: string;
  barcode: string;
  name: string;
  color: string | null;
  fullQty: number;
  emptyQty: number;
  minStock: number;
};

type Compat = {
  id: string;
  tonerSkuId: string;
  printerModelId: string;
  printerModelName: string;
};

type PrinterModelOption = {
  id: string;
  name: string;
};

type Props = {
  skus: Sku[];
  compats: Compat[];
  printerModels: PrinterModelOption[];
};

export function TonerCompatManager({ skus, compats, printerModels }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        action={(formData) => {
          startTransition(async () => {
            await linkTonerToPrinterModel(formData);
          });
        }}
      >
        <div>
          <label className="label">Toner</label>
          <select name="tonerSkuId" required className="input" defaultValue="">
            <option value="" disabled>
              Seleccionar…
            </option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.name} ({sku.barcode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Modelo de impresora</label>
          <select
            name="printerModelId"
            required
            className="input"
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            {printerModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            Vincular
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <h3 className="mb-3 font-semibold">Vínculos toner ↔ modelo</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Toner</th>
              <th>Modelo impresora</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {compats.map((compat) => {
              const sku = skus.find((s) => s.id === compat.tonerSkuId);
              return (
                <tr key={compat.id}>
                  <td>
                    {sku?.name ?? "—"}
                    <span className="ml-2 font-mono text-xs text-muted">
                      {sku?.barcode}
                    </span>
                  </td>
                  <td>{compat.printerModelName}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary !py-1 !text-xs"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          await unlinkTonerFromPrinterModel(compat.id);
                        });
                      }}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
            {compats.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted">
                  Todavía no hay vínculos. Relacioná cada toner con el/los
                  modelo(s) de impresora.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold">Ajuste manual de stock</h3>
        <form
          className="grid gap-3 sm:grid-cols-4"
          action={(formData) => {
            startTransition(async () => {
              await adjustTonerStock(formData);
            });
          }}
        >
          <div className="sm:col-span-2">
            <label className="label">Toner</label>
            <select name="tonerSkuId" required className="input" defaultValue="">
              <option value="" disabled>
                Seleccionar…
              </option>
              {skus.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.name} · L{sku.fullQty} / V{sku.emptyQty}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Llenos</label>
            <input type="number" name="fullQty" min={0} required className="input" />
          </div>
          <div>
            <label className="label">Vacíos</label>
            <input
              type="number"
              name="emptyQty"
              min={0}
              required
              className="input"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Nota</label>
            <input name="note" className="input" placeholder="Inventario físico" />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn-secondary w-full"
              disabled={pending}
            >
              Ajustar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
