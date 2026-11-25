/**
 * Modo Presentación Automática (tour de 3 minutos).
 * Se activa con ?demo=true o tocando 5 veces el logo. Mientras está activo:
 * - no aplican los topes diarios de XP y monedas,
 * - el clima automático y las plagas al azar se pausan (los controla el tour).
 * Usa siempre el perfil de demostración, así que no toca el progreso de los niños.
 */

let active = false;

export function isTourActive() {
  return active;
}

export function setTourActive(v: boolean) {
  active = v;
}

/** Pistas que los juegos dejan para el tour (p. ej. hacia dónde volar con la abeja) */
export const tourHint: { beeY: number | null } = { beeY: null };

/** Órdenes del tour para pantallas que tienen su propio estado */
export type TourEvent = "aphid" | "ladybugOpen" | "ladybugConfirm" | "splash";

const EVENT = "cultivat-tour";

export function tourEmit(type: TourEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TourEvent>(EVENT, { detail: type }));
}

export function onTourEvent(type: TourEvent, handler: () => void) {
  const f = (e: Event) => {
    if ((e as CustomEvent<TourEvent>).detail === type) handler();
  };
  window.addEventListener(EVENT, f);
  return () => window.removeEventListener(EVENT, f);
}
