export const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Fecha local en formato YYYY-MM-DD */
export function dateKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(now: Date = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** minúsculas, sin acentos ni signos */
export function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function timeAgo(ms: number, now = Date.now()) {
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}
