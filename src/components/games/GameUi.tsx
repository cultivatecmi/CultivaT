"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { TapButton } from "@/components/ui/TapButton";
import { playSound } from "@/lib/sound";
import { InlineCoin } from "@/components/ui/CoinText";
import { isTourActive } from "@/lib/tour";
import { cn } from "@/lib/utils";

/** Cuenta regresiva 3-2-1-¡Ya! que llama a onDone al terminar */
export function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (n === 0) {
      playSound("go");
      const t = setTimeout(() => doneRef.current(), isTourActive() ? 150 : 450);
      return () => clearTimeout(t);
    }
    playSound("beep");
    const t = setTimeout(() => setN(n - 1), isTourActive() ? 180 : 650);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/10">
      <span key={n} className="anim-count font-display text-8xl font-bold text-white [text-shadow:0_4px_0_rgba(0,0,0,.3)]">
        {n === 0 ? "¡Ya!" : n}
      </span>
    </div>
  );
}

interface IntroProps {
  emoji: string;
  title: string;
  color: string;
  children: React.ReactNode;
  best?: string | null;
  buttonTone: "cielo" | "hoja" | "sol" | "alerta";
  onStart: () => void;
  className?: string;
}

export function GameIntro({ emoji, title, color, children, best, buttonTone, onStart, className }: IntroProps) {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center gap-3 p-6 text-center", className)}>
      <div className="anim-card-float text-7xl drop-shadow-md">{emoji}</div>
      <h3 className="text-3xl font-bold" style={{ color }}>
        {title}
      </h3>
      <div className="max-w-[300px] text-[15px] leading-snug text-tinta">{children}</div>
      {best && <p className="rounded-full bg-white/80 px-3 py-1 font-display text-sm font-semibold text-tierra">🏆 Tu récord: {best}</p>}
      <TapButton tone={buttonTone} size="lg" onClick={onStart}>
        <Play size={20} /> ¡Jugar!
      </TapButton>
    </div>
  );
}

interface ResultProps {
  medal: string;
  title: string;
  stats?: { label: string; value: string }[];
  coins: number;
  /** felicidad que ganó la planta por jugar (+15 a +25 %) */
  happy?: number;
  /** XP ganada (se muestra si se pasa) */
  xp?: number;
  /** ya se llegó al tope diario de XP o monedas */
  dailyDone?: boolean;
  newBest: boolean;
  buttonTone: "cielo" | "hoja" | "sol" | "alerta";
  onRetry: () => void;
  onExit: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function GameResult({ medal, title, stats, coins, happy = 0, xp, dailyDone = false, newBest, buttonTone, onRetry, onExit, className, children }: ResultProps) {
  return (
    <div className={cn("flex min-h-full flex-col items-center justify-center gap-2.5 px-5 py-5 text-center", className)}>
      <div className="anim-pop text-6xl leading-none">{medal}</div>
      <h3 className="text-[28px] font-bold leading-tight text-tinta">{title}</h3>
      {newBest && <span className="anim-streak rounded-full bg-sol px-3 py-1 font-display text-sm font-bold text-white">⭐ ¡Nuevo récord!</span>}
      <div className="flex flex-wrap justify-center gap-2">
        {(stats ?? []).map((s) => (
          <div key={s.label} className="min-w-[78px] rounded-2xl bg-white/85 px-3 py-1.5 shadow-sm">
            <div className="font-display text-xl font-bold leading-tight">{s.value}</div>
            <div className="text-[11px] font-semibold text-stone-500">{s.label}</div>
          </div>
        ))}
      </div>
      {children}
      {dailyDone && (
        <p className="max-w-[300px] rounded-2xl border-2 border-[#22C55E]/40 bg-[#DCFCE7] px-3 py-2 text-sm font-semibold leading-snug text-[#15803D]">
          ¡Meta diaria completada! 🌱 Tu planta ya creció todo lo posible por hoy. Vuelve mañana para ganar más XP y monedas.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="rounded-2xl border-b-4 border-sol-dark bg-sol px-5 py-2 font-display text-xl font-semibold text-[#422006] shadow">+{coins} <InlineCoin /> ganadas</div>
        {xp !== undefined && xp > 0 && (
          <div className="rounded-2xl border-b-4 border-[#15803D] bg-[#22C55E] px-4 py-2 font-display text-xl font-semibold text-white shadow">+{xp} XP</div>
        )}
        {happy > 0 && (
          <div className="anim-pop rounded-2xl border-b-4 border-[#C2185B] bg-[#F06292] px-4 py-2 font-display text-xl font-semibold text-white shadow">
            +{happy}% 😊 Felicidad
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <TapButton tone="blanco" onClick={onExit}>
          Otros juegos
        </TapButton>
        <TapButton tone={buttonTone} onClick={onRetry}>
          <RotateCcw size={18} /> Otra vez
        </TapButton>
      </div>
    </div>
  );
}
