export interface Stage {
  id: "semilla" | "brote" | "joven" | "floreciendo";
  name: string;
  emoji: string;
  minXp: number;
}

export const STAGES: Stage[] = [
  { id: "semilla", name: "Semilla", emoji: "🌰", minXp: 0 },
  { id: "brote", name: "Brote", emoji: "🌱", minXp: 400 }, // días 5–11
  { id: "joven", name: "Planta Joven", emoji: "🌿", minXp: 1100 }, // días 12–20
  { id: "floreciendo", name: "Planta Floreciendo", emoji: "🌻", minXp: 2000 }, // día 21+
];

export function getStage(xp: number) {
  let index = 0;
  for (let i = 0; i < STAGES.length; i++) if (xp >= STAGES[i].minXp) index = i;
  const stage = STAGES[index];
  const next = STAGES[index + 1] ?? null;
  const xpInto = xp - stage.minXp;
  const xpNeeded = next ? next.minXp - stage.minXp : 1;
  const progress = next ? Math.min(1, xpInto / xpNeeded) : 1;
  return { index, stage, next, xpInto, xpNeeded, progress };
}
