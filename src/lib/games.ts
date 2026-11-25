/** Catálogo de la Sala de Juegos */

export type GameId = "lluvia" | "plagas" | "memorama" | "trivia" | "raices" | "polinizacion";

export interface GameInfo {
  id: GameId;
  name: string;
  emoji: string;
  tagline: string;
  reward: string;
  /** degradado de la tarjeta */
  from: string;
  to: string;
  /** cómo se muestra el récord */
  bestLabel: (v: number) => string;
  /** el récord es mejor cuanto más bajo (memorama: movimientos) */
  lowerIsBetter?: boolean;
}

export const GAMES: GameInfo[] = [
  {
    id: "lluvia",
    name: "Atrapa la Lluvia",
    emoji: "🌧️",
    tagline: "Mueve la maceta y atrapa agua y abono",
    reward: "Hasta 40 🪙",
    from: "#4FC3F7",
    to: "#0288D1",
    bestLabel: (v) => `${v} pts`,
  },
  {
    id: "plagas",
    name: "Aplasta Plagas",
    emoji: "🐛",
    tagline: "¡Toca gusanos y pulgones! Cuida a las catarinas",
    reward: "Hasta 35 🪙",
    from: "#9CCC65",
    to: "#558B2F",
    bestLabel: (v) => `${v} pts`,
  },
  {
    id: "memorama",
    name: "Memorama Botánico",
    emoji: "🃏",
    tagline: "Encuentra los pares de cultivos de Sinaloa",
    reward: "Hasta 45 🪙",
    from: "#FFCA28",
    to: "#F57F17",
    bestLabel: (v) => `${v} movs.`,
    lowerIsBetter: true,
  },
  {
    id: "trivia",
    name: "Trivia del Campo",
    emoji: "🧠",
    tagline: "Preguntas relámpago y datos curiosos",
    reward: "15 🪙 por acierto",
    from: "#FF8A65",
    to: "#E64A19",
    bestLabel: (v) => `${v}/5 aciertos`,
  },
  {
    id: "raices",
    name: "Laberinto de Raíces",
    emoji: "🌱",
    tagline: "Guía la raíz hacia el agua y los minerales",
    reward: "Hasta 40 🪙",
    from: "#D97706",
    to: "#78350F",
    bestLabel: (v) => `${v} pts`,
  },
  {
    id: "polinizacion",
    name: "Vuelo de Polinización",
    emoji: "🐝",
    tagline: "Vuela sin parar de flor en flor",
    reward: "Hasta 40 🪙",
    from: "#22C55E",
    to: "#15803D",
    bestLabel: (v) => `${v} pts`,
  },
];

export function getGame(id: GameId) {
  return GAMES.find((g) => g.id === id)!;
}

/** Puntos → monedas/XP para los juegos de puntaje */
export function scoreReward(score: number) {
  return { coins: Math.max(0, Math.floor(score / 10)), xp: Math.max(0, Math.floor(score / 15)) };
}
