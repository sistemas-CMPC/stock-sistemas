"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

type Props = {
  code: string;
  codeType: "BARCODE" | "QR";
  name: string;
};

export function AssetLabel({ code, codeType, name }: Props) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (codeType === "BARCODE" && barcodeRef.current) {
      JsBarcode(barcodeRef.current, code, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 60,
        margin: 8,
      });
    }

    if (codeType === "QR" && qrRef.current) {
      QRCode.toCanvas(qrRef.current, code, {
        width: 160,
        margin: 1,
      });
    }
  }, [code, codeType]);

  return (
    <div className="card print:border print:shadow-none">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Etiqueta</p>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="font-mono text-sm text-muted">{code}</p>
        </div>
        <button
          type="button"
          className="btn-secondary print:hidden"
          onClick={() => window.print()}
        >
          Imprimir
        </button>
      </div>
      <div className="flex justify-center rounded-md bg-white p-4">
        {codeType === "BARCODE" ? (
          <svg ref={barcodeRef} />
        ) : (
          <canvas ref={qrRef} />
        )}
      </div>
    </div>
  );
}
