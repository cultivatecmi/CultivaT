/**
 * Clima de Culiacán en la pantalla principal. Cambia solo cada 35-45 s
 * (el niño ya no lo controla: debe estar pendiente para proteger su planta).
 * No usa GPS ni servicios externos: privacidad infantil.
 */
export type Climate = "soleado" | "calor" | "lluvia";

export const CLIMATES: Record<Climate, { temp: number; label: string; emoji: string; message: string }> = {
  soleado: {
    temp: 26,
    label: "Soleado",
    emoji: "☀️",
    message: "¡Volvió el sol! Un día tranquilo ☀️",
  },
  calor: {
    temp: 42,
    label: "Ola de calor",
    emoji: "🔥",
    message: "¡Uf, 42 °C! Ponme la sombrilla ☂️ y riégame 💧",
  },
  lluvia: {
    temp: 19,
    label: "Lluvia fresca",
    emoji: "🌧️",
    message: "¡Lluvia fresquita! Me está regando 🌧️",
  },
};

/** cuánto dura cada clima antes de cambiar (ms) */
export const CLIMATE_MIN_MS = 35_000;
export const CLIMATE_MAX_MS = 45_000;

export function randomClimateDelay() {
  return CLIMATE_MIN_MS + Math.random() * (CLIMATE_MAX_MS - CLIMATE_MIN_MS);
}

/** Siguiente clima: alterna de forma dinámica, sin repetir el actual */
export function pickNextClimate(c: Climate): Climate {
  const r = Math.random();
  if (c === "soleado") return r < 0.55 ? "calor" : "lluvia";
  if (c === "calor") return r < 0.7 ? "soleado" : "lluvia";
  return r < 0.7 ? "soleado" : "calor";
}

export function isClimate(v: unknown): v is Climate {
  return v === "soleado" || v === "calor" || v === "lluvia";
}
