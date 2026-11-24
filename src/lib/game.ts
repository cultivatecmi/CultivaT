import type {
  AppNotification,
  BoostStat,
  CareAction,
  CareResult,
  GameState,
  KitPhoto,
  Mood,
  NotificationType,
} from "./types";
import { DEFAULT_EQUIPPED, DEFAULT_OWNED, RETIRED_ITEMS, getItem } from "./shop";
import { getStage } from "./stages";
import { demoPhotoDataUrl } from "./demo-photos";
import { clamp, dateKey, pick, uid, yesterdayKey } from "./utils";
import { CLIMATES, isClimate, type Climate } from "./weather";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
export const WEEK_MS = 7 * DAY;
/** cuánto dura abierta la sombrilla */
export const SHADE_MS = 40_000;
export const MAX_DIRT = 3;

/**
 * Cambio por minuto de cada medidor según el clima (positivo = baja, negativo = sube).
 * "shaded" se usa mientras la sombrilla está abierta.
 */
const CLIMATE_RATES: Record<Climate, { open: Record<BoostStat, number>; shaded: Record<BoostStat, number> }> = {
  soleado: {
    open: { water: 0.6, fresh: 0.45, nutrients: 0.3, happy: 0.5 },
    shaded: { water: 0.5, fresh: -12, nutrients: 0.3, happy: 0.5 },
  },
  // ola de calor: agua y frescura bajan MUY rápido (≈ -10 y -20 en 40 s) si no hay sombrilla
  calor: {
    open: { water: 15, fresh: 30, nutrients: 0.3, happy: 1.5 },
    shaded: { water: 3, fresh: -22, nutrients: 0.3, happy: 0.5 },
  },
  lluvia: {
    open: { water: -8, fresh: -10, nutrients: 0.3, happy: 0.5 },
    shaded: { water: -2, fresh: -10, nutrients: 0.3, happy: 0.5 },
  },
};

// ---------------------------------------------------------------------------
// Creación de estados
// ---------------------------------------------------------------------------

const DEFAULT_STATS = {
  careActions: 0,
  gamesPlayed: 0,
  bestScore: 0,
  triviaCorrect: 0,
  triviaPlayed: 0,
  best: {},
};

export function makeNotification(
  type: NotificationType,
  title: string,
  body: string,
  now = Date.now()
): AppNotification {
  return { id: uid(), type, title, body, createdAt: now, read: false };
}

export function addNotification(
  list: AppNotification[],
  n: AppNotification
): AppNotification[] {
  return [n, ...list].slice(0, 30);
}

export function createInitialState(nickname: string, now = Date.now()): GameState {
  return {
    version: 1,
    nickname,
    plantName: "Brotín",
    isDemo: false,
    water: 80,
    fresh: 85,
    nutrients: 70,
    happy: 75,
    dirt: 0,
    climate: "soleado",
    shadeUntil: 0,
    xp: 0,
    coins: 50,
    streak: 0,
    bestStreak: 0,
    lastCareDate: null,
    lastTick: now,
    owned: [...DEFAULT_OWNED],
    equipped: { ...DEFAULT_EQUIPPED },
    photos: [],
    notifications: [
      makeNotification(
        "info",
        "🌱 ¡Bienvenido a CultivaT!",
        "Tu semilla ya está en su maceta. Riégala, dale sombra y abónala para que crezca.",
        now
      ),
    ],
    stats: { ...DEFAULT_STATS },
    createdAt: now,
    updatedAt: now,
  };
}

