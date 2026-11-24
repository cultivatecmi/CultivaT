import { cn } from "@/lib/utils";

interface Props {
  emoji: string;
  label: string;
  value: number;
  color: string;
  hint?: string;
}

export function StatBar({ emoji, label, value, color, hint }: Props) {
  const v = Math.round(value);
  const low = v < 30;
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-xl shadow-sm", low && "anim-wiggle")}>
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-display text-[15px] font-semibold">{label}</span>
          <span className={cn("font-display text-sm font-semibold", low ? "text-alerta-dark" : "text-stone-500")}>
            {hint ? `${hint} · ` : ""}
            {v}%
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-stone-200 p-[3px]" role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out", low && "animate-pulse")}
            style={{ width: `${Math.max(4, v)}%`, background: low ? "#FF7043" : color }}
          />
        </div>
      </div>
    </div>
  );
}
