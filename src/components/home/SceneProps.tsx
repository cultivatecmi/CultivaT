"use client";

import type { ToolId } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Pulgón
// ---------------------------------------------------------------------------

export function AphidSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden>
      {/* patitas */}
      {[14, 22, 30].map((x) => (
        <g key={x} stroke="#33691E" strokeWidth={2} strokeLinecap="round">
          <path d={`M${x} 26 L${x - 4} 34`} />
          <path d={`M${x + 2} 26 L${x + 6} 34`} />
        </g>
      ))}
      <ellipse cx="22" cy="21" rx="15" ry="10" fill="#9CCC65" stroke="#558B2F" strokeWidth={2} />
      <path d="M14 14 Q 16 22 14 29 M22 12 Q 24 21 22 31 M30 14 Q 32 22 30 29" stroke="#7CB342" strokeWidth={1.5} fill="none" />
      <ellipse cx="17" cy="16" rx="5" ry="3" fill="#fff" opacity={0.5} />
      <circle cx="38" cy="18" r="7" fill="#AED581" stroke="#558B2F" strokeWidth={2} />
      <circle cx="40" cy="16" r="2.2" fill="#2D2A26" />
      <circle cx="40.6" cy="15.3" r="0.8" fill="#fff" />
      <path d="M38 12 Q 40 4 46 4 M41 13 Q 46 8 47 10" stroke="#33691E" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sombrilla protectora
// ---------------------------------------------------------------------------

