/**
 * Efectos de sonido sintetizados con Web Audio API (sin archivos de audio).
 * El contexto se crea/activa con el primer toque del usuario (requisito de los navegadores).
 */

export type SoundName =
  | "drop"
  | "coin"
  | "bite"
  | "bounce"
  | "squash"
  | "levelup"
  | "pop"
  | "whoosh"
  | "scrub"
  | "tap"
  | "rain"
  | "correct"
  | "wrong"
  | "flip"
  | "beep"
  | "go"
  | "umbrellaOff"
  | "tab";

const MUTE_KEY = "cultivat:v1:muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let mutedLoaded = false;
const listeners = new Set<() => void>();
const lastPlayed: Partial<Record<SoundName, number>> = {};

// ---------------------------------------------------------------------------
// Silencio
// ---------------------------------------------------------------------------

function loadMuted() {
  if (mutedLoaded || typeof window === "undefined") return;
  mutedLoaded = true;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    /* sin almacenamiento */
  }
}

export function isMuted() {
  loadMuted();
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  mutedLoaded = true;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
}

export function subscribeMuted(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  // "interrupted" ocurre en iPhone al volver de segundo plano o tras una llamada
  if (ctx.state !== "running" && !released) void ctx.resume().catch(() => undefined);
  return ctx;
}

/** true mientras la app está en segundo plano: el audio queda liberado para otras apps */
let released = false;

/**
 * Libera el audio cuando la app pasa a segundo plano (Safari en iPhone mantiene la sesión
 * de reproducción ocupada y no deja que otras apps suenen). Se reactiva con el siguiente toque.
 */
export function releaseAudio() {
  released = true;
  unlocked = false;
  try {
    silentAudio?.pause();
  } catch {
    /* sin audio */
  }
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "auto";
  } catch {
    /* no disponible */
  }
  if (ctx && ctx.state === "running") void ctx.suspend().catch(() => undefined);
}

let unlocked = false;
let silentAudio: HTMLAudioElement | null = null;

/** WAV de 0.1 s de silencio, generado en memoria (sin archivos externos) */
function silentWavUrl() {
  const rate = 8000;
  const samples = rate / 10;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

/**
 * Llamar desde un gesto del usuario (touchend / click / keydown) para habilitar el audio.
 * En iPhone además pide modo "reproducción" para que suene aunque el interruptor de silencio esté activado.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (document.visibilityState === "hidden") return;
  released = false;
  // iOS 17+: los sonidos del juego se tratan como reproducción multimedia
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {
    /* no disponible */
  }
  const c = getCtx();
  if (!c) return;
  if (unlocked && c.state === "running") return;
  try {
    // un sample silencioso dentro del gesto "despierta" el audio en Safari
    const b = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(0);
    // iOS anterior a 17: un <audio> silencioso cambia la sesión a "reproducción"
    if (!silentAudio) {
      silentAudio = new Audio(silentWavUrl());
      silentAudio.setAttribute("playsinline", "");
      silentAudio.loop = true;
      silentAudio.volume = 0.01;
    }
    void silentAudio.play().catch(() => undefined);
    // solo cuenta como desbloqueado cuando el contexto realmente suena
    void c
      .resume()
      .then(() => {
        unlocked = c.state === "running";
      })
      .catch(() => undefined);
  } catch {
    /* sin audio */
  }
}

function getNoise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  at?: number;
  dur: number;
  vol: number;
  attack?: number;
}

function tone(c: AudioContext, t: number, o: ToneOpts, gainMul: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const t0 = t + (o.at ?? 0);
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f0, t0);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol * gainMul), t0 + (o.attack ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g);
  g.connect(master!);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.03);
}

interface NoiseOpts {
  filter: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  at?: number;
  dur: number;
  vol: number;
}

function noise(c: AudioContext, t: number, o: NoiseOpts, gainMul: number) {
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const filter = c.createBiquadFilter();
  const g = c.createGain();
  const t0 = t + (o.at ?? 0);
  filter.type = o.filter;
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.f0, t0);
  if (o.f1) filter.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol * gainMul), t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master!);
  src.start(t0, Math.random() * 0.2);
  src.stop(t0 + o.dur + 0.03);
}

const MIN_GAP_MS: Partial<Record<SoundName, number>> = { drop: 70, scrub: 90, pop: 60, bounce: 60, rain: 400 };

/** Reproduce un efecto. `gain` permite sonidos más suaves (0-1). */
export function playSound(name: SoundName, gain = 1) {
  if (isMuted()) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const gap = MIN_GAP_MS[name] ?? 30;
  if (now - (lastPlayed[name] ?? -Infinity) < gap) return;
  lastPlayed[name] = now;

  const c = getCtx();
  if (!c || !master) return;
  if (c.state !== "running") {
    // el audio aún se está activando (primer toque en móviles): suena en cuanto despierte
    void c
      .resume()
      .then(() => {
        if (c.state === "running") render(c, name, gain);
      })
      .catch(() => undefined);
    return;
  }
  render(c, name, gain);
}

