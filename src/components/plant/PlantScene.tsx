"use client";

import type { Equipped, Mood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BackgroundScene } from "./BackgroundScene";
import { PlantCharacter, type Reaction } from "./PlantCharacter";

export type SceneEffect = { type: "water" | "shade" | "fertilize" | "love"; key: number } | null;

interface Props {
  mood: Mood;
  stage: number;
  equipped: Equipped;
  heat?: boolean;
  reaction?: Reaction;
  bounceKey?: number;
  bubble?: string | null;
  effect?: SceneEffect;
  onTap?: () => void;
  className?: string;
  /** ancho de la planta (para que no se salga de tarjetas bajas) */
  plantWidth?: string;
  children?: React.ReactNode;
}

const POSTURE: Record<Mood, string> = {
  feliz: "anim-bob",
  hambrienta: "anim-bob",
  sedienta: "anim-droop",
  acalorada: "anim-shake",
  marchita: "anim-wilt",
};

export function PlantScene({
  mood, stage, equipped, heat = false, reaction = null, bounceKey = 0, bubble, effect, onTap, className, plantWidth = "min(68%, 250px)", children,
}: Props) {
  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border-4 border-white shadow-lg shadow-stone-300/60", className)}>
      <BackgroundScene id={equipped.background} heat={heat} className="absolute inset-0 h-full w-full" />

      {heat && <div className="anim-sun pointer-events-none absolute right-4 top-3 text-5xl">☀️</div>}

      <button
        type="button"
        onClick={onTap}
        aria-label="Tocar a la planta"
        className="absolute inset-x-0 bottom-1 mx-auto block cursor-pointer focus:outline-none"
        style={{ width: plantWidth }}
      >
        <div className={reaction ? "" : POSTURE[mood]}>
          <div key={bounceKey} className={bounceKey ? "anim-bounce" : ""}>
            <PlantCharacter mood={mood} stage={stage} pot={equipped.pot} accessory={equipped.accessory} reaction={reaction} className="w-full drop-shadow-md" />
          </div>
        </div>
      </button>

      {bubble && (
        <div key={bubble} className="anim-pop pointer-events-none absolute left-1/2 top-4 z-10 max-w-[78%] -translate-x-1/2">
          <div className="relative rounded-2xl border-2 border-stone-200 bg-white px-4 py-2 text-center font-display text-[15px] font-medium leading-snug text-tinta shadow-md">
            {bubble}
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-stone-200 bg-white" />
          </div>
        </div>
      )}

      {effect && <Effects key={effect.key} type={effect.type} />}
      {children}
    </div>
  );
}

const PARTICLES = [12, 28, 44, 58, 72, 86, 36, 64];

function Effects({ type }: { type: NonNullable<SceneEffect>["type"] }) {
  if (type === "shade") {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
        <div className="anim-cloud text-7xl drop-shadow">☁️</div>
      </div>
    );
  }
  const emoji = type === "water" ? "💧" : type === "fertilize" ? ["✨", "🌱", "🍂"] : ["💚", "💛"];
  return (
    <div className="pointer-events-none absolute inset-0">
      {PARTICLES.map((left, i) => (
        <span
          key={i}
          className={cn("absolute text-2xl", type === "water" ? "anim-fall top-0" : "anim-rise bottom-16")}
          style={{ left: `${left}%`, animationDelay: `${(i % 4) * 0.12}s` }}
        >
          {Array.isArray(emoji) ? emoji[i % emoji.length] : emoji}
        </span>
      ))}
    </div>
  );
}
