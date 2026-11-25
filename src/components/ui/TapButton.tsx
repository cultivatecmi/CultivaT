"use client";

import { cn } from "@/lib/utils";

type Tone = "hoja" | "cielo" | "sol" | "tierra" | "alerta" | "blanco";

const TONES: Record<Tone, string> = {
  // verde un poco más profundo que #22C55E para que el texto blanco se lea bien
  hoja: "bg-[#16A34A] border-hoja-dark text-white",
  cielo: "bg-cielo border-cielo-dark text-white",
  sol: "bg-sol border-sol-dark text-[#422006]",
  tierra: "bg-tierra border-tierra-dark text-white",
  alerta: "bg-alerta border-alerta-dark text-white",
  blanco: "bg-white border-stone-300 text-tinta",
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
}

/** Botón táctil con efecto 3D (border-b-4 → se hunde al presionar) */
export function TapButton({ tone = "hoja", size = "md", className, children, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "btn-3d inline-flex select-none items-center justify-center gap-2 rounded-2xl font-display font-semibold tracking-wide",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-base",
        size === "lg" && "px-5 py-3.5 text-lg",
        TONES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