function render(c: AudioContext, name: SoundName, gain: number) {
  const t = c.currentTime + 0.005;

  switch (name) {
    case "drop": // "plip" de gota
      tone(c, t, { f0: 520 + Math.random() * 120, f1: 1500, dur: 0.09, vol: 0.32 }, gain);
      tone(c, t, { f0: 900, f1: 1800, at: 0.05, dur: 0.06, vol: 0.1 }, gain);
      break;
    case "coin": // moneda clásica
      tone(c, t, { type: "square", f0: 988, dur: 0.08, vol: 0.09 }, gain);
      tone(c, t, { type: "square", f0: 1319, at: 0.075, dur: 0.28, vol: 0.09 }, gain);
      break;
    case "bite": // mordisco crujiente
      noise(c, t, { filter: "bandpass", f0: 1600, q: 1.4, dur: 0.05, vol: 0.55 }, gain);
      noise(c, t, { filter: "bandpass", f0: 1200, q: 1.4, at: 0.09, dur: 0.05, vol: 0.45 }, gain);
      tone(c, t, { type: "triangle", f0: 190, f1: 110, dur: 0.07, vol: 0.25 }, gain);
      break;
    case "bounce": // "boing"
      tone(c, t, { f0: 150, f1: 480, dur: 0.17, vol: 0.4 }, gain);
      tone(c, t, { type: "triangle", f0: 300, f1: 960, dur: 0.12, vol: 0.08 }, gain);
      break;
    case "squash": // aplastar bicho
      noise(c, t, { filter: "lowpass", f0: 1400, f1: 300, dur: 0.16, vol: 0.6 }, gain);
      tone(c, t, { f0: 220, f1: 50, dur: 0.2, vol: 0.4 }, gain);
      break;
    case "levelup": // arpegio de victoria
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(c, t, { type: "triangle", f0: f, at: i * 0.09, dur: i === 3 ? 0.45 : 0.16, vol: 0.22 }, gain)
      );
      tone(c, t, { type: "sine", f0: 1568, at: 0.36, dur: 0.4, vol: 0.08 }, gain);
      break;
    case "pop": // corazoncitos / caricia
      tone(c, t, { f0: 700 + Math.random() * 200, f1: 1250, dur: 0.07, vol: 0.18 }, gain);
      break;
    case "whoosh": // sombrilla
      noise(c, t, { filter: "bandpass", f0: 300, f1: 2600, q: 0.9, dur: 0.32, vol: 0.4 }, gain);
      break;
    case "scrub": // esponja
      noise(c, t, { filter: "highpass", f0: 2600, dur: 0.06, vol: 0.14 }, gain);
      tone(c, t, { f0: 1800 + Math.random() * 600, f1: 2600, at: 0.02, dur: 0.05, vol: 0.05 }, gain);
      break;
    case "tap":
      tone(c, t, { type: "triangle", f0: 660, f1: 880, dur: 0.06, vol: 0.14 }, gain);
      break;
    case "umbrellaOff": // la sombrilla se cierra: whoosh suave que baja
      noise(c, t, { filter: "bandpass", f0: 2200, f1: 350, q: 0.9, dur: 0.38, vol: 0.22 }, gain);
      tone(c, t, { type: "sine", f0: 620, f1: 300, dur: 0.32, vol: 0.08 }, gain);
      break;
    case "tab": // clic muy discreto al cambiar de pestaña
      tone(c, t, { type: "sine", f0: 980, f1: 760, dur: 0.045, vol: 0.07 }, gain);
      break;
    case "rain":
      noise(c, t, { filter: "highpass", f0: 1800, dur: 0.6, vol: 0.12 }, gain);
      break;
    case "correct": // ¡bien!
      tone(c, t, { type: "triangle", f0: 660, dur: 0.1, vol: 0.22 }, gain);
      tone(c, t, { type: "triangle", f0: 990, at: 0.09, dur: 0.22, vol: 0.22 }, gain);
      break;
    case "wrong": // error suave (no asusta)
      tone(c, t, { type: "square", f0: 220, f1: 140, dur: 0.22, vol: 0.08 }, gain);
      tone(c, t, { type: "sine", f0: 180, f1: 110, at: 0.02, dur: 0.25, vol: 0.18 }, gain);
      break;
    case "flip": // voltear carta
      noise(c, t, { filter: "bandpass", f0: 2400, f1: 900, q: 1.2, dur: 0.08, vol: 0.25 }, gain);
      break;
    case "beep": // cuenta regresiva
      tone(c, t, { type: "sine", f0: 784, dur: 0.12, vol: 0.2 }, gain);
      break;
    case "go":
      tone(c, t, { type: "sine", f0: 1175, dur: 0.3, vol: 0.22 }, gain);
      tone(c, t, { type: "triangle", f0: 1568, at: 0.02, dur: 0.25, vol: 0.06 }, gain);
      break;
  }
}
