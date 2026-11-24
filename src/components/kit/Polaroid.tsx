import { cn } from "@/lib/utils";

/** Sello verde de "¡Verificado!" */
export function VerifiedStamp({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <div
      className={cn(
        "grid h-[66px] w-[66px] place-items-center rounded-full border-[3px] border-double border-hoja-dark bg-white/80 text-center font-display text-[8.5px] font-bold uppercase leading-none tracking-tight text-hoja-dark shadow-sm",
        animate ? "anim-stamp" : "-rotate-[14deg]",
        className
      )}
      aria-label="Verificado"
    >
      <div>
        <div className="text-lg leading-none">✔</div>
        ¡Verificado!
      </div>
    </div>
  );
}

interface Props {
  image: string;
  caption: React.ReactNode;
  sub?: React.ReactNode;
  tilt?: number;
  stamp?: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

/** Foto estilo Polaroid con cinta adhesiva */
export function Polaroid({ image, caption, sub, tilt = 0, stamp = false, className, onClick, children }: Props) {
  return (
    <div className={cn("relative bg-white p-2 pb-3 shadow-[0_6px_16px_rgba(62,44,35,.18)]", className)} style={{ transform: `rotate(${tilt}deg)` }}>
      <span className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 rotate-[-4deg] bg-sol/45 shadow-sm" aria-hidden />
      <button type="button" onClick={onClick} className="relative block w-full overflow-hidden bg-stone-100" disabled={!onClick}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="aspect-[4/3] w-full object-cover" />
        {stamp && <VerifiedStamp className="absolute -bottom-1 -right-1 scale-[0.85]" />}
        {children}
      </button>
      <div className="mt-2 px-0.5 font-display text-sm font-semibold leading-tight text-tinta">{caption}</div>
      {sub && <div className="mt-0.5 px-0.5 text-[13px] italic leading-snug text-stone-600">{sub}</div>}
    </div>
  );
}