export function UmbrellaSvg({ className, fading }: { className?: string; fading?: boolean }) {
  const panels = 6;
  return (
    <svg viewBox="0 0 200 120" className={cn(className, fading && "animate-pulse")} aria-hidden>
      <defs>
        <linearGradient id="umb-shine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M100 90 L100 114 Q100 120 106 119" stroke="#6D4C41" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* gajos: las varillas salen de la punta y bajan curvas hasta el borde */}
      {Array.from({ length: panels }).map((_, i) => {
        const x0 = 8 + (i * 184) / panels;
        const x1 = 8 + ((i + 1) * 184) / panels;
        return (
          <path
            key={i}
            d={`M100 12 Q ${x0.toFixed(1)} 12 ${x0.toFixed(1)} 92 L ${x1.toFixed(1)} 92 Q ${x1.toFixed(1)} 12 100 12 Z`}
            fill={i % 2 ? "#FFFDF7" : "#FF7043"}
            stroke="#E64A19"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        );
      })}
      {/* festón inferior */}
      {Array.from({ length: panels }).map((_, i) => {
        const x = 8 + (i * 184) / panels;
        return <path key={i} d={`M${x} 92 Q ${x + 184 / panels / 2} 104 ${x + 184 / panels} 92`} fill={i % 2 ? "#FFFDF7" : "#FF7043"} stroke="#E64A19" strokeWidth={1.5} />;
      })}
      <path d="M8 92 Q 8 12 100 12 Q 192 12 192 92 Z" fill="url(#umb-shine)" />
      <circle cx="100" cy="10" r="5" fill="#6D4C41" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Bandeja de herramientas
// ---------------------------------------------------------------------------

export const TOOLS: { id: ToolId; emoji: string; label: string; color: string }[] = [
  { id: "water", emoji: "🚿", label: "Regar", color: "#29B6F6" },
  { id: "feed", emoji: "🧪", label: "Abono", color: "#4CAF50" },
  { id: "shade", emoji: "☂️", label: "Sombra", color: "#FF7043" },
  { id: "sponge", emoji: "🧽", label: "Limpiar", color: "#FFB300" },
  { id: "ball", emoji: "⚽", label: "Pelota", color: "#8D6E63" },
];

interface TrayProps {
  activeTool: ToolId | null;
  ballOn: boolean;
  alerts: Partial<Record<ToolId, boolean>>;
  onToolPointerDown: (tool: ToolId, e: React.PointerEvent<HTMLButtonElement>) => void;
  onToolPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onToolPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

export function ToolTray({ activeTool, ballOn, alerts, onToolPointerDown, onToolPointerMove, onToolPointerUp }: TrayProps) {
  return (
    <div className="absolute inset-x-0 z-30 flex justify-center px-3" style={{ bottom: "var(--tray-b)" }}>
      <div className="flex w-full max-w-[400px] items-stretch justify-between gap-1 rounded-[26px] border-2 border-white bg-white/85 p-1.5 shadow-xl shadow-black/15 backdrop-blur-sm">
        {TOOLS.map((t) => {
          const active = activeTool === t.id || (t.id === "ball" && ballOn);
          return (
            <button
              key={t.id}
              type="button"
              onPointerDown={(e) => onToolPointerDown(t.id, e)}
              onPointerMove={onToolPointerMove}
              onPointerUp={onToolPointerUp}
              onPointerCancel={onToolPointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "relative flex flex-1 touch-none select-none flex-col items-center rounded-2xl border-b-4 px-1 pb-1 pt-1.5 transition-transform active:scale-95",
                active ? "-translate-y-1 text-white" : "border-stone-200 bg-white text-tinta"
              )}
              style={active ? { background: t.color, borderColor: "rgba(0,0,0,.2)" } : undefined}
              aria-label={t.id === "ball" ? (ballOn ? "Guardar la pelota" : "Sacar la pelota") : `${t.label}: arrastra hacia la planta o tócala`}
            >
              <span className={cn("text-[28px] leading-none", activeTool === t.id && "opacity-30")}>{t.emoji}</span>
              <span className="mt-0.5 font-display text-[11px] font-semibold">{t.label}</span>
              {alerts[t.id] && <span className="absolute right-1 top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-alerta" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partículas
// ---------------------------------------------------------------------------

export type ParticleKind = "fall" | "rise" | "burst" | "text";

export interface Particle {
  id: number;
  x: number;
  y: number;
  kind: ParticleKind;
  /** emoji o texto; si empieza con "dot:" se dibuja una bolita de ese color */
  content: string;
  dx?: number;
  dy?: number;
  size?: number;
  delay?: number;
}

export function ParticleLayer({ particles }: { particles: Particle[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {particles.map((p) => {
        const style = {
          left: p.x,
          top: p.y,
          fontSize: p.size ?? 22,
          animationDelay: p.delay ? `${p.delay}s` : undefined,
          "--dx": `${p.dx ?? 0}px`,
          "--dy": `${p.dy ?? (p.kind === "fall" ? 140 : -60)}px`,
        } as React.CSSProperties;
        const cls = cn(
          "absolute select-none leading-none",
          p.kind === "fall" && "p-fall",
          p.kind === "rise" && "p-rise",
          p.kind === "burst" && "p-burst",
          p.kind === "text" && "p-text whitespace-nowrap font-display font-bold text-white [text-shadow:0_2px_0_rgba(0,0,0,.35)]"
        );
        if (p.content.startsWith("dot:")) {
          const color = p.content.slice(4);
          return (
            <span
              key={p.id}
              className={cls}
              style={{ ...style, width: p.size ?? 11, height: p.size ?? 11, borderRadius: 999, background: color, boxShadow: "inset -2px -2px 0 rgba(0,0,0,.2)", opacity: 0 }}
            />
          );
        }
        if (p.content === "bubble") {
          const s = p.size ?? 16;
          return (
            <span
              key={p.id}
              className={cls}
              style={{ ...style, width: s, height: s, borderRadius: 999, border: "2px solid rgba(255,255,255,.95)", background: "rgba(179,229,252,.45)", opacity: 0 }}
            />
          );
        }
        return (
          <span key={p.id} className={cls} style={{ ...style, opacity: 0 }}>
            {p.content}
          </span>
        );
      })}
    </div>
  );
}
