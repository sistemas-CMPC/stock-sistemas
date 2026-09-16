"use client";

import { useEffect, useRef } from "react";

type Props = {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function ScanInput({
  onScan,
  placeholder = "Escaneá el código…",
  autoFocus = true,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <input
      ref={ref}
      className="input text-lg font-mono"
      placeholder={placeholder}
      autoComplete="off"
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const value = event.currentTarget.value.trim();
          if (!value) return;
          onScan(value);
          event.currentTarget.value = "";
        }
      }}
    />
  );
}
