"use client";

import { memo, useId } from "react";
import type { Mood } from "@/lib/types";
import { Leaf } from "./parts";
import { Pot } from "./Pot";
import { PlantFace } from "./PlantFace";
import { PlantAccessory } from "./PlantAccessory";
import { CX, SOIL_Y, STEM_BASE_Y, crownBaseY, plantGeometry, type LeafDef, type PlantGeo } from "./geometry";

export type Reaction = "risa" | "comiendo" | null;

interface Props {
  mood: Mood;
  /** 0 Germinando · 1 Brote joven · 2 Planta frondosa · 3 Floreciendo */
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
  base: string;
  light: string;
  dark: string;
  leaf: string;
  leafLight: string;
  leafDark: string;
}

const PALETTE: Record<Mood, Palette> = {
  feliz: { base: "#66BB6A", light: "#C8F2B8", dark: "#2E7D32", leaf: "#43A047", leafLight: "#A5E08A", leafDark: "#2E7D32" },
  sedienta: { base: "#B5D88A", light: "#F1F7D6", dark: "#7CB342", leaf: "#9CCC65", leafLight: "#DCEDC8", leafDark: "#689F38" },
  acalorada: { base: "#8BC34A", light: "#FFE3BF", dark: "#558B2F", leaf: "#7CB342", leafLight: "#C5E1A5", leafDark: "#558B2F" },
  hambrienta: { base: "#81C784", light: "#E2F5E3", dark: "#43A047", leaf: "#66BB6A", leafLight: "#B9E4BB", leafDark: "#388E3C" },
  marchita: { base: "#A1887F", light: "#DDD2CD", dark: "#6D4C41", leaf: "#8D6E63", leafLight: "#C8B7B0", leafDark: "#5D4037" },
};

const DIRT_SPOTS = [
  { x: -0.55, y: -0.55, s: 1 },
  { x: 0.6, y: 0.12, s: 0.85 },
  { x: -0.38, y: 0.66, s: 0.8 },
];

/** tallo + cabecita en una sola forma orgánica */
function plantPath({ R, hy, top, neckY, stemW: sw, baseW: bw }: PlantGeo) {
  const c = CX;
  const b = STEM_BASE_Y;
  const h = b - neckY;
  return [
    `M ${c} ${top}`,
    `C ${c + R * 0.72} ${top} ${c + R} ${hy - R * 0.62} ${c + R} ${hy}`,
    `C ${c + R} ${hy + R * 0.55} ${c + sw * 1.7} ${neckY - R * 0.22} ${c + sw} ${neckY}`,
    `C ${c + sw * 0.92} ${neckY + h * 0.4} ${c + bw} ${b - h * 0.25} ${c + bw} ${b}`,
    `L ${c - bw} ${b}`,
    `C ${c - bw} ${b - h * 0.25} ${c - sw * 0.92} ${neckY + h * 0.4} ${c - sw} ${neckY}`,
    `C ${c - sw * 1.7} ${neckY - R * 0.22} ${c - R} ${hy + R * 0.55} ${c - R} ${hy}`,
    `C ${c - R} ${hy - R * 0.62} ${c - R * 0.72} ${top} ${c} ${top} Z`,
  ].join(" ");
}

type ArmMode = "idle" | "wave" | "fan" | "droop";

/** hoja lateral con pecíolo; las del par superior hacen de bracitos */
function SideLeaf({ l, droop, armMode, fill, vein }: { l: LeafDef; droop: boolean; armMode: ArmMode; fill: string; vein: string }) {
  const angle = droop ? (l.side === 1 ? 38 : 142) : l.angle;
  let anim: { values: string; dur: string } | null;
  if (l.arm && !droop) {
    anim =
      armMode === "wave"
        ? { values: l.side === 1 ? "0;-38;6;-38;0" : "0;38;-6;38;0", dur: "0.7s" }
        : armMode === "fan"
          ? l.side === 1
            ? { values: "0;-42;0", dur: "0.32s" }
            : { values: "0;6;0", dur: "1.2s" }
          : { values: l.side === 1 ? "0;-8;0" : "0;8;0", dur: "2.8s" };
  } else if (!droop) {
    // brisa: cada hoja con su propio ritmo
    anim = { values: l.side === 1 ? "0;-7;2;0" : "0;7;-2;0", dur: `${(2.6 + l.phase * 1.7).toFixed(2)}s` };
  } else {
    anim = null;
  }
  return (
    <g transform={`translate(${l.x} ${l.y}) rotate(${angle})`}>
      {anim && <animateTransform attributeName="transform" type="rotate" values={anim.values} dur={anim.dur} repeatCount="indefinite" additive="sum" />}
      <path d={`M0 0 L ${l.len * 0.24} 0`} stroke={vein} strokeWidth={3} strokeLinecap="round" />
      <Leaf x={l.len * 0.18} y={0} len={l.len * 0.82} angle={0} fill={fill} vein={vein} />
    </g>
  );
}

