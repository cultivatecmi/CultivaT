"use client";

import { useGame } from "@/components/GameProvider";
import { cn } from "@/lib/utils";

const TONE = {
  success: "bg-hoja text-white border-hoja-dark",
  info: "bg-white text-tinta border-stone-200",
  warning: "bg-alerta text-white border-alerta-dark",
  coins: "bg-sol text-white border-sol-dark",
};

export function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="pointer-events-none fixed left-1/2 top-36 z-[60] flex w-full max-w-[430px] -translate-x-1/2 flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn("anim-toast rounded-2xl border-b-4 px-4 py-2 text-center font-display text-[15px] font-semibold shadow-lg", TONE[t.tone])}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