export function createDemoState(now = Date.now()): GameState {
  const createdAt = now - 23 * DAY;
  const photos: KitPhoto[] = [
    { week: 3, note: "¡Ya tiene 4 hojitas! La puse junto a la ventana 🌤️" },
    { week: 2, note: "Salió el brote. Lo riego en las mañanas." },
    { week: 1, note: "Sembré mi semilla en el kit CultivaT 🌰" },
  ].map((p) => ({
    id: uid(),
    week: p.week,
    note: p.note,
    date: new Date(createdAt + (p.week - 1) * WEEK_MS + 2 * 60 * MIN).toISOString(),
    image: demoPhotoDataUrl(p.week),
  }));

  return {
    ...createInitialState("Demo", now),
    plantName: "Brotín",
    isDemo: true,
    water: 70,
    fresh: 66,
    nutrients: 58,
    happy: 72,
    dirt: 1,
    xp: 400,
    coins: 250,
    streak: 7,
    bestStreak: 7,
    lastCareDate: yesterdayKey(new Date(now)),
    owned: [...DEFAULT_OWNED, "acc-lentes", "acc-sombrero", "acc-gorra", "pot-talavera", "bg-valle"],
    equipped: { pot: "pot-talavera", accessory: "acc-sombrero", background: "bg-valle" },
    photos,
    notifications: [
      makeNotification("streak", "🔥 ¡Llevas 7 días seguidos!", "Cuida hoy a Brotín para llegar a 8 días.", now - 5 * MIN),
      makeNotification("photo", "📸 Foto de la semana 4", "Toma la foto de tu kit real para ver cuánto creció.", now - 60 * MIN),
      makeNotification("reward", "🏆 Medalla: Jardinero Constante", "Cuidaste tu planta una semana completa.", now - DAY),
    ],
    stats: {
      careActions: 46,
      gamesPlayed: 9,
      bestScore: 380,
      triviaCorrect: 17,
      triviaPlayed: 4,
      best: { lluvia: 380, plagas: 240, memorama: 14, trivia: 4 },
    },
    createdAt,
  };
}

function migrateEquipped(e: GameState["equipped"]): GameState["equipped"] {
  const fix = (id: string | null, fallback: string | null) => {
    if (!id) return fallback;
    const mapped = RETIRED_ITEMS[id] ?? id;
    return getItem(mapped) ? mapped : fallback;
  };
  return {
    pot: fix(e.pot, DEFAULT_EQUIPPED.pot) ?? DEFAULT_EQUIPPED.pot,
    accessory: fix(e.accessory, null),
    background: fix(e.background, DEFAULT_EQUIPPED.background) ?? DEFAULT_EQUIPPED.background,
  };
}

/** Completa campos faltantes (versiones viejas o datos corruptos) */
export function sanitizeState(raw: unknown, nickname: string): GameState {
  const base = createInitialState(nickname);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<GameState>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    ...base,
    ...r,
    version: 1,
    nickname: typeof r.nickname === "string" && r.nickname ? r.nickname : nickname,
    water: clamp(num(r.water, base.water)),
    fresh: clamp(num(r.fresh, base.fresh)),
    nutrients: clamp(num(r.nutrients, base.nutrients)),
    happy: clamp(num(r.happy, base.happy)),
    dirt: Math.round(clamp(num(r.dirt, 0), 0, MAX_DIRT)),
    climate: isClimate(r.climate) ? r.climate : "soleado",
    shadeUntil: num(r.shadeUntil, 0),
    xp: Math.max(0, num(r.xp, 0)),
    coins: Math.max(0, num(r.coins, base.coins)),
    streak: Math.max(0, num(r.streak, 0)),
    bestStreak: Math.max(0, num(r.bestStreak, 0)),
    lastTick: num(r.lastTick, Date.now()),
    createdAt: num(r.createdAt, Date.now()),
    updatedAt: num(r.updatedAt, 0),
    owned: Array.isArray(r.owned)
      ? Array.from(new Set([...DEFAULT_OWNED, ...r.owned.map((id) => RETIRED_ITEMS[id] ?? id)])).filter((id) => getItem(id))
      : base.owned,
    equipped: migrateEquipped({ ...base.equipped, ...(r.equipped ?? {}) }),
    photos: Array.isArray(r.photos) ? r.photos : [],
    notifications: Array.isArray(r.notifications) ? r.notifications.slice(0, 30) : base.notifications,
    stats: { ...DEFAULT_STATS, ...(r.stats ?? {}), best: { ...(r.stats?.best ?? {}) } },
  };
}

// ---------------------------------------------------------------------------
// Simulación
// ---------------------------------------------------------------------------

export function isShaded(s: GameState, now = Date.now()) {
  return s.shadeUntil > now;
}

/** La planta sufre calor: ola de calor y sin sombrilla */
export function isHeatActive(s: GameState, now = Date.now()) {
  return s.climate === "calor" && !isShaded(s, now);
}