function Bud({ x, y, angle, c }: { x: number; y: number; angle: number; c: Palette }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d="M0 2 C -5 -2 -5 -10 0 -15 C 5 -10 5 -2 0 2 Z" fill="#F48FB1" />
      <path d="M0 3 C -6 -1 -6 -7 -2 -9 L 0 -4 L 2 -9 C 6 -7 6 -1 0 3 Z" fill={c.leaf} stroke={c.leafDark} strokeWidth={0.8} />
    </g>
  );
}

function Crown({ g, mood, base, leafFill, c, uid }: { g: PlantGeo; mood: Mood; base: number; leafFill: string; c: Palette; uid: string }) {
  const droop = mood === "marchita" || mood === "sedienta";
  const sway = !droop && (
    <animateTransform attributeName="transform" type="rotate" values={`-4 ${CX} ${base};4 ${CX} ${base};-4 ${CX} ${base}`} dur="3.2s" repeatCount="indefinite" />
  );

  if (g.crown === "baby") {
    const tipY = base - 7;
    return (
      <g>
        {sway}
        <path d={`M ${CX} ${base + 3} L ${CX} ${tipY}`} stroke={c.leafDark} strokeWidth={3} strokeLinecap="round" />
        <Leaf x={CX} y={tipY} len={16} angle={droop ? 165 : -150} fill={leafFill} vein={c.leafDark} />
        <Leaf x={CX} y={tipY} len={16} angle={droop ? 15 : -30} fill={leafFill} vein={c.leafDark} />
      </g>
    );
  }

  if (g.crown === "curl") {
    const tipX = CX + (droop ? 8 : 4);
    const tipY = base - 14 + (droop ? 5 : 0);
    return (
      <g>
        {sway}
        <path d={`M ${CX} ${base + 3} Q ${CX + 6} ${base - 6} ${tipX} ${tipY}`} stroke={c.leafDark} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Leaf x={tipX} y={tipY} len={14} angle={droop ? 160 : -145} fill={leafFill} vein={c.leafDark} />
        <Leaf x={tipX} y={tipY} len={12} angle={droop ? 25 : -35} fill={leafFill} vein={c.leafDark} />
      </g>
    );
  }

  if (g.crown === "buds") {
    return (
      <g>
        {sway}
        <Leaf x={CX} y={base + 2} len={14} angle={droop ? 175 : -160} fill={leafFill} vein={c.leafDark} />
        <Leaf x={CX} y={base + 2} len={14} angle={droop ? 5 : -20} fill={leafFill} vein={c.leafDark} />
        {[
          { x: CX - 11, y: base - 10, a: -25 },
          { x: CX + 11, y: base - 10, a: 25 },
          { x: CX, y: base - 17, a: 0 },
        ].map((b) => (
          <g key={b.x}>
            <path d={`M ${CX} ${base + 2} Q ${(CX + b.x) / 2} ${base - 4} ${b.x} ${b.y}`} stroke={c.leafDark} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <Bud x={b.x} y={b.y} angle={droop ? b.a + 40 : b.a} c={c} />
          </g>
        ))}
      </g>
    );
  }

  // flor abierta
  const R = g.R;
  const fy = base - R * 0.85;
  const wilted = mood === "marchita";
  return (
    <g>
      {sway}
      <defs>
        <radialGradient id={`petal-${uid}`} cx="0.5" cy="0.9" r="0.9">
          <stop offset="0" stopColor={wilted ? "#D7CCC8" : "#FFD1E3"} />
          <stop offset="1" stopColor={wilted ? "#A1887F" : "#F50057"} />
        </radialGradient>
      </defs>
      <path d={`M ${CX} ${base + 3} L ${CX} ${fy}`} stroke={c.leafDark} strokeWidth={3.5} strokeLinecap="round" />
      <Leaf x={CX} y={base - 4} len={15} angle={droop ? 170 : -165} fill={leafFill} vein={c.leafDark} />
      <Leaf x={CX} y={base - 8} len={15} angle={droop ? 10 : -15} fill={leafFill} vein={c.leafDark} />
      <g transform={`translate(${CX} ${fy}) rotate(${droop ? 30 : 0})`}>
        {!droop && <animateTransform attributeName="transform" type="rotate" values="0;14;0" dur="5s" repeatCount="indefinite" additive="sum" />}
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse key={`o${i}`} cx={0} cy={-R * 0.5} rx={R * 0.3} ry={R * 0.52} transform={`rotate(${i * 45})`} fill={`url(#petal-${uid})`} stroke={wilted ? "#8D6E63" : "#C51162"} strokeWidth={0.8} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse key={`i${i}`} cx={0} cy={-R * 0.3} rx={R * 0.16} ry={R * 0.3} transform={`rotate(${i * 45 + 22.5})`} fill={wilted ? "#E0D6D1" : "#FF80AB"} />
        ))}
        <circle r={R * 0.26} fill="#FFD54F" stroke="#F57F17" strokeWidth={1.2} />
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={R * 0.12 * Math.cos((a * Math.PI) / 180)} cy={R * 0.12 * Math.sin((a * Math.PI) / 180)} r={1.3} fill="#E65100" />
        ))}
        <circle cx={-R * 0.08} cy={-R * 0.09} r={R * 0.07} fill="#fff" opacity={0.7} />
      </g>
    </g>
  );
}

