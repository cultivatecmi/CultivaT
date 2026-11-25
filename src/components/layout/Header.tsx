"use client";

import { useState } from "react";
import { Bell, Cloud, CloudOff, Loader2, Smartphone, Clapperboard, Settings } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { CoinIcon } from "@/components/ui/GameIcons";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getStage } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "./NotificationsPanel";

export function Header() {
  const { state, syncStatus, markAllRead } = useGameState();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border-2 border-sol/40 bg-sol-light px-3 py-1 font-display text-base font-semibold text-sol-dark" title="Racha diaria">
          <span className={cn(state.streak > 0 && "anim-float")}>🔥</span>
          {state.streak}
          <span className="text-xs font-medium">{state.streak === 1 ? "día" : "días"}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border-2 border-sol/40 bg-sol-light px-3 py-1 font-display text-base font-semibold text-sol-dark" title="Monedas">
          <CoinIcon size={20} /> {state.coins}
        </div>
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

      <div className="mt-2 flex items-center gap-2">
        <span className="font-display text-sm font-semibold whitespace-nowrap">
          {st.stage.emoji} {st.stage.name}
        </span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label="Experiencia" aria-valuenow={Math.round(st.progress * 100)}>
          <div className="h-full rounded-full bg-gradient-to-r from-hoja to-[#8BC34A] transition-[width] duration-700" style={{ width: `${Math.max(3, st.progress * 100)}%` }} />
        </div>
        <span className="font-display text-xs font-medium text-stone-500 whitespace-nowrap">
          {st.next ? `${st.xpInto}/${st.xpNeeded} XP → ${st.next.emoji}` : "¡Nivel máximo! 🏆"}
        </span>
      </div>

      {open && <NotificationsPanel onClose={close} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
    </header>
  );
}