export function ambientTemp(s: GameState) {
  return CLIMATES[s.climate].temp;
}

/**
 * Aplica el desgaste (o recuperación) de los medidores desde lastTick hasta now.
 * @param floor en cálculos "offline" evita que la planta llegue a 0 mientras el niño no está.
 */
export function applyDecay(s: GameState, now = Date.now(), opts: { floor?: number } = {}): GameState {
  const elapsed = now - s.lastTick;
  if (elapsed <= 0) return s;
  const shadeMs = s.shadeUntil > s.lastTick ? Math.max(0, Math.min(now, s.shadeUntil) - s.lastTick) : 0;
  const shadeMin = shadeMs / MIN;
  const openMin = (elapsed - shadeMs) / MIN;
  const rates = CLIMATE_RATES[s.climate];

  const floorFor = (current: number) => (opts.floor === undefined ? 0 : Math.min(opts.floor, current));

  const next = (key: BoostStat) => {
    const drop = openMin * rates.open[key] + shadeMin * rates.shaded[key];
    return Math.max(floorFor(s[key]), clamp(s[key] - drop));
  };

  return {
    ...s,
    water: next("water"),
    fresh: next("fresh"),
    nutrients: next("nutrients"),
    happy: next("happy"),
    shadeUntil: s.shadeUntil && now >= s.shadeUntil ? 0 : s.shadeUntil,
    lastTick: now,
  };
}

export function computeMood(s: GameState, now = Date.now()): Mood {
  const { water, fresh, nutrients } = s;
  if (Math.min(water, fresh, nutrients) <= 0 || (water + fresh + nutrients) / 3 < 12) return "marchita";
  // con la lluvia fresca la planta sonríe
  if (s.climate === "lluvia") return "feliz";
  if (isHeatActive(s, now) || fresh < 35) return "acalorada";
  if (water < 35) return "sedienta";
  if (nutrients < 35) return "hambrienta";
  return "feliz";
}

export const MOOD_LABELS: Record<Mood, { label: string; emoji: string }> = {
  feliz: { label: "Feliz", emoji: "😄" },
  sedienta: { label: "Sedienta", emoji: "💧" },
  acalorada: { label: "Acalorada", emoji: "🥵" },
  hambrienta: { label: "Hambrienta", emoji: "😋" },
  marchita: { label: "Marchita", emoji: "🥀" },
};

export const TAP_MESSAGES: Record<Mood, string[]> = {
  feliz: [
    "¡Jiji, me haces cosquillas! 😄",
    "¡Hoy me siento súper verde! 🌿",
    "¿Sabías que con la luz del sol preparo mi comida? ☀️",
    "¡Eres el mejor cuidador del mundo! 💚",
    "Cuando sea grande quiero dar flores 🌼",
  ],
  sedienta: ["Tengo seeed... ¿me riegas un poquito? 💧", "Mi tierra está muy seca 🏜️", "¡Agüita, porfa! 💦"],
  acalorada: [
    "¡Uf! Qué calorón hace en Culiacán 🥵",
    "¡Sombrita, porfa! El sol está muy fuerte ☀️",
    "Me estoy asando como elote 🌽🔥",
  ],
  hambrienta: ["Mi pancita de tierra pide abono 🌱", "¿Tienes composta? ¡Tengo hambre! 😋", "Grrr... necesito nutrientes 🍂"],
  marchita: ["Me siento muy débil... ayúdame 🥀", "Necesito agua, sombra y abono 😢", "No me rindo... ¡cuídame! 💔"],
};

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

/** Suma XP y detecta si la planta subió de etapa */
export function withXp(s: GameState, xp: number, now = Date.now()): { state: GameState; stageUp?: string } {
  if (xp <= 0) return { state: s };
  const before = getStage(s.xp).index;
  const next = { ...s, xp: s.xp + xp };
  const after = getStage(next.xp);
  if (after.index > before) {
    next.notifications = addNotification(
      next.notifications,
      makeNotification("stage", `${after.stage.emoji} ¡${s.plantName} creció!`, `Ahora es ${after.stage.name}. ¡Sigue así!`, now)
    );
    return { state: next, stageUp: after.stage.name };
  }
  return { state: next };
}

