import type { Climate } from "./weather";

export type StatKey = "water" | "fresh" | "nutrients";

/** Medidores que se pueden subir con herramientas o juegos */
export type BoostStat = StatKey | "happy";

export type ToolId = "water" | "feed" | "shade" | "sponge" | "ball";

export type Mood = "feliz" | "sedienta" | "acalorada" | "hambrienta" | "marchita";

export type CareAction = "water" | "shade" | "fertilize";

export type ItemCategory = "pot" | "accessory" | "background";

export type TabId = "planta" | "jugar" | "kit" | "tienda" | "sabi";

export interface Equipped {
  pot: string;
  accessory: string | null;
  background: string;
}

export interface KitPhoto {
  id: string;
  /** ISO date */
  date: string;
  week: number;
  /** data URL (JPEG comprimido o SVG de demo) */
  image: string;
  note: string;
}

export type NotificationType =
  | "water"
  | "heat"
  | "nutrients"
  | "streak"
  | "photo"
  | "reward"
  | "stage"
  | "happy"
  | "dirt"
  | "rain"
  | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

export interface GameStats {
  careActions: number;
  gamesPlayed: number;
  bestScore: number;
  triviaCorrect: number;
  triviaPlayed: number;
  /** récord de cada minijuego (memorama: menos movimientos es mejor) */
  best: Partial<Record<string, number>>;
}

export interface Profile {
  /** nombre que el niño elige mostrar (no es su nombre real obligatorio) */
  displayName: string;
  /** foto de perfil comprimida (data URL) o emoji */
  avatar: string | null;
  avatarEmoji: string;
}

/** Conteo diario de XP y monedas ganadas (fecha YYYY-MM-DD) */
export interface DailyProgress {
  date: string;
  xp: number;
  coins: number;
}

export interface GameState {
  version: 1;
  nickname: string;
  profile: Profile;
  plantName: string;
  isDemo: boolean;
  /** 0-100 */
  water: number;
  /** Frescura (inverso de la temperatura) 0-100 */
  fresh: number;
  /** 0-100 */
  nutrients: number;
  /** Felicidad 0-100 (caricias, pelota, bichitos) */
  happy: number;
  /** Manchitas de tierra en las hojas (0-3) */
  dirt: number;
  /** Clima actual de la simulación */
  climate: Climate;
  /** Sombrilla abierta hasta (ms), 0 si no hay */
  shadeUntil: number;
  /** Catarina Guardiana activa hasta (ms), 0 si no hay */
  ladybugUntil: number;
  /** Lo ganado hoy (se reinicia cada día): tope de 100 XP y 80 monedas */
  daily: DailyProgress;
  xp: number;
  coins: number;
  streak: number;
  bestStreak: number;
  /** YYYY-MM-DD local */
  lastCareDate: string | null;
  /** último cálculo de desgaste (ms) */
  lastTick: number;
  owned: string[];
  equipped: Equipped;
  photos: KitPhoto[];
  notifications: AppNotification[];
  stats: GameStats;
  createdAt: number;
  /** última acción del usuario (ms) — se usa para resolver conflictos nube/local */
  updatedAt: number;
}

export interface CareResult {
  ok: boolean;
  message: string;
  xp: number;
  coins: number;
  streakUp?: number;
  stageUp?: string;
}
