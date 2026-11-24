/**
 * Geometría de la planta por etapa (unidades del viewBox 240×262).
 * Planta real estilizada: tallo liso y curvo que sale de la tierra, hojas reales
 * a los lados y, en la punta, el órgano donde vive la carita:
 *   semilla → yema de hoja → botón floral → flor abierta (girasol).
 * La usan el SVG, los accesorios y la pantalla principal (pulgones, partículas, mirada).
 */

export const VIEW_W = 240;
export const VIEW_H = 262;
export const CX = 120;
export const SOIL_Y = 184;
export const STEM_BASE_Y = 202;

export type HeadKind = "seed" | "leafbud" | "flowerbud" | "flower";

export interface LeafDef {
  x: number;
  y: number;
  /** grados (0 = derecha, -90 = arriba) */
  angle: number;
  len: number;
  side: -1 | 1;
  /** el par más alto saluda como bracitos */
  arm: boolean;
  phase: number;
  /** forma: corazón (cordada) o lanceolada */
  shape: "heart" | "lance";
}

export interface PlantGeo {
  stage: number;
  head: HeadKind;
  /** radio del órgano con cara */
  R: number;
  /** centro de la cara */
  hy: number;
  hx: number;
  /** parte alta "redonda" del órgano (para sombreros y gorras) */
  top: number;
  eyeY: number;
  eyeDX: number;
  eyeRx: number;
  eyeRy: number;
  mouthY: number;
  /** tallo: curva cúbica desde la tierra hasta la cabeza */
  stem: { p0: [number, number]; c1: [number, number]; c2: [number, number]; p3: [number, number]; w0: number; w1: number } | null;
  leaves: LeafDef[];
}

interface Spec {
  head: HeadKind;
  R: number;
  /** donde el tallo toca la cabeza */
  attachY: number;
  /** pares de hojas: [t sobre el tallo 0-1, largo, ¿bracitos?, forma] */
  pairs: [number, number, boolean, "heart" | "lance"][];
  w0: number;
  w1: number;
}

const SPECS: Spec[] = [
  { head: "seed", R: 22, attachY: 0, pairs: [], w0: 0, w1: 0 },
  { head: "leafbud", R: 20, attachY: 140, pairs: [[0.38, 26, false, "heart"], [0.74, 24, true, "heart"]], w0: 6, w1: 4 },
  {
    head: "flowerbud",
    R: 21,
    attachY: 108,
    pairs: [[0.24, 32, false, "heart"], [0.52, 34, false, "lance"], [0.78, 28, true, "lance"]],
    w0: 7,
    w1: 4.5,
  },
  {
    head: "flower",
    R: 22,
    attachY: 96,
    pairs: [[0.2, 36, false, "heart"], [0.42, 40, false, "heart"], [0.62, 37, false, "lance"], [0.82, 31, true, "lance"]],
    w0: 8.5,
    w1: 5,
  },
];

/** punto y tangente sobre la curva cúbica */
export function bezierAt(s: NonNullable<PlantGeo["stem"]>, t: number) {
  const u = 1 - t;
  const [p0, c1, c2, p3] = [s.p0, s.c1, s.c2, s.p3];
  const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p3[0] - c2[0]);
  const dy = 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p3[1] - c2[1]);
  return { x, y, dx, dy };
}

export function plantGeometry(stage: number): PlantGeo {
  const s = Math.max(0, Math.min(3, Math.round(stage)));
  const spec = SPECS[s];
  const { R } = spec;

  let hx = CX;
  let hy: number;
  let stem: PlantGeo["stem"] = null;
  const leaves: LeafDef[] = [];

  if (spec.head === "seed") {
    hy = 165;
  } else {
    const h = STEM_BASE_Y - spec.attachY;
    stem = {
      p0: [CX, STEM_BASE_Y],
      c1: [CX - 10, STEM_BASE_Y - h * 0.35],
      c2: [CX + 12, STEM_BASE_Y - h * 0.72],
      p3: [CX, spec.attachY],
      w0: spec.w0,
      w1: spec.w1,
    };
    hx = CX;
    hy = spec.attachY - R * (spec.head === "flower" ? 0.95 : 0.85);
    spec.pairs.forEach(([t, len, arm, shape], i) => {
      const p = bezierAt(stem!, t);
      const up = i * 5;
      // hojas alternas: la izquierda un poco más abajo que la derecha
      leaves.push(
        { x: p.x - 1, y: p.y + 3, angle: arm ? 196 : 202 + up, len, side: -1, arm, phase: i * 0.41, shape },
        { x: p.x + 1, y: p.y - 3, angle: arm ? -16 : -22 - up, len, side: 1, arm, phase: i * 0.41 + 0.23, shape }
      );
    });
  }

  return {
    stage: s,
    head: spec.head,
    R,
    hx,
    hy,
    top: hy - R * 1.02,
    eyeY: hy - R * 0.08,
    eyeDX: R * 0.42,
    eyeRx: R * 0.22,
    eyeRy: R * 0.26,
    mouthY: hy + R * 0.48,
    stem,
    leaves,
  };
}

/** Puntos (en % de la caja del SVG) donde pueden posarse los pulgones: sus hojas */
export function leafSpots(stage: number): { x: number; y: number }[] {
  const g = plantGeometry(stage);
  const px = (v: number) => (v / VIEW_W) * 100;
  const py = (v: number) => (v / VIEW_H) * 100;
  const spots = g.leaves.map((l) => {
    const a = (l.angle * Math.PI) / 180;
    return { x: px(l.x + Math.cos(a) * l.len * 0.6), y: py(l.y + Math.sin(a) * l.len * 0.6) };
  });
  if (!spots.length) spots.push({ x: px(g.hx + 12), y: py(g.top - 6) });
  return spots;
}
