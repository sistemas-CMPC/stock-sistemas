"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type Mode = "keyboard" | "camera";

type Props = {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

const HINTS = (() => {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.DATA_MATRIX,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
})();

export function ScanInput({
  onScan,
  placeholder = "Escaneá el código…",
  autoFocus = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const [mode, setMode] = useState<Mode>("keyboard");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const emitScan = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      const now = Date.now();
      if (
        lastCodeRef.current.code === code &&
        now - lastCodeRef.current.at < 2500
      ) {
        return;
      }
      lastCodeRef.current = { code, at: now };
      onScan(code);
    },
    [onScan],
  );

  const stopCamera = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore
    }
    controlsRef.current = null;
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (mode === "keyboard" && autoFocus) {
      inputRef.current?.focus();
    }
  }, [mode, autoFocus]);

  useEffect(() => {
    if (mode !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraError(null);

    async function start() {
      if (!videoRef.current) return;

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraError(
          "La cámara requiere HTTPS (o localhost). Abrí la app por un enlace seguro.",
        );
        return;
      }

      try {
        const reader = new BrowserMultiFormatReader(HINTS, {
          delayBetweenScanAttempts: 200,
          delayBetweenScanSuccess: 1500,
        });

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        if (!devices.length) {
          setCameraError("No se encontró una cámara en este dispositivo.");
          return;
        }

        const back =
          devices.find((d) => /back|rear|environment|trasera/i.test(d.label)) ??
          devices[devices.length - 1];

        setCameraActive(true);
        const controls = await reader.decodeFromVideoDevice(
          back.deviceId,
          videoRef.current,
          (result, error) => {
            if (result) emitScan(result.getText());
            if (
              error &&
              error.name !== "NotFoundException" &&
              error.name !== "ChecksumException" &&
              error.name !== "FormatException"
            ) {
              // frames fallidos normales mientras enfoca
            }
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "No se pudo abrir la cámara";
        if (/Permission|NotAllowed|denied/i.test(message)) {
          setCameraError(
            "Permiso de cámara denegado. Activá la cámara en el navegador.",
          );
        } else {
          setCameraError(message);
        }
        setCameraActive(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, emitScan, stopCamera]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={mode === "keyboard" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("keyboard")}
        >
          Pistola / teclado
        </button>
        <button
          type="button"
          className={mode === "camera" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("camera")}
        >
          Cámara (QR / barras)
        </button>
      </div>

      {mode === "keyboard" ? (
        <input
          ref={inputRef}
          className="input text-lg font-mono"
          placeholder={placeholder}
          autoComplete="off"
          inputMode="none"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const value = event.currentTarget.value.trim();
              if (!value) return;
              emitScan(value);
              event.currentTarget.value = "";
            }
          }}
        />
      ) : (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-border bg-black">
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              muted
              playsInline
              autoPlay
            />
          </div>
          <p className="text-xs text-muted">
            Apuntá al QR o al código de barras. Se lee solo al enfocarlo.
            {cameraActive ? " Cámara activa." : ""}
          </p>
          {cameraError ? (
            <p className="text-sm text-danger">{cameraError}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
