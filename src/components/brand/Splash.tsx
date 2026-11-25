"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const MIN_MS = 1100; // lo justo para ver el logo sin hacer esperar
const FADE_MS = 350;

/**
 * Pantalla de carga breve con el logo oficial. Se muestra al abrir la app,
 * espera a que el progreso se cargue (`ready`) y luego se desvanece.
 */
export function Splash({ ready }: { ready: boolean }) {
  const [minDone, setMinDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || !minDone) return;
    setLeaving(true);
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [ready, minDone]);

  if (gone) return null;

  return (
    <div
      className="splash-screen fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-crema px-8"
      data-leaving={leaving ? "1" : "0"}
      role="status"
      aria-label="Cargando CultivaT"
    >
      <Logo priority className="splash-logo w-[min(82vw,340px)]" />
      <div className="flex gap-2" aria-hidden="true">
        <span className="splash-dot h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
        <span className="splash-dot h-2.5 w-2.5 rounded-full bg-[#F59E0B] [animation-delay:150ms]" />
        <span className="splash-dot h-2.5 w-2.5 rounded-full bg-[#D97706] [animation-delay:300ms]" />
      </div>
    </div>
  );
}
