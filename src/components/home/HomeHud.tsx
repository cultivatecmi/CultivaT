"use client";

import { useState } from "react";
import { Bell, Settings } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { CoinIcon } from "@/components/ui/GameIcons";
import { NotificationsPanel } from "@/components/layout/NotificationsPanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { StagesPanel } from "./StagesPanel";
import { ShareStreakPanel } from "@/components/share/ShareStreakPanel";
import { isShaded } from "@/lib/game";
import { getStage } from "@/lib/stages";
import { playSound } from "@/lib/sound";
import { CLIMATES } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

/** anillo de progreso circular (nivel / etapa) */
function Ring({ value, color, size, stroke = 4, children, label }: { value: number; color: string; size: number; stroke?: number; children: React.ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(255,255,255,.7)" stroke="rgba(255,255,255,.7)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - v / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <span className="relative leading-none">{children}</span>
    </div>
  );
}

/** medidor con etiqueta y barra (como estaba antes) */
function Meter({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
  const v = Math.round(value);
  const low = v < 30;
  return (
    <div
      className={cn("hud-card flex items-center gap-1 rounded-2xl border-2 bg-white/90 px-1.5 py-1 shadow-sm", low ? "border-alerta" : "border-white")}
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
        <div className="mt-0.5 flex items-center gap-1">
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div className={cn("h-full rounded-full transition-[width] duration-500", low && "animate-pulse")} style={{ width: `${Math.max(5, v)}%`, background: low ? "#FF7043" : color }} />
          </div>
          <span className={cn("shrink-0 font-display text-[9px] font-bold leading-none", low ? "text-alerta-dark" : "text-stone-500")}>{v}%</span>
        </div>
      </div>
    </div>
  );
}

export function HomeHud() {
  const { state, now, markAllRead, session, growStage } = useGameState();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [stages, setStages] = useState(false);
  const [share, setShare] = useState(false);
  const st = getStage(state.xp);
  const unread = state.notifications.filter((n) => !n.read).length;
  const climate = CLIMATES[state.climate];
  const shaded = isShaded(state, now);

  const close = () => {
    setOpen(false);
    markAllRead();
  };

  const pill = "hud-card flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/80 px-2.5 font-display text-[15px] font-semibold shadow-sm backdrop-blur-sm";
  const roundBtn = "hud-card relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 text-tinta shadow-sm backdrop-blur-sm active:scale-90";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-[max(env(safe-area-inset-top),10px)]">
      {/* fila 1: racha · monedas · nivel · clima · campana · configuración */}
      <div className="pointer-events-auto relative flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            playSound("tap");
            setShare(true);
          }}
          className={cn(pill, "text-sol-dark active:scale-95")}
          title="Compartir mi racha"
          aria-label={`Racha de ${state.streak} días: toca para compartir`}
        >
          🔥 {state.streak}
        </button>
        <div className={cn(pill, "text-sol-dark")} title="Monedas">
          <CoinIcon size={20} /> {state.coins}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              playSound("tap");
              setStages(true);
            }}
            className="block rounded-full active:scale-90"
            aria-label={`Ver etapas: ${st.stage.name}, ${Math.round(st.progress * 100)}%`}
            title="Ver progreso y etapas"
          >
            <Ring value={st.progress * 100} color="#22C55E" size={36} stroke={3.5} label={`${st.stage.name}: nivel`}>
              <span className="text-base">{st.stage.emoji}</span>
            </Ring>
          </button>
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
            state.climate === "calor" ? "badge-pulse !bg-alerta/90 text-white" : state.climate === "lluvia" ? "!bg-slate-600/85 text-white" : "text-tinta"
          )}
          aria-label={`Clima en Culiacán: ${climate.label}, ${climate.temp} grados`}
        >
          {climate.emoji} {climate.temp}°C
          {shaded && <span className="ml-0.5 text-xs">☂️{Math.ceil((state.shadeUntil - now) / 1000)}s</span>}
        </div>

        <button type="button" onClick={() => (open ? close() : setOpen(true))} className={roundBtn} aria-label={`Notificaciones (${unread} sin leer)`}>
          <Bell size={18} className={cn(unread > 0 && "anim-wiggle")} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-alerta px-1 font-display text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <button type="button" onClick={() => setSettings(true)} className={roundBtn} aria-label="Configuración y perfil">
          {state.profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.profile.avatar} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <Settings size={18} />
          )}
        </button>
        {open && <NotificationsPanel onClose={close} />}
      </div>

      {/* fila 2: los 4 medidores */}
      <div className="pointer-events-auto mt-2 grid grid-cols-4 gap-1.5">
        <Meter emoji="💧" label="Agua" value={state.water} color="#29B6F6" />
        <Meter emoji="🌱" label="Nutrientes" value={state.nutrients} color="#22C55E" />
        <Meter emoji="☀️" label="Frescura" value={state.fresh} color="#F59E0B" />
        <Meter emoji="😊" label="Felicidad" value={state.happy} color="#F06292" />
      </div>

      {/* logo compacto, sin bloquear toques sobre la escena */}
      <div className="pointer-events-none mt-1.5 flex justify-center">
        <span className="hud-card rounded-full bg-[#FFFBEB]/85 px-3 py-1 shadow-sm backdrop-blur-sm">
          <Logo variant="wordmark" className="block h-6 w-auto" />
        </span>
      </div>

      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
      {stages && <StagesPanel onClose={() => setStages(false)} />}
      {share && <ShareStreakPanel onClose={() => setShare(false)} />}
    </div>
  );
}
