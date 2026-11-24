"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BellRing, Camera, LogOut, Moon, Trash2, UserPlus, Volume2, X } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { compressImage } from "@/lib/image";
import { isMuted, playSound, setMuted, subscribeMuted } from "@/lib/sound";
import { isDark, setDark, subscribeTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const AVATAR_EMOJIS = ["🧑‍🌾", "👧", "👦", "🐝", "🐞", "🌻", "🦉", "🐸", "🦋", "🌵"];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-hoja" : "bg-stone-300")}
    >
      <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} style={{ backgroundColor: "#fff" }} />
    </button>
  );
}

/** Avatar del perfil: foto o emoji */
export function ProfileAvatar({ avatar, emoji, size = 40, className }: { avatar: string | null; emoji: string; size?: number; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-hoja-light", className)} style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="Foto de perfil" className="h-full w-full object-cover" />
      ) : (
        emoji
      )}
    </span>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, session, updateProfile, setPlantName, logout, enableBrowserNotifications, pushToast } = useGameState();
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => false);
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const [name, setName] = useState(state.profile.displayName);
  const [plant, setPlant] = useState(state.plantName);
  const [perm, setPerm] = useState("default");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveNames = () => {
    if (name.trim() && name.trim() !== state.profile.displayName) updateProfile({ displayName: name.trim() });
    if (plant.trim() && plant.trim() !== state.plantName) setPlantName(plant);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      updateProfile({ avatar: await compressImage(f, 256, 0.75) });
      pushToast("📷 ¡Foto de perfil lista!", "success");
    } catch {
      pushToast("No pude abrir esa foto 😕", "warning");
    }
  };

  const close = () => {
    saveNames();
    onClose();
  };

  const row = "flex items-center gap-3 rounded-2xl bg-stone-100 px-3 py-2.5";

  // portal: el panel queda por encima de todo (HUD, botones y menú inferior)
  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[70] flex justify-center bg-black/45" onClick={close} role="dialog" aria-modal="true" aria-label="Configuración">
      <div
        className="anim-pop mt-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="text-xl font-semibold text-tinta">⚙️ Configuración</h3>
          <button type="button" onClick={close} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4 text-tinta">
          {/* PERFIL */}
          <section className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-stone-500">Mi perfil</h4>
            <div className="flex items-center gap-4">
              <div className="relative">
                <ProfileAvatar avatar={state.profile.avatar} emoji={state.profile.avatarEmoji} size={84} className="border-4 border-hoja/40" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-hoja text-white shadow"
                  aria-label="Cambiar foto de perfil"
                >
                  <Camera size={17} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-semibold">{state.profile.displayName}</p>
                <p className="text-sm text-stone-500">Apodo: @{session?.nickname}</p>
                {state.profile.avatar && (
                  <button type="button" onClick={() => updateProfile({ avatar: null })} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-alerta-dark">
                    <Trash2 size={12} /> Quitar foto
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm text-stone-600">O elige un personaje:</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => updateProfile({ avatarEmoji: e, avatar: null })}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-xl transition-transform active:scale-90",
                      !state.profile.avatar && state.profile.avatarEmoji === e && "ring-3 ring-hoja"
                    )}
                    aria-label={`Usar ${e} como avatar`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-stone-600">Mi nombre en el juego</span>
              <input
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveNames}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-2.5 font-display text-lg outline-none focus:border-hoja"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-stone-600">Nombre de mi planta 🌱</span>
              <input
                value={plant}
                maxLength={14}
                onChange={(e) => setPlant(e.target.value)}
                onBlur={saveNames}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-2.5 font-display text-lg outline-none focus:border-hoja"
              />
            </label>
            <p className="text-xs text-stone-500">🔒 Usa un apodo, no tu nombre completo. Para la foto puedes usar un dibujo o tu planta.</p>
          </section>

          {/* PREFERENCIAS */}
          <section className="space-y-2">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-stone-500">Preferencias</h4>
            <div className={row}>
              <Moon size={20} />
              <span className="flex-1 font-display font-medium">Modo oscuro</span>
              <Toggle on={dark} onChange={(v) => setDark(v)} label="Modo oscuro" />
            </div>
            <div className={row}>
              <Volume2 size={20} />
              <span className="flex-1 font-display font-medium">Sonidos</span>
              <Toggle
                on={!muted}
                onChange={(v) => {
                  setMuted(!v);
                  if (v) setTimeout(() => playSound("tap"), 30);
                }}
                label="Sonidos"
              />
            </div>
            {perm === "default" && (
              <button
                type="button"
                onClick={async () => setPerm((await enableBrowserNotifications()) ? "granted" : "denied")}
                className={cn(row, "w-full text-left")}
              >
                <BellRing size={20} />
                <span className="flex-1 font-display font-medium">Activar recordatorios</span>
                <span className="text-xs text-stone-500">Tocar</span>
              </button>
            )}
          </section>

          {/* CUENTA */}
          <section className="space-y-2 pb-2">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-stone-500">Cuenta</h4>
            <button type="button" onClick={() => { saveNames(); logout(); }} className={cn(row, "w-full text-left")}>
              <UserPlus size={20} />
              <span className="flex-1 font-display font-medium">Cambiar o añadir perfil</span>
            </button>
            <button
              type="button"
              onClick={() => {
                saveNames();
                logout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-alerta-light py-3 font-display font-semibold text-alerta-dark"
            >
              <LogOut size={18} /> {session?.isDemo ? "Salir del Modo Demo" : "Cerrar sesión"}
            </button>
            <p className="pt-1 text-center text-xs text-stone-400">CultivaT · Sin correos ni teléfonos · Tu progreso se guarda al instante</p>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
