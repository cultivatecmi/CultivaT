"use client";

import { useEffect, useRef } from "react";

const R = 28; // radio de la pelota (px)
const GRAVITY = 1700;

export interface BallBounds {
  width: number;
  /** y del piso (px dentro del contenedor) */
  floor: number;
  /** y del techo (debajo del HUD) */
  ceil: number;
}

interface Props {
  getBounds: () => BallBounds;
  /** se llama en cada toque; combo = toques seguidos sin tocar el piso */
  onKick: (combo: number, x: number, y: number) => void;
  onFloorHit: (speed: number) => void;
}

/** Pelota saltarina: se patea tocándola y rebota con gravedad en la pantalla principal */
export function BouncyBall({ getBounds, onKick, onFloorHit }: Props) {
  const ballRef = useRef<HTMLButtonElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const st = useRef({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, combo: 0 });
  const cb = useRef({ getBounds, onKick, onFloorHit });
  cb.current = { getBounds, onKick, onFloorHit };

  useEffect(() => {
    const s = st.current;
    const b = cb.current.getBounds();
    s.x = b.width * 0.8;
    s.y = Math.max(b.ceil + R, b.floor - 260);
    s.vx = -90;
    s.vy = 0;
    s.combo = 0;
    let last = performance.now();
    let raf = 0;

    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      const { width, floor, ceil } = cb.current.getBounds();
      s.vy += GRAVITY * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vx * dt * 2.2;

      if (s.x < R) {
        s.x = R;
        s.vx = Math.abs(s.vx) * 0.8;
      } else if (s.x > width - R) {
        s.x = width - R;
        s.vx = -Math.abs(s.vx) * 0.8;
      }
      if (s.y < ceil + R) {
        s.y = ceil + R;
        s.vy = Math.abs(s.vy) * 0.4;
      }
      if (s.y > floor - R) {
        s.y = floor - R;
        if (s.vy > 160) cb.current.onFloorHit(s.vy);
        s.vy = -s.vy * 0.55;
        if (Math.abs(s.vy) < 90) s.vy = 0;
        s.vx *= 0.86;
        if (s.combo) s.combo = 0;
      }

      if (ballRef.current) {
        ballRef.current.style.transform = `translate3d(${s.x - R}px, ${s.y - R}px, 0) rotate(${s.rot}deg)`;
      }
      if (comboRef.current) {
        comboRef.current.style.transform = `translate3d(${s.x}px, ${s.y - R - 26}px, 0) translateX(-50%)`;
        comboRef.current.style.opacity = s.combo >= 2 ? "1" : "0";
        comboRef.current.textContent = `¡${s.combo} dominadas!`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const kick = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const s = st.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const off = (rect.left + rect.width / 2 - e.clientX) / (rect.width / 2);
    s.vy = -880 - Math.random() * 160;
    s.vx = off * 260 + (Math.random() - 0.5) * 140;
    s.combo += 1;
    cb.current.onKick(s.combo, s.x, s.y);
  };

  return (
    <>
      <div
        ref={comboRef}
        className="pointer-events-none absolute left-0 top-0 z-30 whitespace-nowrap rounded-full bg-sol px-2.5 py-0.5 font-display text-sm font-bold text-white opacity-0 shadow transition-opacity"
      />
      <button
        ref={ballRef}
        type="button"
        onPointerDown={kick}
        aria-label="Pelota: tócala para rebotarla"
        className="absolute left-0 top-0 z-30 grid touch-none select-none place-items-center rounded-full"
        style={{ width: R * 2, height: R * 2, fontSize: R * 1.9, lineHeight: 1, filter: "drop-shadow(0 6px 4px rgba(0,0,0,.25))" }}
      >
        <span className="pointer-events-none -mt-0.5">⚽</span>
        {/* área táctil más grande para dedos pequeños */}
        <span className="absolute -inset-3 rounded-full" />
      </button>
    </>
  );
}
