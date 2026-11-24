"use client";

import { useId } from "react";

interface Props {
  id: string;
  heat?: boolean;
  /** sin cielo, sol ni nubes (la pantalla principal dibuja un cielo animado aparte) */
  skyless?: boolean;
  className?: string;
}

/** Color del piso de cada escenario (para extenderlo hasta abajo en pantalla completa) */
export const GROUND_COLORS: Record<string, string> = {
  "bg-patio": "#D9896A",
  "bg-valle": "#7CB342",
  "bg-invernadero": "#A5D6A7",
  "bg-bosque": "#4E7D3E",
};

/** Fondos de escenario: Patio Soleado, Valle de Culiacán e Invernadero */
export function BackgroundScene({ id, heat = false, skyless = false, className }: Props) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`sky-${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={heat ? "#FFB38A" : id === "bg-invernadero" ? "#E0F2F1" : "#9EDDFF"} />
          <stop offset="1" stopColor={heat ? "#FFE0B2" : "#FFF8E7"} />
        </linearGradient>
        <radialGradient id={`heat-${u}`} cx="0.85" cy="0.1" r="1">
          <stop offset="0" stopColor="#FF7043" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FF7043" stopOpacity="0" />
        </radialGradient>
      </defs>

      {!skyless && <rect width="400" height="320" fill={`url(#sky-${u})`} />}

      {id === "bg-valle" && <Valle sky={!skyless} />}
      {id === "bg-invernadero" && <Invernadero />}
      {id === "bg-bosque" && <Bosque sky={!skyless} />}
      {id !== "bg-valle" && id !== "bg-invernadero" && id !== "bg-bosque" && <Patio sky={!skyless} />}

      {heat && !skyless && <rect width="400" height="320" fill={`url(#heat-${u})`} className="anim-heat" />}
    </svg>
  );
}

function Sun({ x = 340, y = 58 }: { x?: number; y?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={40} fill="#FFE082" opacity={0.45} />
      <circle cx={x} cy={y} r={26} fill="#FFCA28" />
    </g>
  );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={0.9}>
      <ellipse cx={0} cy={0} rx={26} ry={12} />
      <ellipse cx={-16} cy={4} rx={16} ry={9} />
      <ellipse cx={18} cy={4} rx={18} ry={9} />
      <ellipse cx={4} cy={-8} rx={14} ry={10} />
    </g>
  );
}

