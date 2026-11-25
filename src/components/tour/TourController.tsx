"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { Logo } from "@/components/brand/Logo";
import { setTourActive, tourEmit, tourHint } from "@/lib/tour";
import { demoPhotoDataUrl } from "@/lib/demo-photos";
import { SABI_SUGGESTIONS } from "@/lib/sabi";
import type { Session } from "@/lib/storage";

/**
 * 🎬 Modo Presentación Automática: recorrido guiado de 3 minutos (180 s)
 * para grabar un video. Se activa con ?demo=true o tocando 5 veces el logo.
 * Maneja la app como lo haría un niño (toques y deslizadas simuladas) y muestra subtítulos.
 */

const TOUR_SECONDS = 180;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(document.querySelectorAll<T>(sel));
const buttonWithText = (text: string, exact = false) =>
  $$<HTMLButtonElement>("button").find((b) => {
    const t = b.innerText.replace(/\s+/g, " ").trim();
    return exact ? t === text : t.includes(text);
  }) ?? null;

async function waitFor<T>(fn: () => T | null | undefined, timeout = 4000): Promise<T | null> {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    const v = fn();
    if (v) return v;
    await sleep(80);
  }
  return null;
}

function pointer(el: Element, type: string, x: number, y: number, kind: "touch" | "mouse" = "touch") {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 77,
      pointerType: kind,
      isPrimary: true,
      buttons: type === "pointerup" ? 0 : 1,
    })
  );
}

class Cancelled extends Error {}

