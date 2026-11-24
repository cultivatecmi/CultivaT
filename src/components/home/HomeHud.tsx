"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { NotificationsPanel } from "@/components/layout/NotificationsPanel";
import { isShaded } from "@/lib/game";
import { getStage } from "@/lib/stages";
import { isMuted, playSound, setMuted, subscribeMuted } from "@/lib/sound";
import { CLIMATES } from "@/lib/weather";
import { cn } from "@/lib/utils";

/** anillo de progreso circular */
function Ring({ value, color, size, stroke = 4, children, className, label }: { value: number; color: string; size: number; stroke?: number; children: React.ReactNode; className?: string; label: string }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} title={`${label}: ${Math.round(v)}%`}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.65)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - v / 100)} style={{ transition: "stroke-dashoffset .6s ease, stroke .3s" }} />
      </svg>
      <span className="relative leading-none">{children}</span>
    </div>
  );
}

export function HomeHud() {
  const { state, now, markAllRead, session, growStage } = useGameState();
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const [open, setOpen] = useState(false);
  const st = getStage(state.xp);
  const unread = state.notifications.filter((n) => !n.read).length;
  const climate = CLIMATES[state.climate];
  const shaded = isShaded(state, now);

  const close = () => {
    setOpen(false);
    markAllRead();
  };

  const pill = "flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/70 px-2.5 font-display text-[15px] font-semibold shadow-sm backdrop-blur-sm";

  const meters = [
    { label: "Agua", emoji: "💧", value: state.water, color: "#29B6F6" },
    { label: "Nutrientes", emoji: "🌱", value: state.nutrients, color: "#4CAF50" },
    { label: "Frescura", emoji: "☀️", value: state.fresh, color: "#FFB300" },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-[max(env(safe-area-inset-top),10px)]">
      {/* una sola fila: racha · monedas · nivel · clima · campana */}
      <div className="pointer-events-auto relative flex items-center gap-1.5">
        <div className={cn(pill, "text-sol-dark")} title="Racha diaria">
          🔥 {state.streak}
        </div>
        <div className={cn(pill, "text-sol-dark")} title="Monedas">
          🪙 {state.coins}
        </div>

        <div className="relative">
          <Ring value={st.progress * 100} color="#4CAF50" size={38} stroke={3.5} label={`${st.stage.name}: nivel`}>
            <span className="text-lg">{st.stage.emoji}</span>
          </Ring>
          {session?.isDemo && (
            <button
              type="button"
              onClick={() => {
                playSound("tap");
                growStage();
              }}
              className="absolute -bottom-1 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#7E57C2] text-[10px] shadow ring-2 ring-white active:scale-90"
              aria-label="Crecer etapa (Modo Demo)"
              title="✨ Crecer (Modo Demo)"
            >
              ✨
            </button>
          )}
        </div>

        <div className="flex-1" />

        <div
          role="status"
          className={cn(
            pill,
            "text-sm transition-colors duration-1000",
            state.climate === "calor" ? "badge-pulse bg-alerta/90 text-white" : state.climate === "lluvia" ? "bg-slate-600/85 text-white" : "text-tinta"
          )}
          aria-label={`Clima en Culiacán: ${climate.label}, ${climate.temp} grados`}
        >
          {climate.emoji} {climate.temp}°C
          {shaded && <span className="ml-0.5 text-xs">☂️{Math.ceil((state.shadeUntil - now) / 1000)}s</span>}
        </div>

        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/70 text-tinta shadow-sm backdrop-blur-sm active:scale-90"
          aria-label={`Notificaciones y ajustes (${unread} sin leer)`}
        >
          <Bell size={18} className={cn(unread > 0 && "anim-wiggle")} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-alerta px-1 font-display text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {open && (
          <NotificationsPanel
            onClose={close}
            extra={
              <button
                type="button"
                onClick={() => {
                  setMuted(!muted);
                  if (muted) setTimeout(() => playSound("tap"), 30);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-100 py-2 font-display text-sm font-semibold text-stone-600"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} Sonido: {muted ? "apagado" : "encendido"}
              </button>
            }
          />
        )}
      </div>

      {/* 3 medidores circulares flotando */}
      <div className="mt-2.5 flex justify-center gap-4">
        {meters.map((m) => {
          const low = m.value < 30;
          return (
            <Ring key={m.label} value={m.value} color={low ? "#FF7043" : m.color} size={46} label={m.label} className={cn(low && "anim-wiggle")}>
              <span className="text-xl">{m.emoji}</span>
            </Ring>
          );
        })}
      </div>
    </div>
  );
}
