"use client";

import { memo, useId } from "react";
import type { Mood } from "@/lib/types";
import { Pot } from "./Pot";
import { PlantFace } from "./PlantFace";
import { PlantAccessory } from "./PlantAccessory";
import { CX, SOIL_Y, STEM_BASE_Y, bezierAt, plantGeometry, type LeafDef, type PlantGeo } from "./geometry";

export type Reaction = "risa" | "comiendo" | "incomoda" | null;

interface Props {
  mood: Mood;
  /** 0 Semilla · 1 Brote · 2 Planta joven · 3 Floreciendo */
  stage: number;
  pot: string;
  accessory: string | null;
  reaction?: Reaction;
  /** manchitas de tierra (0-3) */
  dirt?: number;
  /** tierra recién regada */
  wet?: boolean;
  className?: string;
}

interface Palette {
  stem: string;
  stemLight: string;
  stemDark: string;
  leaf: string;
  leafLight: string;
  leafDark: string;
  bud: string;
  budLight: string;
}

const PALETTE: Record<Mood, Palette> = {
  feliz: { stem: "#5DAF4E", stemLight: "#A5D98A", stemDark: "#2E7D32", leaf: "#4CAF50", leafLight: "#AEE58F", leafDark: "#2E7D32", bud: "#66BB6A", budLight: "#C8F0B0" },
  sedienta: { stem: "#9CCC65", stemLight: "#DCEDC8", stemDark: "#689F38", leaf: "#9CCC65", leafLight: "#E6F2C9", leafDark: "#689F38", bud: "#AED581", budLight: "#F1F8E0" },
  acalorada: { stem: "#7CB342", stemLight: "#C5E1A5", stemDark: "#558B2F", leaf: "#7CB342", leafLight: "#D4E9A8", leafDark: "#558B2F", bud: "#8BC34A", budLight: "#FFE0B2" },
  hambrienta: { stem: "#81C784", stemLight: "#C8E6C9", stemDark: "#43A047", leaf: "#66BB6A", leafLight: "#C8E6C9", leafDark: "#388E3C", bud: "#81C784", budLight: "#E8F5E9" },
  marchita: { stem: "#A1887F", stemLight: "#D7CCC8", stemDark: "#6D4C41", leaf: "#A1887F", leafLight: "#D7CCC8", leafDark: "#6D4C41", bud: "#A1887F", budLight: "#E0D6D1" },
};

const DIRT_SPOTS = [
  { x: -0.52, y: -0.5, s: 1 },
  { x: 0.58, y: 0.1, s: 0.85 },
  { x: -0.35, y: 0.62, s: 0.8 },
];

// ---------------------------------------------------------------------------
// Tallo liso que se adelgaza hacia arriba
// ---------------------------------------------------------------------------

function stemPath(s: NonNullable<PlantGeo["stem"]>) {
  const left: string[] = [];
  const right: string[] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = bezierAt(s, t);
    const len = Math.hypot(p.dx, p.dy) || 1;
    const nx = -p.dy / len;
    const ny = p.dx / len;
    const w = s.w0 + (s.w1 - s.w0) * t;
    left.push(`${(p.x + nx * w).toFixed(1)} ${(p.y + ny * w).toFixed(1)}`);
    right.push(`${(p.x - nx * w).toFixed(1)} ${(p.y - ny * w).toFixed(1)}`);
  }
  return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
}

// ---------------------------------------------------------------------------
// Hoja real (corazón o lanceolada) con nervaduras
// ---------------------------------------------------------------------------

function leafShape(shape: LeafDef["shape"], len: number) {
  const p = len * 0.16; // pecíolo
  const L = len - p;
  if (shape === "heart") {
    const W = L * 0.44;
    return {
      p,
      L,
      W,
      d: `M ${p + L * 0.08} 0 C ${p - L * 0.08} ${-W * 0.8} ${p + L * 0.38} ${-W * 1.28} ${p + L} 0 C ${p + L * 0.38} ${W * 1.28} ${p - L * 0.08} ${W * 0.8} ${p + L * 0.08} 0 Z`,
    };
  }
  const W = L * 0.3;
  return {
    p,
    L,
    W,
    d: `M ${p} 0 C ${p + L * 0.22} ${-W * 0.85} ${p + L * 0.62} ${-W * 0.78} ${p + L} 0 C ${p + L * 0.62} ${W * 0.78} ${p + L * 0.22} ${W * 0.85} ${p} 0 Z`,
  };
}

