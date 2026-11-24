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

function Meter({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
  const v = Math.round(value);
  const low = v < 30;
  return (
    <div
      className={cn("flex items-center gap-1 rounded-2xl border-2 bg-white/90 px-1.5 py-1 shadow-sm", low ? "border-alerta" : "border-white")}
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`${label}: ${v}%`}
    >
      <span className={cn("text-lg leading-none", low && "anim-wiggle")}>{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[10px] font-semibold leading-tight text-stone-600">{label}</div>
        <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-stone-200">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", low && "animate-pulse")}
            style={{ width: `${Math.max(5, v)}%`, background: low ? "#FF7043" : color }}
          />
        </div>
      </div>
    </div>
  );
}

export interface HudHint {
  text: string;
  alert?: boolean;
}

export function HomeHud({ hint }: { hint?: HudHint | null }) {
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

  const chip = "flex items-center gap-1 rounded-full border-2 border-white bg-white/90 px-2.5 py-1 font-display font-semibold shadow-sm";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-[max(env(safe-area-inset-top),10px)]">
      {/* fila 1: racha, monedas, nivel, sonido, campana */}
      <div className="pointer-events-auto relative flex items-center gap-1.5">
        <div className={cn(chip, "text-sol-dark")} title="Racha diaria">
          <span className={cn(state.streak > 0 && "anim-float")}>🔥</span>
          {state.streak}
        </div>
        <div className={cn(chip, "text-sol-dark")} title="Monedas">
          🪙 {state.coins}
        </div>
        <div className={cn(chip, "min-w-0 flex-1 gap-1.5 text-tinta")} title={`${st.stage.name}: ${st.xpInto}/${st.xpNeeded} XP`}>
          <span>{st.stage.emoji}</span>
          <div className="h-2 min-w-6 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-gradient-to-r from-hoja to-[#8BC34A] transition-[width] duration-700" style={{ width: `${Math.max(4, st.progress * 100)}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMuted(!muted);
            if (muted) setTimeout(() => playSound("tap"), 30);
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white bg-white/90 text-tinta shadow-sm active:scale-90"
          aria-label={muted ? "Activar sonido" : "Silenciar"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white bg-white/90 text-tinta shadow-sm active:scale-90"
          aria-label={`Notificaciones (${unread} sin leer)`}
        >
          <Bell size={18} className={cn(unread > 0 && "anim-wiggle")} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-alerta px-1 font-display text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {open && <NotificationsPanel onClose={close} />}
      </div>

      {/* fila 2: medidores */}
      <div className="pointer-events-auto mt-2 grid grid-cols-4 gap-1.5">
        <Meter emoji="💧" label="Agua" value={state.water} color="#29B6F6" />
        <Meter emoji="🌱" label="Nutrientes" value={state.nutrients} color="#4CAF50" />
        <Meter emoji="☀️" label="Frescura" value={state.fresh} color="#FFB300" />
        <Meter emoji="😊" label="Felicidad" value={state.happy} color="#F06292" />
      </div>

      {/* fila 3: monitor del clima (cambia solo) */}
      <div className="mt-2 flex items-center gap-2">
        <div
          role="status"
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1 font-display text-sm font-semibold shadow-md transition-colors duration-1000",
            state.climate === "calor"
              ? "badge-pulse border-alerta-dark bg-alerta text-white"
              : state.climate === "lluvia"
                ? "border-slate-500 bg-slate-600 text-white"
                : "border-white bg-white/90 text-tinta"
          )}
          aria-label={`Clima en Culiacán: ${climate.label}, ${climate.temp} grados`}
        >
          🌡️ {climate.temp}°C Culiacán <span>{climate.emoji}</span>
        </div>
        {shaded && (
          <span className="shrink-0 rounded-full bg-cielo px-2.5 py-1 font-display text-xs font-semibold text-white shadow">
            ☂️ {Math.ceil((state.shadeUntil - now) / 1000)} s
          </span>
        )}
        {hint && !shaded && (
          <span
            key={hint.text}
            className={cn(
              "anim-pop min-w-0 truncate rounded-full px-2.5 py-1 font-display text-xs font-semibold shadow",
              hint.alert ? "bg-alerta text-white" : "bg-white/90 text-tinta"
            )}
          >
            {hint.text}
          </span>
        )}
        {session?.isDemo && (
          <button
            type="button"
            onClick={() => {
              playSound("tap");
              growStage();
            }}
            className="pointer-events-auto ml-auto shrink-0 rounded-full border-2 border-white/80 bg-[#7E57C2]/85 px-2.5 py-1 font-display text-xs font-semibold text-white shadow-md active:scale-95"
            title="Solo en Modo Demo: avanza a la siguiente etapa de crecimiento"
          >
            ✨ Crecer Etapa
          </button>
        )}
      </div>
    </div>
  );
}