function Patio({ sky }: { sky: boolean }) {
  return (
    <g>
      {sky && <Sun />}
      {sky && <Cloud x={70} y={52} s={0.9} />}
      {/* barda de adobe */}
      <rect x={0} y={150} width={400} height={110} fill="#F4C58A" />
      <rect x={0} y={150} width={400} height={10} fill="#E0A96D" />
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 9 }).map((_, col) => (
          <rect key={`${row}-${col}`} x={col * 48 - (row % 2) * 24 + 4} y={166 + row * 16} width={40} height={10} rx={2} fill="#E8B477" opacity={0.6} />
        ))
      )}
      {/* bugambilia */}
      {[30, 62, 95, 330, 362].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={150 - (i % 2) * 6} r={20} fill="#2E7D32" />
          <circle cx={x - 8} cy={142 - (i % 2) * 6} r={6} fill="#EC407A" />
          <circle cx={x + 9} cy={148 - (i % 2) * 6} r={5} fill="#F06292" />
          <circle cx={x + 2} cy={136 - (i % 2) * 6} r={4} fill="#EC407A" />
        </g>
      ))}
      {/* piso de barro */}
      <rect x={0} y={256} width={400} height={64} fill="#D9896A" />
      {[0, 1, 2].map((r) => (
        <path key={r} d={`M0 ${270 + r * 18} H400`} stroke="#C27459" strokeWidth={2} />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${i * 50} 256 L ${i * 50 - 20} 320`} stroke="#C27459" strokeWidth={2} />
      ))}
    </g>
  );
}

function Valle({ sky }: { sky: boolean }) {
  return (
    <g>
      {sky && (
        <>
          <Sun x={320} y={60} />
          <Cloud x={90} y={48} />
          <Cloud x={230} y={80} s={0.7} />
        </>
      )}
      {/* Sierra Madre */}
      <path d="M0 170 L 50 120 L 95 150 L 150 100 L 210 150 L 260 112 L 320 155 L 370 118 L 400 140 V 200 H0 Z" fill="#9FA8DA" />
      <path d="M0 190 L 70 150 L 130 178 L 200 140 L 280 180 L 340 152 L 400 176 V 210 H0 Z" fill="#7986CB" opacity={0.85} />
      {/* campos */}
      <rect x={0} y={196} width={400} height={124} fill="#8BC34A" />
      <path d="M0 196 H400 V 230 H0 Z" fill="#AED581" />
      <path d="M0 230 H180 L 150 320 H0 Z" fill="#7CB342" />
      <path d="M250 230 H400 V320 H 290 Z" fill="#C5E1A5" />
      {Array.from({ length: 12 }).map((_, i) => (
        <path key={i} d={`M ${200 + (i - 6) * 8} 200 L ${200 + (i - 6) * 70} 320`} stroke="#558B2F" strokeWidth={2} opacity={0.45} />
      ))}
      {/* río Culiacán */}
      <path d="M 400 214 Q 300 222 240 232 Q 170 244 120 262 Q 80 278 0 284 V 296 Q 90 292 140 274 Q 200 254 260 242 Q 330 230 400 226 Z" fill="#4FC3F7" opacity={0.85} />
      {/* árboles y elotes */}
      {[40, 360].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={186} width={6} height={20} fill="#6D4C41" />
          <circle cx={x} cy={180} r={16} fill="#388E3C" />
        </g>
      ))}
    </g>
  );
}

function Bosque({ sky }: { sky: boolean }) {
  const fireflies = [
    [40, 150], [110, 120], [180, 170], [250, 110], [320, 160], [370, 130], [70, 210], [300, 220],
  ];
  return (
    <g>
      {sky && <rect width="400" height="320" fill="#B39DDB" opacity={0.35} />}
      {/* árboles del fondo */}
      {[
        [20, 60, 70], [95, 40, 85], [175, 70, 60], [250, 35, 90], [330, 55, 75], [395, 70, 60],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <rect x={x - 9} y={y + r * 0.6} width={18} height={260 - y} fill="#4E342E" opacity={0.85} />
          <circle cx={x} cy={y + r * 0.35} r={r * 0.75} fill={i % 2 ? "#2E6B4F" : "#3E7C59"} />
          <circle cx={x - r * 0.4} cy={y + r * 0.55} r={r * 0.5} fill={i % 2 ? "#3E7C59" : "#2E6B4F"} />
          <circle cx={x + r * 0.45} cy={y + r * 0.5} r={r * 0.48} fill="#356F52" />
        </g>
      ))}
      {/* piso con musgo */}
      <path d="M0 236 Q 100 222 200 232 Q 300 242 400 228 V 320 H0 Z" fill="#5B8C4A" />
      <path d="M0 262 Q 120 250 220 262 Q 320 272 400 258 V 320 H0 Z" fill="#4E7D3E" />
      {/* hongos mágicos */}
      {[
        [48, 248, 1], [86, 256, 0.7], [312, 250, 1.1], [352, 258, 0.75], [24, 266, 0.6],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x={-4} y={-4} width={8} height={14} rx={3} fill="#FFF8E1" />
          <path d="M-14 -2 Q -14 -18 0 -18 Q 14 -18 14 -2 Z" fill={i % 2 ? "#AB47BC" : "#E53935"} />
          <circle cx={-6} cy={-9} r={2.2} fill="#fff" />
          <circle cx={5} cy={-12} r={1.8} fill="#fff" />
          <circle cx={7} cy={-5} r={1.5} fill="#fff" />
        </g>
      ))}
      {/* luciérnagas */}
      {fireflies.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="#FFF59D">
          <animate attributeName="opacity" values="0.1;1;0.1" dur={`${1.6 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function Invernadero() {
  return (
    <g>
      {/* estructura */}
      <path d="M0 60 Q 100 0 200 60 Q 300 0 400 60 V 250 H0 Z" fill="#C8E6C9" opacity={0.65} />
      {[0, 200].map((x) => (
        <path key={x} d={`M ${x} 60 Q ${x + 100} 0 ${x + 200} 60`} stroke="#fff" strokeWidth={7} fill="none" />
      ))}
      {[50, 100, 150, 250, 300, 350].map((x) => (
        <path key={x} d={`M ${x} ${x % 200 === 100 ? 32 : 44} V 250`} stroke="#fff" strokeWidth={4} opacity={0.9} />
      ))}
      <path d="M0 130 H400 M0 190 H400" stroke="#fff" strokeWidth={3} opacity={0.8} />
      {/* mesas con plántulas y tomates */}
      {[{ y: 200, s: 1 }].map(({ y }) => (
        <g key={y}>
          <rect x={0} y={y} width={400} height={10} fill="#8D6E63" />
          {Array.from({ length: 12 }).map((_, i) => (
            <g key={i}>
              <rect x={10 + i * 33} y={y - 12} width={18} height={12} fill="#6D4C41" />
              <path d={`M ${19 + i * 33} ${y - 12} q -7 -10 -10 -6 q 4 6 10 6 q 7 -10 10 -6 q -4 6 -10 6`} fill="#66BB6A" />
              {i % 3 === 0 && <circle cx={22 + i * 33} cy={y - 22} r={4} fill="#E53935" />}
            </g>
          ))}
        </g>
      ))}
      <rect x={0} y={250} width={400} height={70} fill="#A5D6A7" />
      <path d="M0 262 H400 M0 290 H400" stroke="#81C784" strokeWidth={3} />
    </g>
  );
}
