"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { LADYBUG_MS, LADYBUG_PRICE } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { InlineCoin } from "@/components/ui/CoinText";
import { TapButton } from "@/components/ui/TapButton";
import { cn } from "@/lib/utils";
import { useTourEvent } from "@/components/tour/useTourEvent";
import { LadybugSvg, formatLeft, useLadybugLeft } from "./Ladybug";

const SIZE = 46;
const STROKE = 3.5;

/**
 * Botón circular de la Catarina Guardiana (debajo del medidor de Agua).
 * Inactiva: catarina + costo, y pulsa si hay pulgones. Activa: anillo verde con cuenta regresiva.
 */
export function LadybugButton({ aphidAlert }: { aphidAlert: boolean }) {
  const { state, buyLadybug } = useGameState();
  const left = useLadybugLeft(state.ladybugUntil ?? 0);
  const active = left > 0;
  const [open, setOpen] = useState(false);
  useTourEvent("ladybugOpen", () => setOpen(true));
  useTourEvent("ladybugConfirm", () => {
    if (buyLadybug()) setOpen(false);
  });

  const r = (SIZE - STROKE) / 2;
  const len = 2 * Math.PI * r;
  const progress = active ? (left * 1000) / LADYBUG_MS : 0;

  return (
    <>
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => {
            playSound("tap");
            if (!active) setOpen(true);
          }}
          className={cn(
            "hud-card relative grid shrink-0 place-items-center rounded-full bg-white/85 shadow-sm backdrop-blur-sm active:scale-90",
            !active && aphidAlert && "ladybug-call"
          )}
          style={{ width: SIZE, height: SIZE }}
          aria-label={active ? `Catarina Guardiana activa: ${formatLeft(left)}` : `Catarina Guardiana: activar por ${LADYBUG_PRICE} monedas`}
        >
          <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={active ? "rgba(34,197,94,.25)" : "rgba(229,57,53,.35)"} strokeWidth={STROKE} />
            {active && (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                fill="none"
                stroke="#22C55E"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            )}
          </svg>
          <LadybugSvg className={cn("relative h-[30px] w-[30px]", active && "anim-float")} />
        </button>
        <span
          className={cn(
            "hud-card mt-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 font-display text-[11px] font-bold leading-tight shadow-sm",
            active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FFEBEE] text-[#C62828]"
          )}
        >
          {active ? (
            formatLeft(left)
          ) : (
            <>
              {LADYBUG_PRICE} <InlineCoin />
            </>
          )}
        </span>
      </div>

      {open &&
        createPortal(
          <div
            className="pointer-events-auto fixed inset-0 z-[70] grid place-items-center bg-black/45 px-6"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Catarina Guardiana"
          >
            <div className="anim-pop relative w-full max-w-[340px] rounded-3xl bg-[#FFFBEB] p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-stone-500 shadow-sm active:scale-90"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#FFEBEE]">
                <LadybugSvg className="anim-float h-14 w-14" />
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-[#3E2C23]">🐞 Catarina Guardiana (3 min)</h3>
              <p className="mt-2 text-[15px] leading-snug text-[#5D4037]">
                Cuida tu planta 3 minutos y se come a los pulgones por ti.
              </p>
              <TapButton
                tone="hoja"
                size="lg"
                className="mt-4 w-full"
                onClick={() => {
                  if (buyLadybug()) setOpen(false);
                }}
              >
                Activar por {LADYBUG_PRICE} <InlineCoin />
              </TapButton>
              <button type="button" onClick={() => setOpen(false)} className="mt-2 px-4 py-2 font-display text-sm font-medium text-stone-500">
                Ahora no
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