export function TourController() {
  const game = useGame();
  const gameRef = useRef(game);
  gameRef.current = game;

  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const runId = useRef(0);
  const prevSession = useRef<Session | null>(null);
  const runningRef = useRef(false);

  const stop = useCallback(async () => {
    runId.current++;
    runningRef.current = false;
    setTourActive(false);
    setRunning(false);
    setFinished(false);
    setCaption(null);
    setClosing(false);
    $$(".tour-focus").forEach((e) => e.classList.remove("tour-focus"));
    const g = gameRef.current;
    const prev = prevSession.current;
    prevSession.current = null;
    // vuelve a como estaba: el perfil del niño (si había uno) o la bienvenida
    g.logout();
    if (prev && !prev.isDemo && prev.pin) await g.login(prev.nickname, prev.pin);
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    const id = ++runId.current;
    const g0 = gameRef.current;
    prevSession.current = g0.session && !g0.session.isDemo ? g0.session : null;
    setTourActive(true);
    setRunning(true);
    setFinished(false);
    setClosing(false);
    setCaption(null);

    const t0 = performance.now();
    const alive = () => {
      if (runId.current !== id) throw new Cancelled();
    };
    const at = async (sec: number) => {
      alive();
      const wait = t0 + sec * 1000 - performance.now();
      if (wait > 0) await sleep(wait);
      alive();
    };
    const say = (text: string) => setCaption(text);
    const g = () => gameRef.current;
    const tab = (t: Parameters<typeof game.setTab>[0]) => g().setTab(t);

    // ------------------------------------------------- minijuegos automáticos
    const openGame = async (name: string) => {
      tab("jugar");
      const card = await waitFor(() => $<HTMLElement>(`[aria-label="Jugar ${name}"]`));
      card?.click();
      const play = await waitFor(() => buttonWithText("¡Jugar!", true));
      play?.click();
      await sleep(250);
      focusGame();
      await sleep(650); // cuenta regresiva corta del tour
    };
    const center = (el: Element | null | undefined) => el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const focusGame = () => center($("canvas") ?? $(".grid-cols-4") ?? $("button[aria-label^='Maceta'], button[aria-label*=' en la maceta']"));
    const backToGames = () => buttonWithText("Juegos", true)?.click();
    const canvasBox = () => {
      const c = $("canvas");
      return c ? { c, r: c.getBoundingClientRect() } : null;
    };
    const playFor = async (ms: number, tick: (t: number) => void | Promise<void>, every = 90) => {
      const end = performance.now() + ms;
      while (performance.now() < end) {
        alive();
        await tick(performance.now());
        await sleep(every);
      }
    };

    const clipRain = async (ms: number) => {
      await openGame("Atrapa la Lluvia");
      const b = canvasBox();
      if (!b) return;
      await playFor(ms, (t) => {
        const x = b.r.left + b.r.width / 2 + Math.sin(t / 420) * b.r.width * 0.38;
        pointer(b.c, "pointermove", x, b.r.top + b.r.height - 40, "mouse");
      });
    };
    const clipWhack = async (ms: number) => {
      await openGame("Aplasta Plagas");
      await playFor(
        ms,
        () => {
          $$("button[aria-label]")
            .filter((el) => /^(gusano|pulgon) en la maceta/.test(el.getAttribute("aria-label") ?? ""))
            .slice(0, 1)
            .forEach((el) => {
              const r = el.getBoundingClientRect();
              pointer(el, "pointerdown", r.left + r.width / 2, r.top + r.height / 2);
            });
        },
        260
      );
    };
    const clipMemory = async (ms: number) => {
      await openGame("Memorama Botánico");
      const nameOf = (b: HTMLElement) => b.querySelector(".card-front span:nth-child(2)")?.textContent ?? "";
      await playFor(
        ms,
        async () => {
          const closed = $$<HTMLButtonElement>("button[aria-label^='Carta ']");
          if (closed.length < 2) return;
          const a = closed[0];
          const pair = closed.slice(1).find((c) => nameOf(c) === nameOf(a));
          if (!pair) return;
          a.click();
          await sleep(260);
          pair.click();
          await sleep(380);
        },
        60
      );
    };
    const clipTrivia = async (ms: number) => {
      await openGame("Trivia del Campo");
      await playFor(
        ms,
        () => {
          const right = $<HTMLButtonElement>("button[data-tour-correct='1']:not([disabled])");
          if (right) {
            center(right);
            right.click();
          }
          else buttonWithText("Siguiente")?.click();
        },
        900
      );
    };
    const clipRoots = async (ms: number) => {
      await openGame("Laberinto de Raíces");
      const b = canvasBox();
      if (!b) return;
      const cx = b.r.left + b.r.width / 2;
      pointer(b.c, "pointerdown", cx, b.r.top + 150);
      await playFor(ms, (t) => {
        const k = (t % 6000) / 6000;
        const x = cx + Math.sin(k * Math.PI * 4) * b.r.width * 0.3;
        const y = b.r.top + 160 + k * (b.r.height - 190);
        pointer(b.c, "pointermove", x, y);
      });
      pointer(b.c, "pointerup", cx, b.r.top + 150);
    };
    const clipBee = async (ms: number) => {
      await openGame("Vuelo de Polinización");
      const b = canvasBox();
      if (!b) return;
      const x = b.r.left + b.r.width / 2;
      let y = 175;
      pointer(b.c, "pointerdown", x, b.r.top + y);
      await playFor(ms, () => {
        const target = tourHint.beeY ?? 175;
        y += (target - y) * 0.35;
        pointer(b.c, "pointermove", x, b.r.top + y + (Math.random() - 0.5) * 2);
      }, 60);
      pointer(b.c, "pointerup", x, b.r.top + 175); // la abeja baja y termina: tarjeta de resultados
      const done = await waitFor(() => buttonWithText("Otra vez"), 4000);
      center(done);
    };

    // ------------------------------------------------- foto del kit real
    const scanKit = async () => {
      const input = await waitFor(() => $<HTMLInputElement>("input[type=file]"));
      if (!input) return;
      const blob = await (await fetch(demoPhotoDataUrl(4))).blob();
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "kit-semana-4.svg", { type: blob.type || "image/svg+xml" }));
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      const scan = await waitFor(() => buttonWithText("Escanear y guardar"));
      center(scan);
      await sleep(900);
      scan?.click();
      await sleep(200);
      center($(".scan-grid"));
    };
    const showKitResult = () => center($$("span").find((el) => /^\+\d+ XP$/.test(el.innerText.trim())));

    try {
      // 0:00 – 0:20 · Splash, contadores diarios y 21 días de crecimiento
      tourEmit("splash");
      g().startDemo();
      await at(2);
      say("🌱 CultivaT: cuida tu planta virtual y tu kit de cultivo real");
      await at(4);
      tab("jugar");
      say("📅 Crece al ritmo de una planta real: máximo 100 XP y 80 monedas por día");
      await at(7.8);
      tab("planta");
      g().tourPatch({ xp: 0, water: 85, fresh: 85, nutrients: 85, happy: 85, climate: "soleado", dirt: 0 });
      say("🌰 Día 1: Semilla");
      await at(10.5);
      g().growStage();
      say("🌱 Día 5: Brote");
      await at(13.5);
      g().growStage();
      say("🌿 Día 12: Planta Joven");
      await at(16.5);
      g().growStage();
      say("🌻 Día 21: ¡Planta Floreciendo! En 3 semanas, como la planta del kit");

      // 0:20 – 0:55 · Clima dinámico de Culiacán
      await at(20);
      g().setClimate("soleado");
      say("☀️ El clima de Culiacán cambia solo: Soleado, 26 °C");
      await at(26);
      g().tourPatch({ fresh: 55 });
      g().setClimate("calor");
      say("🔥 ¡Ola de calor de 42 °C! El agua y la frescura bajan rápido");
      await at(31);
      g().openUmbrella();
      say("☂️ La sombrilla la protege del sol y la refresca");
      await at(38);
      g().setClimate("nublado");
      say("⛅ Nublado, 23 °C: la frescura se recupera sola");
      await at(45);
      g().tourPatch({ water: 35, fresh: 45 });
      g().setClimate("lluvia");
      say("🌧️ Lluvia, 19 °C: la planta se riega y se refresca sola");

      // 0:55 – 1:25 · Pulgones y Catarina Guardiana
      await at(55);
      g().setClimate("soleado");
      g().tourPatch({ nutrients: 70 });
      tourEmit("aphid");
      say("🪲 ¡Un pulgón! Le roba nutrientes a la planta: -1 % por segundo");
      await at(62);
      tourEmit("ladybugOpen");
      say("🐞 La Catarina Guardiana: aliada natural por 35 monedas");
      await at(67);
      tourEmit("ladybugConfirm");
      say("🐞 Patrulla las hojas 3 minutos y se come los pulgones sin químicos");
      await at(70);
      tourEmit("aphid");
      await at(76);
      tourEmit("aphid");
      say("✨ ¡Control biológico! Así cuidan los agricultores sus cultivos");

      // 1:25 – 2:10 · Los 6 minijuegos
      await at(85);
      tab("jugar");
      say("🎮 6 minijuegos para aprender jugando");
      await at(87);
      say("🌧️ Atrapa la Lluvia: junta agua y abono, esquiva rayos UV");
      await clipRain(4800);
      backToGames();
      await at(94);
      say("🐛 Aplasta Plagas: toca a las plagas, cuida a las catarinas");
      await clipWhack(4800);
      backToGames();
      await at(101);
      say("🃏 Memorama Botánico: cultivos de Sinaloa");
      await clipMemory(4800);
      backToGames();
      await at(108);
      say("🧠 Trivia del Campo: preguntas relámpago");
      await clipTrivia(4800);
      backToGames();
      await at(115);
      say("🌱 Laberinto de Raíces: la raíz busca agua y minerales");
      await clipRoots(3800);
      backToGames();
      await at(120.5);
      g().tourPatch({ happy: 70 });
      say("🐝 Vuelo de Polinización: de flor en flor, sin tocar el suelo");
      await clipBee(4000);
      await at(127);
      say("🏆 Cada partida da monedas, XP y +20 % de felicidad");

      // 2:10 – 2:35 · Conexión phygital: Mi Kit
      await at(130.5);
      tab("kit");
      say("📸 Mi Kit: la foto semanal de la planta real");
      await at(134);
      await scanKit();
      say("🔍 Escaneo botánico de la planta del kit…");
      await at(139);
      showKitResult();
      say("✅ ¡Semana verificada! +50 monedas por cuidar la planta real");
      await at(148);
      center(buttonWithText("Antes") ?? $$("h3, h2").find((h) => h.textContent?.includes("Antes")) ?? null);
      say("🪴 La línea de tiempo muestra cómo crece semana a semana");

      // 2:35 – 2:50 · Tienda, Sabi y Configuración
      await at(155);
      tab("tienda");
      say("🛍️ Tienda: macetas, accesorios y escenarios");
      for (const i of [1, 2, 3]) {
        await sleep(1200);
        const item = $$<HTMLButtonElement>("button").filter((b) => b.className.includes("h-28"))[i];
        center(item);
        item?.click();
      }
      await at(160);
      tab("sabi");
      say("🌻 Sabi, la guía que responde dudas del campo");
      await sleep(900);
      buttonWithText(SABI_SUGGESTIONS[0])?.click();
      await at(165);
      $<HTMLButtonElement>("[aria-label='Configuración y perfil']")?.click();
      say("⚙️ Configuración: sonido, modo oscuro y perfil sin datos personales");
      const sw = await waitFor(() => $("[role=switch][aria-label='Sonidos']") ?? $$("[role=switch]")[0] ?? null, 1500);
      sw?.classList.add("tour-focus");
      await at(169.5);
      sw?.classList.remove("tour-focus");
      $<HTMLButtonElement>("[role=dialog][aria-label='Configuración'] [aria-label='Cerrar']")?.click();

      // 2:50 – 3:00 · Cierre de marca
      await at(170);
      tab("planta");
      g().tourPatch({ water: 100, fresh: 100, nutrients: 100, happy: 100, climate: "soleado", dirt: 0 });
      say("💚 Lista para cuidar la naturaleza de Culiacán");
      await at(172.5);
      setCaption(null);
      setClosing(true);
      await at(TOUR_SECONDS);
      setFinished(true);
    } catch (e) {
      if (!(e instanceof Cancelled)) console.error(e);
    }
  }, []);

  // reloj de la barra de progreso
  useEffect(() => {
    if (!running || finished) return;
    const t0 = performance.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed((performance.now() - t0) / 1000), 250);
    return () => clearInterval(t);
  }, [running, finished]);

  // ?demo=true en la dirección
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !game.hydrated) return;
    autoStarted.current = true;
    if (new URLSearchParams(window.location.search).get("demo") === "true") void start();
  }, [game.hydrated, start]);

  // 5 toques seguidos en el logo
  useEffect(() => {
    let taps: number[] = [];
    const onTap = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-cultivat-logo]")) return;
      const now = performance.now();
      taps = [...taps.filter((t) => now - t < 2500), now];
      if (taps.length >= 5) {
        taps = [];
        void start();
      }
    };
    document.addEventListener("click", onTap);
    return () => document.removeEventListener("click", onTap);
  }, [start]);

  // al salir de la página no se queda activo
  useEffect(() => () => setTourActive(false), []);

  // mientras corre, la app se recorre hacia abajo para dejar lugar a la franja del tour
  useEffect(() => {
    document.documentElement.classList.toggle("tour-on", running);
    return () => document.documentElement.classList.remove("tour-on");
  }, [running]);

  const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

  if (!running) return null;

  return (
    <>
      {/* franja del recorrido: progreso, tiempo y salir */}
      <div className="fixed inset-x-0 top-0 z-[310] mx-auto flex h-[26px] max-w-[430px] items-center gap-2 bg-[#14532D] px-2.5 font-display text-[11px] font-semibold text-white">
        <span className="shrink-0">🎬 Presentación</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-[#4ADE80] transition-[width] duration-300" style={{ width: `${Math.min(100, (elapsed / TOUR_SECONDS) * 100)}%` }} />
        </div>
        <span className="shrink-0 tabular-nums">
          {mmss(finished ? TOUR_SECONDS : elapsed)} / {mmss(TOUR_SECONDS)}
        </span>
        <button type="button" onClick={() => void stop()} className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 active:scale-95">
          ⏹ Salir del Tour
        </button>
      </div>

      {caption && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[305] mx-auto flex max-w-[430px] justify-center px-4">
          <p key={caption} className="anim-pop rounded-full bg-[#14532D]/90 px-4 py-2 text-center font-display text-[15px] font-semibold leading-snug text-white shadow-xl backdrop-blur-sm">
            {caption}
          </p>
        </div>
      )}

      {closing && (
        <div className="fixed inset-0 z-[300] mx-auto grid max-w-[430px] place-items-center bg-[#FFFBEB]/80 px-8 backdrop-blur-sm">
          <div className="anim-pop flex w-full flex-col items-center gap-3 rounded-[32px] bg-[#FFFBEB] p-6 text-center shadow-2xl ring-1 ring-[#E8E2D2]">
            <Logo priority className="h-auto w-[min(70vw,240px)]" />
            <p className="font-display text-xl font-semibold text-[#15803D]">Cuida tu planta, cultiva tu futuro</p>
            <p className="text-sm text-[#78350F]">Kit de cultivo + app educativa · Culiacán, Sinaloa</p>
            <p className="font-display text-sm font-semibold text-[#92400E]">cultivatecmi.github.io/CultivaT</p>
            {finished && (
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void stop().then(() => start());
                  }}
                  className="rounded-2xl border-b-4 border-[#15803D] bg-[#16A34A] px-4 py-2 font-display font-semibold text-white"
                >
                  ↻ Repetir
                </button>
                <button type="button" onClick={() => void stop()} className="rounded-2xl bg-white px-4 py-2 font-display font-semibold text-[#3E2C23] shadow">
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
