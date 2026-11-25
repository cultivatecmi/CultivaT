"use client";

import { useEffect, useState } from "react";

/** Catarina (la usan Aplasta Plagas, la Tienda y la Catarina Guardiana de "Mi Planta") */
export function LadybugSvg({ className = "h-[60px] w-[60px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M14 48 l-6 6 M50 48 l6 6 M10 36 h-7 M54 36 h7" stroke="#2D2A26" strokeWidth={2.5} strokeLinecap="round" />
      <ellipse cx="32" cy="38" rx="22" ry="20" fill="#E53935" stroke="#B71C1C" strokeWidth={2} />
      <path d="M32 18 V58" stroke="#2D2A26" strokeWidth={2} />
      {[
        [22, 32, 4.5],
        [42, 32, 4.5],
        [20, 46, 4],
        [44, 46, 4],
        [32, 50, 3],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#2D2A26" />
      ))}
      <ellipse cx="24" cy="26" rx="6" ry="3" fill="#fff" opacity={0.45} />
      <circle cx="32" cy="17" r="11" fill="#2D2A26" />
      <circle cx="27.5" cy="16" r="3.6" fill="#fff" />
      <circle cx="36.5" cy="16" r="3.6" fill="#fff" />
      <circle cx="28" cy="16.5" r="1.8" fill="#2D2A26" />
      <circle cx="37" cy="16.5" r="1.8" fill="#2D2A26" />
      <path d="M28 22 Q 32 25 36 22" stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d="M27 7 Q 24 1 20 2 M37 7 Q 40 1 44 2" stroke="#2D2A26" strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx="22" cy="20" r="2" fill="#FF8A80" opacity={0.8} />
      <circle cx="42" cy="20" r="2" fill="#FF8A80" opacity={0.8} />
    </svg>
  );
}

/** Segundos que le quedan a la catarina (se actualiza cada segundo) */
export function useLadybugLeft(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function formatLeft(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
