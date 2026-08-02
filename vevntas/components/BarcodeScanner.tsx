"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

type ScannerControls = { stop: () => void };

export function BarcodeScanner({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const [message, setMessage] = useState("Apunte la cámara al código de barras.");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      try {
        setMessage("Solicitando acceso a la cámara…");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!videoRef.current || cancelled) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (result) => {
            if (!result || cancelled) return;
            const text = result.getText().trim();
            if (!text) return;
            controlsRef.current?.stop();
            onDetected(text);
            onClose();
          },
        );
        controlsRef.current = controls;
        setMessage("Apunte la cámara al código de barras.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No fue posible abrir la cámara.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onClose, onDetected]);

  if (!open) return null;
  return (
    <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label="Lector de código de barras">
      <section className="scanner-modal">
        <header>
          <div><span className="eyebrow">CÁMARA</span><h2>Leer código de barras</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X /></button>
        </header>
        <div className="scanner-frame">
          <video ref={videoRef} muted playsInline />
          <div className="scanner-line" />
        </div>
        <p><Camera size={18} />{message}</p>
      </section>
    </div>
  );
}
