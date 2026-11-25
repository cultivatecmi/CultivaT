"use client";

import { useState } from "react";
import { Bell, Cloud, CloudOff, Loader2, Smartphone, Clapperboard, Settings } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { CoinIcon } from "@/components/ui/GameIcons";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ShareStreakPanel } from "@/components/share/ShareStreakPanel";
import { getStage } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "./NotificationsPanel";
import { Logo } from "@/components/brand/Logo";

export function Header() {
  const { state, syncStatus, markAllRead } = useGameState();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [share, setShare] = useState(false);
  const close = () => {
    setOpen(false);
    markAllRead();
  };
  const st = getStage(state.xp);
  const unread = state.notifications.filter((n) => !n.read).length;

  const sync = {
    demo: { icon: <Clapperboard size={16} />, label: "Demo", cls: "text-sol-dark" },
    local: { icon: <Smartphone size={16} />, label: "Local", cls: "text-stone-500" },
    saving: { icon: <Loader2 size={16} className="animate-spin" />, label: "Guardando", cls: "text-cielo-dark" },
    saved: { icon: <Cloud size={16} />, label: "Nube", cls: "text-cielo-dark" },
    error: { icon: <CloudOff size={16} />, label: "Sin nube", cls: "text-alerta-dark" },
  }[syncStatus];

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-crema px-4 pb-2.5 pt-3">
      {/* fila 1: logo oficial · guardado · campana · configuración */}
      <div className="flex items-center gap-2">
        <Logo variant="wordmark" className="h-9 w-auto" />
        <div className="flex-1" />
        <span className={cn("flex items-center gap-1 text-xs font-bold", sync.cls)} title="Estado de guardado">
          {sync.icon}
          <span className="hidden min-[380px]:inline">{sync.label}</span>
        </span>
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          className="relative grid h-10 w-10 place-items-center rounded-full border-2 border-stone-200 bg-white text-tinta active:scale-95"
          aria-label={`Notificaciones (${unread} sin leer)`}
        >
          <Bell size={20} className={cn(unread > 0 && "anim-wiggle")} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-alerta px-1 font-display text-[11px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSettings(true)}
          className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-stone-200 bg-white text-tinta active:scale-95"
          aria-label="Configuración y perfil"
        >
          {state.profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.profile.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <Settings size={20} />
          )}
        </button>
      </div>

      {/* fila 2: racha · monedas · nivel */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShare(true)}
          className="flex shrink-0 items-center gap-1 rounded-full border-2 border-sol/40 bg-sol-light px-2.5 py-0.5 font-display text-[15px] font-semibold text-sol-dark active:scale-95"
          title="Compartir mi racha"
          aria-label={`Racha de ${state.streak} días: toca para compartir`}
        >
          <span className={cn(state.streak > 0 && "anim-float")}>🔥</span>
          {state.streak}
        </button>
        <div className="flex shrink-0 items-center gap-1 rounded-full border-2 border-sol/40 bg-sol-light px-2.5 py-0.5 font-display text-[15px] font-semibold text-sol-dark" title="Monedas">
          <CoinIcon size={18} /> {state.coins}
        </div>
        <span className="shrink-0 text-base" title={st.stage.name} aria-hidden="true">
          {st.stage.emoji}
        </span>
        <div
          className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200"
          role="progressbar"
          aria-label={`Experiencia: ${st.stage.name}`}
          aria-valuenow={Math.round(st.progress * 100)}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-hoja-dark to-hoja transition-[width] duration-700" style={{ width: `${Math.max(3, st.progress * 100)}%` }} />
        </div>
        <span className="shrink-0 font-display text-xs font-medium whitespace-nowrap text-stone-500">
          {st.next ? `${st.xpInto}/${st.xpNeeded} XP` : "¡Máximo! 🏆"}
        </span>
      </div>

      {open && <NotificationsPanel onClose={close} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
      {share && <ShareStreakPanel onClose={() => setShare(false)} />}
    </header>
  );
}