type ArmMode = "idle" | "wave" | "fan" | "droop";

function RealLeaf({ l, droop, armMode, uid, c }: { l: LeafDef; droop: boolean; armMode: ArmMode; uid: string; c: Palette }) {
  const angle = droop ? (l.side === 1 ? 40 : 140) : l.angle;
  let anim: { values: string; dur: string } | null = null;
  if (!droop) {
    if (l.arm) {
      anim =
        armMode === "wave"
          ? { values: l.side === 1 ? "0;-36;6;-36;0" : "0;36;-6;36;0", dur: "0.7s" }
          : armMode === "fan" && l.side === 1
            ? { values: "0;-40;0", dur: "0.34s" }
            : { values: l.side === 1 ? "0;-7;0" : "0;7;0", dur: "2.9s" };
    } else {
      anim = { values: l.side === 1 ? "0;-6;2;0" : "0;6;-2;0", dur: `${(2.7 + l.phase * 1.6).toFixed(2)}s` };
    }
  }
  const { p, L, W, d } = leafShape(l.shape, l.len);
  const veins = [0.28, 0.48, 0.68].map((k) => ({ x0: p + L * k, x1: p + L * (k + 0.16), y: W * 0.62 * (1 - k * 0.7) }));
  return (
    <g transform={`translate(${l.x} ${l.y}) rotate(${angle})`}>
      {anim && <animateTransform attributeName="transform" type="rotate" values={anim.values} dur={anim.dur} repeatCount="indefinite" additive="sum" />}
      <path d={`M 0 0 L ${p + L * 0.1} 0`} stroke={c.stemDark} strokeWidth={2.6} strokeLinecap="round" />
      <path d={d} fill={`url(#leaf-${uid})`} stroke={c.leafDark} strokeWidth={0.9} strokeOpacity={0.6} />
      <path d={`M ${p + L * 0.06} 0 Q ${p + L * 0.5} ${-W * 0.06} ${p + L * 0.92} 0`} stroke={c.leafDark} strokeWidth={1.3} fill="none" opacity={0.5} strokeLinecap="round" />
      {veins.map((v, i) => (
        <g key={i} stroke={c.leafDark} strokeWidth={0.9} opacity={0.38} strokeLinecap="round" fill="none">
          <path d={`M ${v.x0} 0 Q ${(v.x0 + v.x1) / 2} ${-v.y * 0.45} ${v.x1} ${-v.y}`} />
          <path d={`M ${v.x0} 0 Q ${(v.x0 + v.x1) / 2} ${v.y * 0.45} ${v.x1} ${v.y}`} />
        </g>
      ))}
      <path d={`M ${p + L * 0.2} ${-W * 0.45} Q ${p + L * 0.45} ${-W * 0.75} ${p + L * 0.7} ${-W * 0.4}`} stroke="#fff" strokeWidth={1.3} fill="none" opacity={0.35} strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Órgano de la punta (donde vive la carita)
// ---------------------------------------------------------------------------

function budPath(R: number, hy: number) {
  const c = CX;
  return `M ${c} ${hy - R * 1.55} C ${c + R * 0.5} ${hy - R * 1.12} ${c + R * 1.02} ${hy - R * 0.55} ${c + R} ${hy + R * 0.1} C ${c + R * 0.98} ${hy + R * 0.72} ${c + R * 0.52} ${hy + R} ${c} ${hy + R} C ${c - R * 0.52} ${hy + R} ${c - R * 0.98} ${hy + R * 0.72} ${c - R} ${hy + R * 0.1} C ${c - R * 1.02} ${hy - R * 0.55} ${c - R * 0.5} ${hy - R * 1.12} ${c} ${hy - R * 1.55} Z`;
}

function seedPath(R: number, hy: number) {
  const c = CX;
  return `M ${c} ${hy - R * 1.08} C ${c + R * 0.55} ${hy - R} ${c + R * 1.02} ${hy - R * 0.45} ${c + R * 1.02} ${hy + R * 0.1} C ${c + R * 1.02} ${hy + R * 0.75} ${c + R * 0.6} ${hy + R} ${c} ${hy + R} C ${c - R * 0.6} ${hy + R} ${c - R * 1.02} ${hy + R * 0.75} ${c - R * 1.02} ${hy + R * 0.1} C ${c - R * 1.02} ${hy - R * 0.45} ${c - R * 0.55} ${hy - R} ${c} ${hy - R * 1.08} Z`;
}

function Head({ g, mood, uid, c }: { g: PlantGeo; mood: Mood; uid: string; c: Palette }) {
  const { R, hy, head } = g;
  const wilted = mood === "marchita";
  const droop = wilted || mood === "sedienta";
  const soft = `url(#soft-${uid})`;

  if (head === "seed") {
    const d = seedPath(R, hy);
    return (
      <g>
        {/* mini brote saliendo de la semilla */}
        <path d={`M ${CX + 2} ${hy - R * 1.02} q -2 -9 4 -14 q 6 -4 9 2`} stroke={c.stemDark} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        <RealLeaf l={{ x: CX + 14, y: hy - R * 1.02 - 11, angle: droop ? 30 : -40, len: 15, side: 1, arm: false, phase: 0, shape: "heart" }} droop={false} armMode="idle" uid={uid} c={c} />
        <RealLeaf l={{ x: CX + 6, y: hy - R * 1.02 - 13, angle: droop ? 150 : -150, len: 11, side: -1, arm: false, phase: 0.5, shape: "heart" }} droop={false} armMode="idle" uid={uid} c={c} />
        <path d={d} fill={`url(#seed-${uid})`} stroke="#8D6E63" strokeWidth={1.6} strokeOpacity={0.6} />
        <g clipPath={`url(#headclip-${uid})`}>
          <ellipse cx={CX - R * 0.38} cy={hy - R * 0.55} rx={R * 0.42} ry={R * 0.26} fill="#fff" opacity={0.5} filter={soft} />
        </g>
        <path d={`M ${CX + 2} ${hy - R * 1.02} Q ${CX - R * 0.42} ${hy - R * 0.35} ${CX - R * 0.22} ${hy + R * 0.55}`} stroke="#8D6E63" strokeOpacity={0.35} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </g>
    );
  }

  if (head === "flower") {
    const petal = wilted ? "#BCAAA4" : `url(#petal-${uid})`;
    const stroke = wilted ? "#8D6E63" : "#E65100";
    return (
      <g transform={droop ? `rotate(${wilted ? 24 : 12} ${CX} ${hy + R})` : undefined}>
        {Array.from({ length: 14 }).map((_, i) => (
          <ellipse key={`o${i}`} cx={CX} cy={hy - R * 1.48} rx={R * 0.3} ry={R * 0.6} transform={`rotate(${(i * 360) / 14} ${CX} ${hy})`} fill={petal} stroke={stroke} strokeWidth={0.7} strokeOpacity={0.5} />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <ellipse key={`i${i}`} cx={CX} cy={hy - R * 1.25} rx={R * 0.22} ry={R * 0.45} transform={`rotate(${(i * 360) / 14 + 360 / 28} ${CX} ${hy})`} fill={wilted ? "#D7CCC8" : "#FFD54F"} />
        ))}
        {/* disco del girasol con semillitas */}
        <circle cx={CX} cy={hy} r={R * 1.08} fill={`url(#disk-${uid})`} stroke="#4E342E" strokeWidth={1.4} />
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i * Math.PI * 2) / 18;
          return <circle key={i} cx={CX + Math.cos(a) * R * 0.9} cy={hy + Math.sin(a) * R * 0.9} r={1.3} fill="#4E342E" opacity={0.55} />;
        })}
        <ellipse cx={CX - R * 0.42} cy={hy - R * 0.55} rx={R * 0.35} ry={R * 0.2} fill="#fff" opacity={0.22} filter={soft} />
      </g>
    );
  }

  // yema de hoja (brote) o botón floral (planta joven)
  const d = budPath(R, hy);
  return (
    <g>
      {head === "flowerbud" && (
        <g>
          {[-0.42, 0, 0.42].map((k) => (
            <path key={k} d={`M ${CX + k * R} ${hy - R * 0.7} C ${CX + k * R - R * 0.3} ${hy - R * 1.3} ${CX + k * R * 1.4} ${hy - R * 1.75} ${CX + k * R * 1.4} ${hy - R * 1.8} C ${CX + k * R * 1.4 + R * 0.05} ${hy - R * 1.5} ${CX + k * R + R * 0.3} ${hy - R * 1.2} ${CX + k * R} ${hy - R * 0.7} Z`} fill={wilted ? "#D7CCC8" : "#FFCA28"} stroke={wilted ? "#A1887F" : "#F57F17"} strokeWidth={0.8} />
          ))}
        </g>
      )}
      <path d={d} fill={`url(#bud-${uid})`} stroke={c.leafDark} strokeWidth={1.5} strokeOpacity={0.55} />
      <g clipPath={`url(#headclip-${uid})`}>
        <ellipse cx={CX - R * 0.4} cy={hy - R * 0.65} rx={R * 0.4} ry={R * 0.3} fill="#fff" opacity={0.5} filter={soft} />
        <ellipse cx={CX + R * 0.2} cy={hy + R * 1.05} rx={R * 1.1} ry={R * 0.45} fill={c.leafDark} opacity={0.35} filter={soft} />
      </g>
      {head === "leafbud" ? (
        <path d={`M ${CX} ${hy - R * 1.5} Q ${CX + R * 0.08} ${hy - R * 1.0} ${CX} ${hy - R * 0.55}`} stroke={c.leafDark} strokeWidth={1.4} fill="none" opacity={0.5} strokeLinecap="round" />
      ) : (
        [-0.62, 0.62].map((k) => (
          <path key={k} d={`M ${CX + k * R} ${hy + R * 0.85} Q ${CX + k * R * 1.15} ${hy - R * 0.2} ${CX + k * R * 0.55} ${hy - R * 1.0}`} stroke={c.leafDark} strokeWidth={1.3} fill="none" opacity={0.45} strokeLinecap="round" />
        ))
      )}
    </g>
  );
}