export function applyCare(
  s0: GameState,
  action: CareAction,
  now = Date.now()
): { state: GameState; result: CareResult } {
  let s: GameState = { ...s0, stats: { ...s0.stats } };
  let xp = 0;
  let message = "";

  if (action === "water") {
    if (s.water >= 95)
      return {
        state: s0,
        result: { ok: false, message: "¡Glup! Ya estoy llenita 💧 Mucha agua pudre mis raíces.", xp: 0, coins: 0 },
      };
    s.water = clamp(s.water + 30);
    xp = 6;
    message = pick(["¡Glu glu! Qué rica agüita 💧", "¡Gracias! Mis raíces están felices 💦", "¡Ahhh, refrescante! 💧"]);
  } else if (action === "shade") {
    if (isHeatActive(s, now)) {
      s.shadeUntil = now + SHADE_MS;
      s.fresh = clamp(s.fresh + 25);
      xp = 12;
      message = "¡Gracias! La sombra me protege del sol de Culiacán 😎";
    } else {
      if (s.fresh >= 95)
        return {
          state: s0,
          result: { ok: false, message: "¡Ya estoy fresquecita! 🌬️ Guarda la sombra para el mediodía.", xp: 0, coins: 0 },
        };
      s.fresh = clamp(s.fresh + 30);
      xp = 6;
      message = pick(["Ahhh, qué fresquecito 🌬️", "¡La sombrita es lo mejor! 🌳", "¡Adiós bochorno! 😎"]);
    }
  } else {
    if (s.nutrients >= 95)
      return {
        state: s0,
        result: { ok: false, message: "¡Estoy llenísima! Mucho abono quema mis raíces 🌱", xp: 0, coins: 0 },
      };
    s.nutrients = clamp(s.nutrients + 25);
    xp = 8;
    message = pick(["¡Ñam! Composta deliciosa 🌱", "¡Siento cómo crezco! 💪", "¡Gracias por el abono natural! 🍂"]);
  }

  const reg = registerCare(s, now);
  const x = withXp(reg.state, xp, now);
  s = x.state;
  return { state: s, result: { ok: true, message, xp, coins: reg.coins, streakUp: reg.streakUp, stageUp: x.stageUp } };
}

/** Cuenta un cuidado del día: actualiza la racha diaria (+10 🪙 la primera vez del día) */
export function registerCare(s0: GameState, now = Date.now()): { state: GameState; coins: number; streakUp?: number } {
  const s: GameState = { ...s0, stats: { ...s0.stats, careActions: s0.stats.careActions + 1 } };
  const today = dateKey(new Date(now));
  if (s.lastCareDate === today) return { state: s, coins: 0 };
  s.streak = s.lastCareDate === yesterdayKey(new Date(now)) ? s.streak + 1 : 1;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  s.lastCareDate = today;
  s.coins += 10;
  s.notifications = addNotification(
    s.notifications,
    makeNotification(
      "streak",
      `🔥 ¡Racha de ${s.streak} ${s.streak === 1 ? "día" : "días"}!`,
      "Cuidaste tu planta hoy. +10 🪙 de bonus.",
      now
    )
  );
  return { state: s, coins: 10, streakUp: s.streak };
}

export interface BoostResult {
  state: GameState;
  ok: boolean;
  full: boolean;
  streakUp?: number;
  stageUp?: string;
}

/**
 * Sube un medidor poco a poco (herramientas táctiles, caricias, pelota).
 * `care` indica si cuenta como cuidado diario (racha + XP).
 */
export function boostStat(s: GameState, stat: BoostStat, amount: number, care: boolean, now = Date.now()): BoostResult {
  if (s[stat] >= 99) return { state: s, ok: false, full: true };
  let next: GameState = { ...s, [stat]: clamp(s[stat] + amount) };
  let streakUp: number | undefined;
  let stageUp: string | undefined;
  if (care) {
    const reg = registerCare(next, now);
    streakUp = reg.streakUp;
    const x = withXp(reg.state, 1, now);
    next = x.state;
    stageUp = x.stageUp;
  }
  return { state: next, ok: true, full: next[stat] >= 99, streakUp, stageUp };
}

