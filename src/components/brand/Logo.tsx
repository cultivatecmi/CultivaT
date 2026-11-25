/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Logo oficial de CultivaT (public/logo.svg): maceta con brote + "Cultiva" verde y "T" dorada. */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <img
      src={`${BASE}/logo.svg`}
      alt="CultivaT"
      width={901}
      height={286}
      draggable={false}
      fetchPriority={priority ? "high" : undefined}
      className={cn("h-auto select-none", className)}
    />
  );
}
