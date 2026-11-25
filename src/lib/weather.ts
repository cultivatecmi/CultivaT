/**
 * Clima de Culiacán en la pantalla principal. Cambia solo cada 35-45 s
 * (el niño ya no lo controla: debe estar pendiente para proteger su planta).
 * No usa GPS ni servicios externos: privacidad infantil.
 */
export type Climate = "soleado" | "nublado" | "calor" | "lluvia";

export const CLIMATES: Record<Climate, { temp: number; label: string; emoji: string; message: string }> = {
  soleado: {
    temp: 26,
    label: "Soleado",
    emoji: "☀️",
    message: "¡Volvió el sol! Un día tranquilo ☀️",
  },
  nublado: {
    temp: 23,
    label: "Nublado",
    emoji: "⛅",
    message: "Unas nubes tapan el sol… ¡qué sombrita tan rica! ⛅",
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
  // las nubes suelen ir entre el sol y la lluvia, como en el cielo real
  if (c === "soleado") return r < 0.45 ? "calor" : r < 0.8 ? "nublado" : "lluvia";
  if (c === "calor") return r < 0.6 ? "soleado" : "nublado";
  if (c === "nublado") return r < 0.45 ? "lluvia" : r < 0.85 ? "soleado" : "calor";
  return r < 0.6 ? "nublado" : "soleado";
}

export function isClimate(v: unknown): v is Climate {
  return v === "soleado" || v === "nublado" || v === "calor" || v === "lluvia";
}