export function openUmbrella(s: GameState, now = Date.now()): BoostResult {
  const reg = registerCare({ ...s, shadeUntil: now + SHADE_MS, fresh: clamp(s.fresh + 10) }, now);
  const x = withXp(reg.state, 5, now);
  return { state: x.state, ok: true, full: false, streakUp: reg.streakUp, stageUp: x.stageUp };
}

export function cleanDirt(s: GameState, now = Date.now()): BoostResult {
  if (s.dirt <= 0) return { state: s, ok: false, full: true };
  const reg = registerCare({ ...s, dirt: s.dirt - 1, happy: clamp(s.happy + 6), coins: s.coins + 1 }, now);
  const x = withXp(reg.state, 3, now);
  return { state: x.state, ok: true, full: x.state.dirt === 0, streakUp: reg.streakUp, stageUp: x.stageUp };
}

export function addDirt(s: GameState): GameState {
  return s.dirt >= MAX_DIRT ? s : { ...s, dirt: s.dirt + 1 };
}

export function setClimate(s: GameState, climate: Climate, now = Date.now()): GameState {
  if (s.climate === climate) return s;
  const next: GameState = { ...s, climate };
  if (climate === "calor") {
    next.notifications = addNotification(
      s.notifications,
      makeNotification("heat", "🔥 ¡Ola de calor en Culiacán!", "Hace 42 °C. Abre la sombrilla ☂️ y riega a tu planta.", now)
    );
  } else if (climate === "lluvia") {
    next.notifications = addNotification(
      s.notifications,
      makeNotification("rain", "🌧️ ¡Lluvia fresca en Culiacán!", "19 °C. La lluvia está regando a tu planta poco a poco.", now)
    );
  }
  return next;
}

/** Revisa si se perdió la racha al volver a abrir la app */
export function checkStreakOnLoad(s: GameState, now = Date.now()): GameState {
  if (!s.lastCareDate || s.streak === 0) return s;
  const today = dateKey(new Date(now));
  const yesterday = yesterdayKey(new Date(now));
  if (s.lastCareDate === today || s.lastCareDate === yesterday) return s;
  return {
    ...s,
    streak: 0,
    notifications: addNotification(
      s.notifications,
      makeNotification("streak", "💔 Se reinició tu racha", "¡No pasa nada! Cuida tu planta hoy para empezar una nueva.", now)
    ),
  };
}

export function currentWeek(s: GameState, now = Date.now()) {
  return Math.max(1, Math.floor((now - s.createdAt) / WEEK_MS) + 1);
}

/** Genera recordatorios automáticos (con enfriamiento para no repetir) */
export function deriveAlerts(s: GameState, now = Date.now()): GameState {
  let list = s.notifications;
  const add = (type: NotificationType, title: string, body: string, cooldownMin: number) => {
    const recent = list.find((n) => n.type === type && now - n.createdAt < cooldownMin * MIN);
    if (!recent) list = addNotification(list, makeNotification(type, title, body, now));
  };
  if (s.water < 30) add("water", "💧 ¡Tengo sed!", `${s.plantName} tiene poca agua. Riégala un poquito.`, 20);
  if (s.fresh < 30 && !isHeatActive(s, now)) add("heat", "☀️ ¡Mucho calor!", "Dale sombra o aire a tu planta.", 20);
  if (s.nutrients < 30) add("nutrients", "🌱 Tengo hambre", "Ponle abono natural para que crezca fuerte.", 20);
  if (s.happy < 25) add("happy", "😢 Me siento solita", "Acaríciame frotándome con el dedo 💚", 30);
  if (s.dirt >= 2) add("dirt", "🧽 Tengo manchitas", "Frótame con el dedo para limpiarme.", 30);
  const today = dateKey(new Date(now));
  if (s.streak > 0 && s.lastCareDate !== today && new Date(now).getHours() >= 8)
    add("streak", `🔥 ¡No pierdas tu racha de ${s.streak} días!`, "Cuida tu planta hoy para mantenerla.", 6 * 60);
  const week = currentWeek(s, now);
  if (!s.photos.some((p) => p.week === week))
    add("photo", "📸 Foto semanal pendiente", `Toma la foto de tu kit real de la semana ${week}.`, 24 * 60);
  return list === s.notifications ? s : { ...s, notifications: list };
}
