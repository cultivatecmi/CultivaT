"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BoostStat, CareAction, CareResult, GameState, ItemCategory, TabId } from "@/lib/types";
import {
  addDirt as addDirtTo,
  addNotification,
  applyCare,
  applyDecay,
  boostStat,
  checkStreakOnLoad,
  cleanDirt as cleanDirtOf,
  createDemoState,
  createInitialState,
  isLadybugActive,
  LADYBUG_MS,
  LADYBUG_PRICE,
  currentWeek,
  deriveAlerts,
  makeNotification,
  openUmbrella as openUmbrellaOn,
  sanitizeState,
  setClimate as setClimateOn,
  withXp,
  type BoostResult,
} from "@/lib/game";
import {
  clearSession,
  cloudLogin,
  cloudSave,
  loadLocalProfile,
  loadSession,
  localLogin,
  saveLocalState,
  saveSession,
  type Session,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getItem } from "@/lib/shop";
import { getGame, type GameId } from "@/lib/games";
import { CLIMATES, pickNextClimate, randomClimateDelay, type Climate } from "@/lib/weather";
import { gameJoyBonus, markJoy } from "@/lib/joy";
import { getStage } from "@/lib/stages";
import { playSound, unlockAudio } from "@/lib/sound";
import { uid } from "@/lib/utils";

export type SyncStatus = "local" | "saving" | "saved" | "error" | "demo";

export interface Toast {
  id: string;
  text: string;
  tone: "success" | "info" | "warning" | "coins";
}

