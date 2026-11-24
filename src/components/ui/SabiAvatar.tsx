import { cn } from "@/lib/utils";

/**
 * Sabi: girasol sonriente con gafas de explorador.
 * Parpadea siempre; con `talking` gira los pétalos, mueve la boca y rebota.
 */
export function SabiAvatar({ className, talking = false }: { className?: string; talking?: boolean }) {
  return (
    <svg viewBox="0 0 100 110" className={cn(className, talking && "anim-bob")} aria-hidden style={{ overflow: "visible" }}>
      {/* tallo y hojas */}
      <path d="M50 78 Q 52 92 50 108" stroke="#2E7D32" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M50 96 Q 34 84 24 92 Q 36 102 50 96 Z" fill="#43A047" />
      <path d="M51 90 Q 66 78 78 86 Q 66 97 51 90 Z" fill="#66BB6A" />

      {/* pétalos */}
      <g>
        {talking && <animateTransform attributeName="transform" type="rotate" values="0 50 46;14 50 46;0 50 46;-14 50 46;0 50 46" dur="1.2s" repeatCount="indefinite" />}
        {Array.from({ length: 14 }).map((_, i) => (
          <ellipse key={i} cx={50} cy={13} rx={7.5} ry={14} fill={i % 2 ? "#FFB300" : "#FFCA28"} stroke="#F57F17" strokeWidth={0.8} transform={`rotate(${(i * 360) / 14} 50 46)`} />
        ))}
      </g>

      {/* carita */}
      <circle cx={50} cy={46} r={25} fill="#8D6E63" />
      <circle cx={50} cy={46} r={22} fill="#A1887F" />
      <ellipse cx={42} cy={36} rx={8} ry={4} fill="#fff" opacity={0.25} />

      {/* correa de las gafas */}
      <path d="M26 40 Q 50 34 74 40" stroke="#5D4037" strokeWidth={4} fill="none" />

      {/* ojos (parpadean) */}
      {[40, 60].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy={42} rx={6.5} ry={7} fill="#fff" />
          <ellipse cx={x + 0.5} cy={43} rx={3.6} ry={4} fill="#2D2A26">
            <animate attributeName="ry" values="4;4;0.4;4" keyTimes="0;0.92;0.96;1" dur={`${3.6 + i * 0.01}s`} repeatCount="indefinite" />
          </ellipse>
          <circle cx={x + 1.8} cy={41} r={1.4} fill="#fff" />
        </g>
      ))}
      {/* gafas de explorador */}
      {[40, 60].map((x) => (
        <g key={`g${x}`}>
          <circle cx={x} cy={42} r={9} fill="#80DEEA" fillOpacity={0.22} stroke="#6D4C41" strokeWidth={3} />
          <path d={`M ${x - 5} ${37} L ${x - 1.5} ${35}`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
        </g>
      ))}
      <path d="M48.5 42 h3" stroke="#6D4C41" strokeWidth={3} />

      {/* cachetes y boca */}
      <circle cx={31} cy={53} r={3.6} fill="#FF8A80" opacity={0.75} />
      <circle cx={69} cy={53} r={3.6} fill="#FF8A80" opacity={0.75} />
      {talking ? (
        <ellipse cx={50} cy={57} rx={6} ry={4} fill="#6D2E1F">
          <animate attributeName="ry" values="4;1.2;4.5;1.5;4" dur="0.5s" repeatCount="indefinite" />
        </ellipse>
      ) : (
        <path d="M42 55 Q 50 63 58 55" stroke="#3E2723" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
