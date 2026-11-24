"use client";

import { useState } from "react";
import { Cloud, Lock, Play, Smartphone } from "lucide-react";
import { useGame } from "@/components/GameProvider";
import { PlantScene } from "@/components/plant/PlantScene";
import { TapButton } from "@/components/ui/TapButton";

export function Welcome() {
  const { login, startDemo, cloudEnabled } = useGame();
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bounce, setBounce] = useState(0);

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
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-hoja">
          Cultiva<span className="text-sol">T</span>
        </h1>
        <p className="mt-1 font-display text-lg text-tierra">Cuida tu planta, cultiva tu futuro 🌱</p>
      </div>

      <PlantScene
        className="mt-5 h-[250px]"
        plantWidth="min(62%, 215px)"
        mood="feliz"
        stage={2}
        equipped={{ pot: "pot-barro", accessory: "acc-sombrero", background: "bg-valle" }}
        bounceKey={bounce}
        onTap={() => setBounce((b) => b + 1)}
      />

      <form onSubmit={submit} className="mt-6 space-y-3 rounded-3xl border-2 border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">¡Entra a tu jardín!</h2>
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
