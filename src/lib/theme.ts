/** Modo oscuro: preferencia por dispositivo (clase "dark" en <html>) */

export const THEME_KEY = "cultivat:v1:theme";

const listeners = new Set<() => void>();

export function isDark() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function setDark(value: boolean) {
  document.documentElement.classList.toggle("dark", value);
  try {
    window.localStorage.setItem(THEME_KEY, value ? "dark" : "light");
  } catch {
    /* sin almacenamiento */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", value ? "#14201A" : "#15803D");
  listeners.forEach((l) => l());
}

export function subscribeTheme(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** se ejecuta en <head> antes de pintar para evitar parpadeo */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;
