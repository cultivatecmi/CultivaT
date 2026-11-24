import type { GameState } from "./types";
import { getSupabase } from "./supabase";

/**
 * Persistencia:
 *  - Siempre se guarda una copia en localStorage (funciona sin internet).
 *  - Si Supabase está configurado, se sincroniza con las funciones RPC
 *    `cultivat_login` y `cultivat_save` (ver supabase/schema.sql).
 */

const PREFIX = "cultivat:v1";
const SESSION_KEY = `${PREFIX}:session`;

export interface Session {
  nickname: string;
  /** PIN guardado solo en este dispositivo para poder sincronizar con la nube */
  pin: string | null;
  isDemo: boolean;
}

interface LocalProfile {
  pinHash: string;
  state: GameState;
}

export const nicknameKey = (nick: string) => nick.trim().toLowerCase();

/** Hash simple (no criptográfico) — solo protege el perfil local del dispositivo */
export function simpleHash(text: string) {
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const pinHashFor = (nick: string, pin: string) => simpleHash(`cultivat|${nicknameKey(nick)}|${pin}`);

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const profileKey = (nick: string) => `${PREFIX}:profile:${nicknameKey(nick)}`;

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

export function loadSession(): Session | null {
  const raw = safeGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    return typeof s.nickname === "string" ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  safeSet(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  safeRemove(SESSION_KEY);
}

// ---------------------------------------------------------------------------
// Perfil local
// ---------------------------------------------------------------------------

export function loadLocalProfile(nick: string): LocalProfile | null {
  const raw = safeGet(profileKey(nick));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export function saveLocalState(nick: string, state: GameState, pin?: string | null): boolean {
  const existing = loadLocalProfile(nick);
  const pinHash = pin ? pinHashFor(nick, pin) : existing?.pinHash ?? "";
  return safeSet(profileKey(nick), JSON.stringify({ pinHash, state } satisfies LocalProfile));
}

export type LoginResult =
  | { ok: true; state: GameState | null; created: boolean }
  | { ok: false; error: string };

export function localLogin(nick: string, pin: string): LoginResult {
  const profile = loadLocalProfile(nick);
  if (!profile) return { ok: true, state: null, created: true };
  if (profile.pinHash && profile.pinHash !== pinHashFor(nick, pin)) {
    return { ok: false, error: "PIN incorrecto. ¡Inténtalo otra vez!" };
  }
  return { ok: true, state: profile.state, created: false };
}

// ---------------------------------------------------------------------------
// Nube (Supabase)
// ---------------------------------------------------------------------------

interface RpcResponse {
  ok: boolean;
  error?: string;
  created?: boolean;
  state?: GameState | null;
}

export async function cloudLogin(nick: string, pin: string): Promise<LoginResult> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no configurado");
  const { data, error } = await sb.rpc("cultivat_login", { p_nickname: nick.trim(), p_pin: pin });
  if (error) throw error;
  const res = data as RpcResponse;
  if (!res?.ok) return { ok: false, error: res?.error ?? "No se pudo iniciar sesión" };
  const state = res.state && Object.keys(res.state).length ? res.state : null;
  return { ok: true, state, created: Boolean(res.created) };
}

export async function cloudSave(nick: string, pin: string, state: GameState): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data, error } = await sb.rpc("cultivat_save", {
    p_nickname: nick.trim(),
    p_pin: pin,
    p_state: state,
  });
  if (error) return false;
  return Boolean((data as RpcResponse)?.ok);
}