function PlantCharacterBase({ mood, stage, pot, accessory, reaction = null, dirt = 0, wet = false, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = plantGeometry(stage);
  const c = PALETTE[mood];
  const { R, hy } = g;
  const face = reaction ?? mood;
  const droop = mood === "marchita" || mood === "sedienta";
  const leafFill = `url(#leaf-${uid})`;
  const shape = plantPath(g);
  const base = crownBaseY(g, accessory);
  const armMode: ArmMode = reaction === "risa" ? "wave" : droop ? "droop" : mood === "acalorada" ? "fan" : "idle";

  const posture =
    mood === "marchita" ? `rotate(-6 ${CX} ${STEM_BASE_Y}) translate(0 3)` : mood === "sedienta" ? `rotate(4 ${CX} ${STEM_BASE_Y})` : undefined;

  return (
    <svg viewBox="0 0 240 262" className={className} role="img" aria-label={`Planta ${mood}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.42" stopColor={c.base} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={`leaf-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.leafLight} />
          <stop offset="1" stopColor={c.leaf} />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={shape} />
        </clipPath>
        <filter id={`soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={R * 0.16} />
        </filter>
        <radialGradient id={`ground-${uid}`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={CX} cy={257} rx={70} ry={8} fill={`url(#ground-${uid})`} />

      <g transform={posture}>
        {/* brisa: toda la planta se mece suavemente desde la tierra */}
        <g>
          {!droop && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-1.6 ${CX} ${STEM_BASE_Y};1.6 ${CX} ${STEM_BASE_Y};-1.6 ${CX} ${STEM_BASE_Y}`}
              keyTimes="0;0.5;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              dur="4.6s"
              repeatCount="indefinite"
            />
          )}

          <Crown g={g} mood={mood} base={base} leafFill={leafFill} c={c} uid={uid} />

          {g.leaves.map((l, i) => (
            <SideLeaf key={i} l={l} droop={droop} armMode={armMode} fill={leafFill} vein={c.leafDark} />
          ))}

          {/* tallo + cabecita con volumen */}
          <path d={shape} fill={`url(#body-${uid})`} />
          <g clipPath={`url(#clip-${uid})`}>
            <ellipse cx={CX} cy={hy + R * 0.5} rx={R * 0.55} ry={R * 0.34} fill={c.light} opacity={0.3} />
            <ellipse cx={CX - R * 0.4} cy={hy - R * 0.7} rx={R * 0.45} ry={R * 0.32} fill="#fff" opacity={0.55} filter={`url(#soft-${uid})`} />
            <ellipse cx={CX} cy={SOIL_Y + 6} rx={R * 1.2} ry={R * 0.5} fill={c.dark} opacity={0.35} filter={`url(#soft-${uid})`} />
            {g.stage >= 1 && (
              <path d={`M ${CX - g.stemW * 0.35} ${g.neckY + 2} L ${CX - g.baseW * 0.42} ${SOIL_Y}`} stroke="#fff" strokeWidth={1.6} opacity={0.35} strokeLinecap="round" />
            )}
          </g>
          <path d={shape} fill="none" stroke={c.dark} strokeOpacity={0.5} strokeWidth={1.8} />
          <ellipse cx={CX - R * 0.5} cy={hy - R * 0.78} rx={R * 0.13} ry={R * 0.07} fill="#fff" opacity={0.85} transform={`rotate(-35 ${CX - R * 0.5} ${hy - R * 0.78})`} />

          {DIRT_SPOTS.slice(0, Math.max(0, Math.min(3, dirt))).map((d, i) => {
            const x = CX + d.x * R;
            const y = hy + d.y * R;
            const s = R * 0.15 * d.s;
            return (
              <g key={i} opacity={0.88}>
                <path d={`M ${x - s} ${y} Q ${x - s} ${y - s * 1.1} ${x} ${y - s} Q ${x + s * 1.3} ${y - s * 0.9} ${x + s} ${y + s * 0.2} Q ${x + s * 0.6} ${y + s * 1.1} ${x - s * 0.2} ${y + s * 0.9} Q ${x - s * 1.2} ${y + s * 0.8} ${x - s} ${y} Z`} fill="#6D4C41" />
                <circle cx={x + s * 1.5} cy={y + s * 0.6} r={s * 0.3} fill="#6D4C41" />
              </g>
            );
          })}

          <PlantFace
            face={face}
            r={R}
            rx={R}
            cy={hy}
            eyeDX={g.eyeDX}
            eyeY={g.eyeY}
            eyeRx={g.eyeRx}
            eyeRy={g.eyeRy}
            mouthY={g.mouthY}
            hideEyes={false}
            lid={c.base}
            cheek={{ dx: R * 0.66, y: hy + R * 0.4 }}
          />

          <PlantAccessory id={accessory} g={g} />
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
