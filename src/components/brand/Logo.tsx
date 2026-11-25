/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const FILES = {
  // logo oficial completo: brote con flores + "CultivaT" + "Agrotech & Educación · Sinaloa"
  full: { src: "logo.png", w: 900, h: 795 },
  // solo la palabra "CultivaT" (con el brote de la T), recortada del logo oficial para cabeceras
  wordmark: { src: "logo-wordmark.png", w: 694, h: 240 },
} as const;

/** Logo oficial de CultivaT (archivos en /public, generados con scripts/brand-assets.cjs). */
export function Logo({
  variant = "full",
  className,
  priority,
}: {
  variant?: keyof typeof FILES;
  className?: string;
  priority?: boolean;
}) {
  const f = FILES[variant];
  return (
    <img
      src={`${BASE}/${f.src}`}
      alt="CultivaT"
      width={f.w}
      height={f.h}
      draggable={false}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={cn("select-none", className)}
    />
  );
}
