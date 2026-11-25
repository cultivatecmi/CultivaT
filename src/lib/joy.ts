/**
 * Felicidad ganada jugando: los minijuegos la guardan aquí y "Mi Planta"
 * la celebra (risa, baile y corazones) al volver a la pantalla principal.
 */
let pending = 0;

export function markJoy(amount: number) {
  pending += amount;
}

export function takeJoy() {
  const j = pending;
  pending = 0;
  return j;
}

/** Bono de felicidad por terminar una partida: entre +15 % y +25 % */
export function gameJoyBonus() {
  return 15 + Math.floor(Math.random() * 11);
}
