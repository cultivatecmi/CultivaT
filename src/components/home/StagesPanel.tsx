"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { PlantCharacter } from "@/components/plant/PlantCharacter";
import { STAGES, getStage } from "@/lib/stages";
import { cn } from "@/lib/utils";

const DESCRIPTIONS = [
  "Una semillita que apenas despierta en la tierra.",
  "Sale el tallito con sus primeras 4 hojas.",
  "Más alta y frondosa, con un botón floral cerradito.",
  "¡Tamaño máximo coronada con un girasol!",
];

/** Cómo ganar XP para crecer */
const XP_TIPS = ["💧 Regar, abonar y dar sombra", "📸 Foto semanal de tu kit (+30 XP)", "🎮 Jugar en la Sala de Juegos", "🐛 Atrapar pulgones"];

export function StagesPanel({ onClose }: { onClose: () => void }) {
  const { state } = useGameState();
  const st = getStage(state.xp);
  const pct = Math.round(st.progress * 100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-center bg-black/45" onClick={onClose} role="dialog" aria-modal="true" aria-label="Etapas de crecimiento">
      <div className="anim-pop mt-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="text-xl font-semibold text-tinta">🌱 Crecimiento de {state.plantName}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 text-tinta">
          {/* progreso actual */}
          <section className="rounded-3xl bg-gradient-to-br from-hoja to-hoja-dark p-4 text-white shadow-md">
            <p className="text-sm font-semibold text-white/85">Etapa actual</p>
            <p className="font-display text-2xl font-bold">
              {st.stage.emoji} {st.stage.name}
            </p>
            <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de la etapa">
              <div className="h-full rounded-full bg-sol transition-[width] duration-700" style={{ width: `${Math.max(4, pct)}%` }} />
            </div>
            <p className="mt-1.5 flex justify-between font-display text-sm font-semibold">
              {st.next ? (
                <>
                  <span>
                    {st.xpInto} / {st.xpNeeded} XP ({pct}%)
                  </span>
                  <span>
                    Faltan {st.xpNeeded - st.xpInto} XP para {st.next.emoji}
                  </span>
                </>
              ) : (
                <span>¡Llegó a la etapa máxima! 🏆 ({state.xp} XP)</span>
              )}
            </p>
          </section>

          {/* las 4 etapas */}
          <section>
            <h4 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-stone-500">Etapas de la planta</h4>
            <ol className="space-y-2.5">
              {STAGES.map((s, i) => {
                const done = i < st.index;
                const current = i === st.index;
                const locked = i > st.index;
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 p-2.5",
                      current ? "border-hoja bg-hoja-light" : done ? "border-stone-200 bg-white" : "border-dashed border-stone-200 bg-stone-50"
                    )}
                  >
                    <div className={cn("relative h-[84px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-[#B3E5FC] to-[#E8F5E9]", locked && "grayscale")}>
                      <PlantCharacter
                        mood="feliz"
                        stage={i}
                        pot={state.equipped.pot}
                        accessory={null}
                        className={cn("h-full w-full", locked && "opacity-45")}
                      />
                      {locked && <span className="absolute inset-0 grid place-items-center text-2xl">🔒</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold leading-tight">
                        {i + 1}. {s.emoji} {s.name}
                      </p>
                      <p className="text-[13px] leading-snug text-stone-600">{DESCRIPTIONS[i]}</p>
                      <p className={cn("mt-1 font-display text-xs font-bold", current ? "text-hoja-dark" : done ? "text-hoja-dark" : "text-stone-400")}>
                        {current ? "⭐ Aquí está tu planta" : done ? "✅ Superada" : `🔒 Desde ${s.minXp} XP`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-2xl bg-sol-light p-3 pb-4">
            <p className="font-display font-semibold">¿Cómo gano XP para crecer?</p>
            <ul className="mt-1 space-y-0.5 text-sm text-stone-700">
              {XP_TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
