"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, Lock, Play, Smartphone } from "lucide-react";
import { useGame } from "@/components/GameProvider";
import { ProfileAvatar } from "@/components/settings/SettingsPanel";
import { listLocalProfiles, type SavedProfile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { TapButton } from "@/components/ui/TapButton";
import { Logo } from "@/components/brand/Logo";

export function Welcome() {
  const { login, startDemo, cloudEnabled } = useGame();
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedProfile[]>([]);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaved(listLocalProfiles());
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(nickname, pin);
    setLoading(false);
    if (!res.ok) setError(res.error ?? "Algo salió mal");
  };

  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-8">
      <h1 className="flex justify-center pt-4">
        <Logo priority className="h-auto w-[min(64%,230px)]" />
      </h1>

      <form onSubmit={submit} className="mt-8 space-y-3 rounded-3xl border-2 border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">¡Entra a tu jardín!</h2>
        {saved.length > 0 && (
          <div>
            <p className="mb-1.5 font-display text-sm font-medium text-stone-600">Perfiles en este dispositivo</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {saved.map((p) => (
                <button
                  key={p.nickname}
                  type="button"
                  onClick={() => {
                    setNickname(p.nickname);
                    setPin("");
                    setError(null);
                    pinRef.current?.focus();
                  }}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-2.5 py-2",
                    nickname.trim().toLowerCase() === p.nickname.toLowerCase() ? "border-hoja bg-hoja-light" : "border-stone-200 bg-white"
                  )}
                >
                  <ProfileAvatar avatar={p.avatar} emoji={p.avatarEmoji} size={44} />
                  <span className="max-w-[72px] truncate font-display text-xs font-semibold">{p.displayName}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-stone-500">Toca tu perfil y escribe tu PIN, o crea uno nuevo abajo.</p>
          </div>
        )}
        <label className="block">
          <span className="mb-1 block font-display text-sm font-medium text-stone-600">Tu apodo</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Ej. ElotitoVerde"
            className="w-full rounded-2xl border-2 border-stone-200 bg-crema px-4 py-3 font-display text-lg outline-none focus:border-hoja"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1 font-display text-sm font-medium text-stone-600">
            <Lock size={14} /> PIN secreto de 4 números
          </span>
          <input
            ref={pinRef}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            pattern="\d{4}"
            type="password"
            autoComplete="off"
            placeholder="••••"
            className="w-full rounded-2xl border-2 border-stone-200 bg-crema px-4 py-3 text-center font-display text-2xl tracking-[0.6em] outline-none focus:border-hoja"
          />
        </label>

        {error && <p className="rounded-xl bg-alerta-light px-3 py-2 text-sm font-semibold text-alerta-dark">{error}</p>}

        <TapButton type="submit" size="lg" className="w-full" disabled={loading || nickname.trim().length < 2 || pin.length !== 4}>
          {loading ? "Entrando..." : "Entrar / Crear cuenta 🌱"}
        </TapButton>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-stone-500">
          {cloudEnabled ? <Cloud size={14} /> : <Smartphone size={14} />}
          {cloudEnabled ? "Tu progreso se guarda en la nube." : "Tu progreso se guarda en este dispositivo."}
          {" "}Sin correos ni teléfonos.
        </p>
      </form>

      <div className="mt-auto pt-6 text-center">
        <button
          type="button"
          onClick={startDemo}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-sm font-medium text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
        >
          <Play size={14} /> Modo Demo Presentación
        </button>
      </div>
    </div>
  );
}
