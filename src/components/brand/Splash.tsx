"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";

const MIN_MS = 1700; // la pantalla de carga se ve entre 1.5 y 2 s
const FADE_MS = 450;

/** Hojita decorativa que cae balanceándose */
function Leaf({ className, color }: { className: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2 C 20 6 21 16 12 22 C 3 16 4 6 12 2 Z" fill={color} />
      <path d="M12 5 C 12.5 10 12.5 15 12 20" stroke="#FFFBEB" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 50" className={className} aria-hidden="true">
      <path
        d="M22 44 C 8 44 6 28 19 26 C 19 12 38 8 46 18 C 52 6 76 6 80 22 C 96 18 108 30 100 44 Z"
        fill="#FFFFFF"
        stroke="#F3E8C8"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Brote que va en la punta de la barra de carga */
function TipSprout() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <path d="M16 30 C 16 24 16 20 16 15" stroke="#15803D" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M16 19 C 10 20 5 16 4 10 C 10 9 15 13 16 19 Z" fill="#22C55E" />
      <path d="M16 16 C 22 17 27 13 28 7 C 22 6 17 10 16 16 Z" fill="#4ADE80" />
    </svg>
  );
}

/**
 * Pantalla de carga al abrir la app: logo oficial, nubes, hojitas, sol y una
 * barra estilo videojuego. Espera a que el progreso esté cargado (`ready`)
 * y se desvanece para mostrar "Mi Planta" sin saltos.
 */
export function Splash({ ready }: { ready: boolean }) {
  const [progress, setProgress] = useState(0);
  const [minDone, setMinDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  // el tiempo mínimo lo marca un temporizador (no depende de la animación)
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (minDone && ready) {
      setProgress(100);
      setLeaving(true);
    }
  }, [minDone, ready]);

  // la barra avanza suave; si los datos aún no llegan, se queda en 92 %
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / MIN_MS);
      const eased = 1 - Math.pow(1 - p, 2);
      setProgress((prev) => Math.max(prev, readyRef.current ? eased * 100 : Math.min(92, eased * 100)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone) return null;

  const pct = Math.round(progress);

  return (
    <div
      className="splash-screen fixed inset-0 z-[200] overflow-hidden bg-[#FFFBEB]"
      data-leaving={leaving ? "1" : "0"}
      role="status"
      aria-live="polite"
      aria-label={`Cargando CultivaT: ${pct}%`}
    >
      {/* decoración sutil */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute right-3 top-4 h-28 w-28">
          <div className="splash-sun-rays absolute inset-0 rounded-full" />
          <div className="absolute inset-[30px] rounded-full bg-[#F59E0B] shadow-[0_0_30px_6px_rgba(245,158,11,.3)]" />
        </div>
        <Cloud className="splash-cloud absolute left-[-30px] top-[12%] w-32 opacity-90" />
        <Cloud className="splash-cloud splash-cloud-slow absolute right-[8%] top-[26%] w-24 opacity-80" />
        <Cloud className="splash-cloud absolute bottom-[22%] left-[6%] w-20 opacity-70 [animation-delay:-3s]" />
        <Leaf className="splash-leaf absolute left-[14%] top-[-6%] h-6 w-6" color="#22C55E" />
        <Leaf className="splash-leaf absolute left-[72%] top-[-6%] h-5 w-5 [animation-delay:-1.4s]" color="#4ADE80" />
        <Leaf className="splash-leaf absolute left-[44%] top-[-6%] h-4 w-4 [animation-delay:-2.6s]" color="#15803D" />
        <Leaf className="splash-leaf absolute left-[86%] top-[-6%] h-4 w-4 [animation-delay:-0.6s]" color="#22C55E" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FDE7C3]/70 to-transparent" />
      </div>

      <div className="relative mx-auto flex h-full max-w-[430px] flex-col items-center justify-center px-8">
        <Logo variant="horizontal" priority className="splash-logo h-auto w-[min(84vw,340px)]" />

        <div className="mt-10 w-[min(80vw,300px)]">
          <div className="relative h-6 rounded-full border-b-4 border-[#78350F] bg-[#92400E] p-1 shadow-inner">
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-[#15803D] to-[#22C55E]"
              style={{ width: `${Math.max(8, pct)}%` }}
            >
              <div className="absolute inset-x-2 top-0.5 h-1 rounded-full bg-white/35" />
              <div className="absolute -right-3 -top-7">
                <TipSprout />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-display text-lg font-semibold text-[#78350F]">¡Cargando la aventura de Brotín! 🌱</p>
        <p className="mt-1 text-center font-display text-sm font-medium text-[#92400E]">Conectando con el campo de Culiacán...</p>
      </div>
    </div>
  );
}