interface GameContextValue {
  hydrated: boolean;
  session: Session | null;
  state: GameState | null;
  now: number;
  syncStatus: SyncStatus;
  cloudEnabled: boolean;
  tab: TabId;
  setTab: (t: TabId) => void;
  toasts: Toast[];
  pushToast: (text: string, tone?: Toast["tone"]) => void;
  login: (nickname: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  startDemo: () => void;
  logout: () => void;
  care: (action: CareAction) => CareResult | null;
  /** Sube un medidor (herramientas táctiles, caricias, pelota) */
  boost: (stat: BoostStat, amount: number, care?: boolean) => { ok: boolean; full: boolean };
  openUmbrella: () => void;
  cleanDirt: () => { ok: boolean; full: boolean };
  addDirt: () => void;
  setClimate: (c: Climate) => void;
  cycleClimate: () => Climate | null;
  /** Modo Demo: avanza a la siguiente etapa de crecimiento (y vuelve a semilla al final) */
  growStage: () => void;
  reward: (coins: number, xp: number, reason: string) => void;
  /** Guarda el resultado de un minijuego, entrega monedas/XP y dice si es récord */
  recordGame: (game: GameId, result: { score: number; coins: number; xp: number; label: string }) => { newBest: boolean; happy: number };
  /** Baja un medidor sin pasar de un piso (p. ej. el pulgón chupando nutrientes) */
  drain: (stat: BoostStat, amount: number, floor: number) => void;
  recordTriviaRound: (correct: number) => void;
  buyItem: (id: string) => boolean;
  /** Compra la Catarina Guardiana (3 min); false si no alcanza o ya hay una */
  buyLadybug: () => boolean;
  equipItem: (id: string) => void;
  /** Guarda la foto del kit; la primera de cada semana da +50 🪙 y +30 XP */
  addPhoto: (image: string, note: string) => { coins: number; xp: number; first: boolean; week: number };
  deletePhoto: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  setPlantName: (name: string) => void;
  /** Cambia nombre visible o foto/emoji de perfil */
  updateProfile: (p: Partial<GameState["profile"]>) => void;
  enableBrowserNotifications: () => Promise<boolean>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame debe usarse dentro de <GameProvider>");
  return ctx;
}

/** Variante para pantallas que solo existen con sesión iniciada */
export function useGameState() {
  const ctx = useGame();
  if (!ctx.state) throw new Error("No hay partida cargada");
  return { ...ctx, state: ctx.state };
}

const TICK_MS = 2000;
const CLOUD_SYNC_MS = 5000;

/**
 * Prepara un estado recién cargado: cada sesión empieza con clima soleado,
 * desgaste offline suave + racha + alertas.
 */
function prepareLoaded(s: GameState, now: number) {
  const calm: GameState = { ...s, climate: "soleado", shadeUntil: 0 };
  return deriveAlerts(checkStreakOnLoad(applyDecay(calm, now, { floor: 12 }), now), now);
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [tab, setTab] = useState<TabId>("planta");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const stateRef = useRef<GameState | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const cloudDirty = useRef(false);
  const lastBrowserNotif = useRef<string | null>(null);

  sessionRef.current = session;

  // -------------------------------------------------------------------------
  // Utilidades internas
  // -------------------------------------------------------------------------

  const pushToast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    if (tone === "coins") playSound("coin");
  }, []);

  /** Festeja cuando la planta sube de etapa */
  const celebrate = useCallback(
    (stageUp?: string, streakUp?: number) => {
      if (streakUp) pushToast(`🔥 ¡Racha de ${streakUp} ${streakUp === 1 ? "día" : "días"}! +10 🪙`, "coins");
      if (stageUp) {
        pushToast(`🎉 ¡Tu planta ahora es ${stageUp}!`, "success");
        playSound("levelup");
      }
    },
    [pushToast]
  );

  /** Reemplaza el estado. `userAction` marca la partida para sincronizar con la nube. */
  const commit = useCallback((next: GameState, userAction = true) => {
    const value = userAction ? { ...next, updatedAt: Date.now() } : next;
    stateRef.current = value;
    setState(value);
    if (userAction) cloudDirty.current = true;
  }, []);

  /** Estado actual con el desgaste aplicado hasta este instante */
  const current = useCallback(() => {
    const s = stateRef.current;
    if (!s) return null;
    return applyDecay(s, Date.now());
  }, []);

  const saveLocalNow = useCallback(() => {
    const s = stateRef.current;
    const sess = sessionRef.current;
    if (!s || !sess) return true;
    return saveLocalState(sess.isDemo ? "demo" : sess.nickname, s, sess.pin);
  }, []);

  const syncCloudNow = useCallback(async () => {
    const s = stateRef.current;
    const sess = sessionRef.current;
    if (!s || !sess || sess.isDemo || !sess.pin || !isSupabaseConfigured) return;
    cloudDirty.current = false;
    setSyncStatus("saving");
    const ok = await cloudSave(sess.nickname, sess.pin, s).catch(() => false);
    setSyncStatus(ok ? "saved" : "error");
    if (!ok) cloudDirty.current = true;
  }, []);

  // -------------------------------------------------------------------------
  // Carga inicial
  // -------------------------------------------------------------------------

  useEffect(() => {
    const t = Date.now();
    const sess = loadSession();
    if (sess) {
      const profile = loadLocalProfile(sess.isDemo ? "demo" : sess.nickname);
      if (profile?.state) {
        const loaded = prepareLoaded(sanitizeState(profile.state, sess.nickname), t);
        stateRef.current = loaded;
        setState(loaded);
        setSession(sess);
        setSyncStatus(sess.isDemo ? "demo" : isSupabaseConfigured ? "saved" : "local");
      } else {
        clearSession();
      }
    }
    setHydrated(true);

    // el audio solo puede activarse tras un gesto del usuario
    // (Safari en iPhone solo acepta touchend/click como gesto válido; se escucha en fase de captura
    // para que ningún componente lo bloquee con stopPropagation)
    const unlock = () => unlockAudio();
    const events = ["touchend", "click", "pointerup", "keydown"] as const;
    events.forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, unlock, { capture: true }));
    };
  }, []);

  // -------------------------------------------------------------------------
  // Reloj del juego: desgaste + alertas automáticas
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      const t = Date.now();
      const next = deriveAlerts(applyDecay(s, t), t);
      commit(next, false);
      setNow(t);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [session, commit]);

  // Clima automático de Culiacán: cambia solo cada 35-45 s
  useEffect(() => {
    if (!session) return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        const s = stateRef.current;
        if (s) {
          const now = Date.now();
          const c = pickNextClimate(s.climate);
          commit(setClimateOn(applyDecay(s, now), c, now), false);
          setNow(now);
          if (c === "calor") {
            pushToast(`🔥 ¡Ola de calor en Culiacán! ${CLIMATES.calor.temp} °C · ¡Sombrilla ☂️ y agua 💧!`, "warning");
            playSound("whoosh");
          } else if (c === "lluvia") {
            pushToast(`🌧️ ¡Lluvia fresca! ${CLIMATES.lluvia.temp} °C · tu planta se riega sola`, "info");
            playSound("rain");
          } else if (c === "nublado") {
            pushToast(`⛅ Se nubló · ${CLIMATES.nublado.temp} °C · tu planta se refresca sola`, "info");
          }
        }
        schedule();
      }, randomClimateDelay());
    };
    schedule();
    return () => clearTimeout(t);
  }, [session, commit, pushToast]);

  // Notificación del navegador cuando llega una alerta y la app está en segundo plano
  useEffect(() => {
    const latest = state?.notifications[0];
    if (!latest || latest.id === lastBrowserNotif.current) return;
    const first = lastBrowserNotif.current === null;
    lastBrowserNotif.current = latest.id;
    if (first) return;
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.visibilityState === "hidden"
      ) {
        new Notification(latest.title, { body: latest.body, icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.png` });
      }
    } catch {
      /* algunos navegadores móviles no permiten new Notification() */
    }
  }, [state?.notifications]);

  // -------------------------------------------------------------------------
  // Persistencia
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!state || !session) return;
    const t = setTimeout(() => {
      const ok = saveLocalNow();
      if (!ok) setSyncStatus("error");
    }, 800);
    return () => clearTimeout(t);
  }, [state, session, saveLocalNow]);

  useEffect(() => {
    if (!session || session.isDemo || !isSupabaseConfigured) return;
    const id = setInterval(() => {
      if (cloudDirty.current) void syncCloudNow();
    }, CLOUD_SYNC_MS);
    const onHide = () => {
      saveLocalNow();
      if (document.visibilityState === "hidden" && cloudDirty.current) void syncCloudNow();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [session, syncCloudNow, saveLocalNow]);

  // -------------------------------------------------------------------------
  // Sesión
  // -------------------------------------------------------------------------

  const finishLogin = useCallback(
    (sess: Session, loaded: GameState, status: SyncStatus) => {
      const t = Date.now();
      const ready = prepareLoaded(loaded, t);
      stateRef.current = ready;
      lastBrowserNotif.current = null;
      setState(ready);
      setSession(sess);
      sessionRef.current = sess;
      saveSession(sess);
      saveLocalState(sess.isDemo ? "demo" : sess.nickname, ready, sess.pin);
      setSyncStatus(status);
      setTab("planta");
      setNow(t);
    },
    []
  );

  const login = useCallback(
    async (nicknameRaw: string, pin: string) => {
      const nickname = nicknameRaw.trim().replace(/\s+/g, " ");
      if (nickname.length < 2 || nickname.length > 16)
        return { ok: false, error: "Tu apodo debe tener de 2 a 16 letras." };
      if (!/^[\p{L}\p{N} _-]+$/u.test(nickname))
        return { ok: false, error: "Usa solo letras y números en tu apodo." };
      if (!/^\d{4}$/.test(pin)) return { ok: false, error: "El PIN debe tener 4 números." };
      if (nickname.toLowerCase() === "demo") return { ok: false, error: "Ese apodo está reservado. ¡Elige otro!" };

      const sess: Session = { nickname, pin, isDemo: false };

      if (isSupabaseConfigured) {
        try {
          const res = await cloudLogin(nickname, pin);
          if (!res.ok) return { ok: false, error: res.error };
          const local = loadLocalProfile(nickname)?.state;
          const cloud = res.state ? sanitizeState(res.state, nickname) : null;
          const localS = local ? sanitizeState(local, nickname) : null;
          let chosen = cloud ?? localS ?? createInitialState(nickname);
          if (cloud && localS && localS.updatedAt > cloud.updatedAt) chosen = localS;
          finishLogin(sess, chosen, "saved");
          cloudDirty.current = res.created || chosen === localS;
          pushToast(res.created ? `¡Bienvenido, ${nickname}! ☁️ Cuenta creada` : `¡Hola de nuevo, ${nickname}! ☁️`, "success");
          return { ok: true };
        } catch {
          pushToast("Sin conexión a la nube: guardando en este dispositivo 📱", "warning");
          // continúa con el modo local
        }
      }

      const res = localLogin(nickname, pin);
      if (!res.ok) return { ok: false, error: res.error };
      const st = res.state ? sanitizeState(res.state, nickname) : createInitialState(nickname);
      finishLogin(sess, st, isSupabaseConfigured ? "error" : "local");
      pushToast(res.created ? `¡Bienvenido, ${nickname}! 🌱` : `¡Hola de nuevo, ${nickname}! 🌱`, "success");
      return { ok: true };
    },
    [finishLogin, pushToast]
  );

  const startDemo = useCallback(() => {
    finishLogin({ nickname: "Demo", pin: null, isDemo: true }, createDemoState(), "demo");
    pushToast("Modo Demo Presentación activado 🎬", "info");
  }, [finishLogin, pushToast]);

  const logout = useCallback(() => {
    saveLocalNow();
    if (cloudDirty.current) void syncCloudNow();
    clearSession();
    stateRef.current = null;
    setState(null);
    setSession(null);
    setTab("planta");
  }, [saveLocalNow, syncCloudNow]);

  // -------------------------------------------------------------------------
  // Acciones de juego
  // -------------------------------------------------------------------------

  const care = useCallback(
    (action: CareAction) => {
      const s = current();
      if (!s) return null;
      const { state: next, result } = applyCare(s, action, Date.now());
      if (!result.ok) {
        pushToast(result.message, "warning");
        return result;
      }
      commit(next);
      setNow(Date.now());
      celebrate(result.stageUp, result.streakUp);
      return result;
    },
    [current, commit, pushToast, celebrate]
  );

  /** Aplica el resultado de una herramienta y festeja si corresponde */
  const applyBoost = useCallback(
    (r: BoostResult) => {
      if (r.ok) {
        commit(r.state);
        setNow(Date.now());
        celebrate(r.stageUp, r.streakUp);
      }
      return { ok: r.ok, full: r.full };
    },
    [commit, celebrate]
  );

  const boost = useCallback(
    (stat: BoostStat, amount: number, isCare = true) => {
      const s = current();
      if (!s) return { ok: false, full: false };
      return applyBoost(boostStat(s, stat, amount, isCare, Date.now()));
    },
    [current, applyBoost]
  );

  const openUmbrella = useCallback(() => {
    const s = current();
    if (s) applyBoost(openUmbrellaOn(s, Date.now()));
  }, [current, applyBoost]);

  const cleanDirt = useCallback(() => {
    const s = current();
    if (!s) return { ok: false, full: true };
    return applyBoost(cleanDirtOf(s, Date.now()));
  }, [current, applyBoost]);

  const addDirt = useCallback(() => {
    const s = current();
    if (s) commit(addDirtTo(s), false);
  }, [current, commit]);

  const setClimate = useCallback(
    (c: Climate) => {
      const s = current();
      if (!s) return;
      commit(setClimateOn(s, c, Date.now()));
      setNow(Date.now());
    },
    [current, commit]
  );

  const cycleClimate = useCallback(() => {
    const s = current();
    if (!s) return null;
    const c = pickNextClimate(s.climate);
    commit(setClimateOn(s, c, Date.now()));
    setNow(Date.now());
    return c;
  }, [current, commit]);

  const growStage = useCallback(() => {
    const s = current();
    if (!s) return;
    const st = getStage(s.xp);
    if (st.next) {
      const x = withXp(s, st.next.minXp - s.xp);
      commit(x.state);
      celebrate(x.stageUp);
    } else {
      commit({ ...s, xp: 0 });
      pushToast("🌱 ¡De vuelta a germinar! (demo)", "info");
    }
    setNow(Date.now());
  }, [current, commit, celebrate, pushToast]);

  const reward = useCallback(
    (coins: number, xp: number, reason: string) => {
      const s = current();
      if (!s) return;
      const x = withXp({ ...s, coins: s.coins + Math.max(0, coins) }, xp);
      commit(x.state);
      if (coins > 0) pushToast(`+${coins} 🪙 ${reason}`, "coins");
      celebrate(x.stageUp);
    },
    [current, commit, pushToast, celebrate]
  );

  const recordGame = useCallback(
    (game: GameId, r: { score: number; coins: number; xp: number; label: string }) => {
      const s = current();
      if (!s) return { newBest: false, happy: 0 };
      const lower = getGame(game).lowerIsBetter;
      // jugar es lo único que sube la felicidad de la planta
      const before = s.happy;
      const happyAfter = Math.min(100, before + gameJoyBonus());
      const happy = Math.round(happyAfter - before);
      const prev = s.stats.best[game];
      const newBest = prev === undefined || (lower ? r.score < prev : r.score > prev);
      const base: GameState = {
        ...s,
        happy: happyAfter,
        coins: s.coins + Math.max(0, r.coins),
        stats: {
          ...s.stats,
          gamesPlayed: s.stats.gamesPlayed + 1,
          bestScore: game === "lluvia" ? Math.max(s.stats.bestScore, r.score) : s.stats.bestScore,
          best: { ...s.stats.best, [game]: newBest ? r.score : prev },
        },
      };
      const x = withXp(base, Math.max(0, r.xp));
      commit(x.state);
      if (r.coins > 0) pushToast(`+${r.coins} 🪙 ${r.label}`, "coins");
      celebrate(x.stageUp);
      if (happy > 0) markJoy(happy);
      return { newBest, happy };
    },
    [current, commit, pushToast, celebrate]
  );

  const drain = useCallback(
    (stat: BoostStat, amount: number, floor: number) => {
      const s = current();
      if (!s || s[stat] <= floor) return;
      commit({ ...s, [stat]: Math.max(floor, s[stat] - amount) }, false);
      setNow(Date.now());
    },
    [current, commit]
  );

  const recordTriviaRound = useCallback(
    (correct: number) => {
      const s = current();
      if (!s) return;
      commit({
        ...s,
        stats: { ...s.stats, triviaPlayed: s.stats.triviaPlayed + 1, triviaCorrect: s.stats.triviaCorrect + correct },
      });
    },
    [current, commit]
  );

  const equipOn = (s: GameState, id: string): GameState => {
    const item = getItem(id);
    if (!item) return s;
    const cat: ItemCategory = item.category;
    if (cat === "accessory") {
      return { ...s, equipped: { ...s.equipped, accessory: s.equipped.accessory === id ? null : id } };
    }
    return { ...s, equipped: { ...s.equipped, [cat]: id } };
  };

  const buyLadybug = useCallback(() => {
    const s = current();
    if (!s) return false;
    const now = Date.now();
    if (isLadybugActive(s, now)) {
      pushToast("🐞 Ya tienes una catarina cuidando tu planta", "info");
      return false;
    }
    if (s.coins < LADYBUG_PRICE) {
      pushToast(`Te faltan ${LADYBUG_PRICE - s.coins} 🪙. ¡Juega para ganar más!`, "warning");
      return false;
    }
    commit({ ...s, coins: s.coins - LADYBUG_PRICE, ladybugUntil: now + LADYBUG_MS });
    setNow(now);
    playSound("coin");
    pushToast("🐞 ¡Catarina Guardiana activada por 3 minutos!", "success");
    return true;
  }, [current, commit, pushToast]);

  const buyItem = useCallback(
    (id: string) => {
      const s = current();
      const item = getItem(id);
      if (!s || !item) return false;
      if (s.owned.includes(id)) {
        commit(equipOn(s, id));
        return true;
      }
      if (s.coins < item.price) {
        pushToast(`Te faltan ${item.price - s.coins} 🪙. ¡Juega para ganar más!`, "warning");
        return false;
      }
      const bought: GameState = {
        ...s,
        coins: s.coins - item.price,
        owned: [...s.owned, id],
        notifications: addNotification(
          s.notifications,
          makeNotification("reward", `🛍️ ¡Nuevo: ${item.name}!`, "Ya lo tienes puesto en tu planta.")
        ),
      };
      commit(equipOn(bought, id));
      pushToast(`¡Compraste ${item.emoji} ${item.name}!`, "success");
      return true;
    },
    [current, commit, pushToast]
  );

  const equipItem = useCallback(
    (id: string) => {
      const s = current();
      if (!s || !s.owned.includes(id)) return;
      commit(equipOn(s, id));
    },
    [current, commit]
  );

  const addPhoto = useCallback(
    (image: string, note: string) => {
      const s = current();
      if (!s) return { coins: 0, xp: 0, first: false, week: 1 };
      const t = Date.now();
      const week = currentWeek(s, t);
      const first = !s.photos.some((p) => p.week === week);
      const coins = first ? 50 : 5;
      const xp = first ? 30 : 3;
      const withPhoto: GameState = {
        ...s,
        coins: s.coins + coins,
        photos: [{ id: uid(), date: new Date(t).toISOString(), week, image, note: note.trim().slice(0, 140) }, ...s.photos],
        notifications: s.notifications.map((n) => (n.type === "photo" ? { ...n, read: true } : n)),
      };
      const x = withXp(withPhoto, xp);
      commit(x.state);
      pushToast(first ? `📸 ¡Semana ${week} verificada! +${coins} 🪙` : `📸 Foto extra guardada +${coins} 🪙`, "coins");
      celebrate(x.stageUp);
      return { coins, xp, first, week };
    },
    [current, commit, pushToast, celebrate]
  );

  const deletePhoto = useCallback(
    (id: string) => {
      const s = current();
      if (!s) return;
      commit({ ...s, photos: s.photos.filter((p) => p.id !== id) });
    },
    [current, commit]
  );

  const markAllRead = useCallback(() => {
    const s = current();
    if (!s || s.notifications.every((n) => n.read)) return;
    commit({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) });
  }, [current, commit]);

  const clearNotifications = useCallback(() => {
    const s = current();
    if (!s) return;
    commit({ ...s, notifications: [] });
  }, [current, commit]);

  const updateProfile = useCallback(
    (p: Partial<GameState["profile"]>) => {
      const s = current();
      if (!s) return;
      const next = { ...s.profile, ...p };
      next.displayName = (next.displayName || s.nickname).slice(0, 20);
      commit({ ...s, profile: next });
    },
    [current, commit]
  );

  const setPlantName = useCallback(
    (name: string) => {
      const s = current();
      const clean = name.trim().slice(0, 14);
      if (!s || !clean) return;
      commit({ ...s, plantName: clean });
    },
    [current, commit]
  );

  const enableBrowserNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") {
      pushToast("Tu navegador no permite notificaciones 😕", "warning");
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      pushToast("🔔 ¡Recordatorios activados!", "success");
      return true;
    }
    pushToast("No se activaron los recordatorios", "warning");
    return false;
  }, [pushToast]);

  const value = useMemo<GameContextValue>(
    () => ({
      hydrated,
      session,
      state,
      now,
      syncStatus,
      cloudEnabled: isSupabaseConfigured,
      tab,
      setTab,
      toasts,
      pushToast,
      login,
      startDemo,
      logout,
      care,
      boost,
      openUmbrella,
      cleanDirt,
      addDirt,
      setClimate,
      cycleClimate,
      growStage,
      reward,
      recordGame,
      recordTriviaRound,
      drain,
      buyItem,
      buyLadybug,
      equipItem,
      addPhoto,
      deletePhoto,
      markAllRead,
      clearNotifications,
      setPlantName,
      updateProfile,
      enableBrowserNotifications,
    }),
    [
      hydrated, session, state, now, syncStatus, tab, toasts, pushToast, login, startDemo, logout,
      care, boost, openUmbrella, cleanDirt, addDirt, setClimate, cycleClimate, growStage, reward, recordGame, recordTriviaRound, drain, buyItem, buyLadybug, equipItem, addPhoto, deletePhoto,
      markAllRead, clearNotifications, setPlantName, updateProfile, enableBrowserNotifications,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