function headClipPath(g: PlantGeo) {
  if (g.head === "seed") return seedPath(g.R, g.hy);
  if (g.head === "flower") return `M ${CX - g.R * 1.08} ${g.hy} a ${g.R * 1.08} ${g.R * 1.08} 0 1 0 ${g.R * 2.16} 0 a ${g.R * 1.08} ${g.R * 1.08} 0 1 0 ${-g.R * 2.16} 0 Z`;
  return budPath(g.R, g.hy);
}

// ---------------------------------------------------------------------------

function PlantCharacterBase({ mood, stage, pot, accessory, reaction = null, dirt = 0, wet = false, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = plantGeometry(stage);
  const c = PALETTE[mood];
  const { R, hy } = g;
  const face = reaction ?? mood;
  const droop = mood === "marchita" || mood === "sedienta";
  const armMode: ArmMode = reaction === "risa" ? "wave" : droop ? "droop" : mood === "acalorada" ? "fan" : "idle";
  const posture = mood === "marchita" ? `rotate(-5 ${CX} ${STEM_BASE_Y}) translate(0 3)` : mood === "sedienta" ? `rotate(3 ${CX} ${STEM_BASE_Y})` : undefined;
  const isFlower = g.head === "flower";

  return (
    <svg viewBox="0 0 240 262" className={className} role="img" aria-label={`Planta ${mood}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`stem-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.stemLight} />
          <stop offset="0.45" stopColor={c.stem} />
          <stop offset="1" stopColor={c.stemDark} />
        </linearGradient>
        <linearGradient id={`leaf-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.leafLight} />
          <stop offset="0.55" stopColor={c.leaf} />
          <stop offset="1" stopColor={c.leafDark} />
        </linearGradient>
        <radialGradient id={`bud-${uid}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={c.budLight} />
          <stop offset="0.5" stopColor={c.bud} />
          <stop offset="1" stopColor={c.leafDark} />
        </radialGradient>
        <radialGradient id={`seed-${uid}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={mood === "marchita" ? "#DDD4CE" : "#F8E6C8"} />
          <stop offset="0.5" stopColor={mood === "marchita" ? "#A99A8F" : mood === "acalorada" ? "#E0985E" : "#D2A46E"} />
          <stop offset="1" stopColor="#8D6E63" />
        </radialGradient>
        <radialGradient id={`petal-${uid}`} cx="0.5" cy="1" r="1">
          <stop offset="0" stopColor="#F57F17" />
          <stop offset="0.45" stopColor="#FFB300" />
          <stop offset="1" stopColor="#FFE082" />
        </radialGradient>
        <radialGradient id={`disk-${uid}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#BCAAA4" />
          <stop offset="0.6" stopColor="#A1887F" />
          <stop offset="1" stopColor="#795548" />
        </radialGradient>
        <clipPath id={`headclip-${uid}`}>
          <path d={headClipPath(g)} />
        </clipPath>
        <filter id={`soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={R * 0.15} />
        </filter>
        <radialGradient id={`ground-${uid}`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={CX} cy={257} rx={70} ry={8} fill={`url(#ground-${uid})`} />

      <g transform={posture}>
        <g>
          {/* brisa suave desde la tierra */}
          {!droop && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-1.8 ${CX} ${STEM_BASE_Y};1.8 ${CX} ${STEM_BASE_Y};-1.8 ${CX} ${STEM_BASE_Y}`}
              keyTimes="0;0.5;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              dur="4.8s"
              repeatCount="indefinite"
            />
          )}

          {g.leaves.map((l, i) => (
            <RealLeaf key={i} l={l} droop={droop} armMode={armMode} uid={uid} c={c} />
          ))}

          {g.stem && (
            <g>
              <path d={stemPath(g.stem)} fill={`url(#stem-${uid})`} stroke={c.stemDark} strokeWidth={0.8} strokeOpacity={0.5} />
              <path
                d={`M ${g.stem.p0[0] - 2} ${SOIL_Y} C ${g.stem.c1[0] - 2} ${g.stem.c1[1]} ${g.stem.c2[0] - 2} ${g.stem.c2[1]} ${g.stem.p3[0] - 1.5} ${g.stem.p3[1] + 4}`}
                stroke="#fff"
                strokeWidth={1.3}
                fill="none"
                opacity={0.3}
                strokeLinecap="round"
              />
            </g>
          )}

          <Head g={g} mood={mood} uid={uid} c={c} />

          {DIRT_SPOTS.slice(0, Math.max(0, Math.min(3, dirt))).map((d, i) => {
            const x = CX + d.x * R;
            const y = hy + d.y * R;
            const s = R * 0.15 * d.s;
            return (
              <g key={i} opacity={0.85}>
                <path d={`M ${x - s} ${y} Q ${x - s} ${y - s * 1.1} ${x} ${y - s} Q ${x + s * 1.3} ${y - s * 0.9} ${x + s} ${y + s * 0.2} Q ${x + s * 0.6} ${y + s * 1.1} ${x - s * 0.2} ${y + s * 0.9} Q ${x - s * 1.2} ${y + s * 0.8} ${x - s} ${y} Z`} fill="#5D4037" />
                <circle cx={x + s * 1.5} cy={y + s * 0.6} r={s * 0.3} fill="#5D4037" />
              </g>
            );
          })}

          <g transform={isFlower && droop ? `rotate(${mood === "marchita" ? 24 : 12} ${CX} ${hy + R})` : undefined}>
            <PlantFace
              face={face}
              r={R}
              rx={isFlower ? R * 1.9 : R}
              cy={hy}
              eyeDX={g.eyeDX}
              eyeY={g.eyeY}
              eyeRx={g.eyeRx}
              eyeRy={g.eyeRy}
              mouthY={g.mouthY}
              hideEyes={false}
              lid={isFlower ? "#A1887F" : g.head === "seed" ? "#D2A46E" : c.bud}
              cheek={{ dx: R * 0.66, y: hy + R * 0.34 }}
            />
            <PlantAccessory id={accessory} g={g} />
          </g>
        </g>
      </g>

      {/* tierra de la maceta (más oscura y brillante al regar) */}
      <ellipse cx={CX} cy={SOIL_Y} rx={57} ry={5.5} fill={wet ? "#3E2723" : "#5D4037"} />
      {wet && <ellipse cx={CX - 30} cy={SOIL_Y - 3.5} rx={12} ry={1.6} fill="#fff" opacity={0.45} />}

      <Pot id={pot} uid={uid} />
    </svg>
  );
}

export const PlantCharacter = memo(PlantCharacterBase);
