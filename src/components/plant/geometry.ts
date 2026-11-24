/**
 * Geometría de la planta por etapa (unidades del viewBox 240×262).
 * La planta es un tallo literal que sale de la tierra, con hojas a los lados
 * y una "cabecita" en la punta del tallo donde vive la carita.
 * La usan el SVG, los accesorios y la pantalla principal (pulgones, partículas, mirada).
 */

export const VIEW_W = 240;
export const VIEW_H = 262;
export const CX = 120;
export const SOIL_Y = 184;
/** donde nace el tallo (dentro de la maceta) */
export const STEM_BASE_Y = 202;

export type CrownKind = "baby" | "curl" | "buds" | "flower";

export interface LeafDef {
  /** punto de unión con el tallo */
  x: number;
  y: number;
  /** grados (0 = derecha, -90 = arriba) */
  angle: number;
  len: number;
  side: -1 | 1;
  /** el par más alto funciona como bracitos (saluda/celebra) */
  arm: boolean;
  /** desfase para que la brisa no mueva todas igual */
  phase: number;
}

export interface PlantGeo {
  stage: number;
  /** medio ancho de la cabecita */
  R: number;
  /** centro de la cara */
  hy: number;
  /** punta de la cabecita */
  top: number;
  /** donde la cabecita se vuelve tallo */
  neckY: number;
  /** medio ancho del tallo en el cuello y en la base */
  stemW: number;
  baseW: number;
  eyeY: number;
  eyeDX: number;
  eyeRx: number;
  eyeRy: number;
  mouthY: number;
  leaves: LeafDef[];
  crown: CrownKind;
}

interface StageSpec {
  R: number;
  hy: number;
  /** pares de hojas: [y, largo, ¿son bracitos?] de abajo hacia arriba */
  pairs: [number, number, boolean][];
  crown: CrownKind;
}

const SPECS: StageSpec[] = [
  // 1 · Germinando: apenas asoma de la tierra con 2 hojitas bebé
  { R: 17, hy: 160, pairs: [], crown: "baby" },
  // 2 · Brote joven: el doble de alto y 4 hojas laterales
  { R: 19, hy: 127, pairs: [[172, 24, false], [153, 22, true]], crown: "curl" },
  // 3 · Planta frondosa: tallo alto, 6 hojas en 3 niveles + capullos
  { R: 21, hy: 103, pairs: [[173, 30, false], [155, 33, false], [137, 29, true]], crown: "buds" },
  // 4 · Floreciendo: tamaño máximo, 8 hojas y flor abierta
  { R: 23, hy: 97, pairs: [[175, 34, false], [160, 39, false], [145, 37, false], [130, 32, true]], crown: "flower" },
];

export function plantGeometry(stage: number): PlantGeo {
  const s = Math.max(0, Math.min(3, Math.round(stage)));
  const spec = SPECS[s];
  const { R, hy } = spec;
  const stemW = Math.max(5, R * 0.3);
  const leaves: LeafDef[] = [];
  spec.pairs.forEach(([y, len, arm], i) => {
    const up = i * 6; // las hojas de arriba apuntan un poco más hacia arriba
    leaves.push(
      { x: CX - stemW * 0.6, y, angle: arm ? 198 : 205 + up, len, side: -1, arm, phase: i * 0.37 },
      { x: CX + stemW * 0.6, y: y - 3, angle: arm ? -18 : -25 - up, len, side: 1, arm, phase: i * 0.37 + 0.2 }
    );
  });
  return {
    stage: s,
    R,
    hy,
    top: hy - R * 1.25,
    neckY: hy + R * 0.95,
    stemW,
    baseW: stemW * 1.35,
    eyeY: hy - R * 0.05,
    eyeDX: R * 0.44,
    eyeRx: R * 0.24,
    eyeRy: R * 0.27,
    mouthY: hy + R * 0.55,
    leaves,
    crown: spec.crown,
  };
}

/** accesorios que tapan la coronilla: lo de arriba (hojitas, capullos, flor) sale por encima */
export function crownBaseY(g: PlantGeo, accessory: string | null) {
  switch (accessory) {
    case "acc-sombrero":
      return g.hy - g.R * 1.36;
    case "acc-corona":
      return g.hy - g.R * 1.55;
    case "acc-gorra":
      return g.top - g.R * 0.18;
    case "acc-audifonos":
      return g.top - g.R * 0.42;
    default:
      return g.top + 2;
  }
}

/** Puntos (en % de la caja del SVG) donde pueden posarse los pulgones: sus hojas */
export function leafSpots(stage: number): { x: number; y: number }[] {
  const g = plantGeometry(stage);
  const px = (v: number) => (v / VIEW_W) * 100;
  const py = (v: number) => (v / VIEW_H) * 100;
  const spots = g.leaves.map((l) => {
    const a = (l.angle * Math.PI) / 180;
    return { x: px(l.x + Math.cos(a) * l.len * 0.62), y: py(l.y + Math.sin(a) * l.len * 0.62) };
  });
  spots.push({ x: px(CX + 10), y: py(g.top - 8) });
  return spots;
}
