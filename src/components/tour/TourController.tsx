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

    /** juega bien `good` ms y luego se equivoca `bad` ms, cambiando el subtítulo */
    const clip = async (
      name: string,
      texts: [string, string],
      good: number,
      bad: number,
      tick: (mode: "good" | "bad", t: number) => void | Promise<void>,
      every = 60
    ) => {
      await openGame(name);
      say(texts[0]);
      await playFor(good, (t) => tick("good", t), every);
      say(texts[1]);
      await playFor(bad, (t) => tick("bad", t), every);
    };

    const clipRain = (good: number, bad: number) => {
      let b: ReturnType<typeof canvasBox> = null;
      return clip(
        "Atrapa la Lluvia",
        ["🌧️ Atrapa la Lluvia: mueve tu planta para juntar agua y abono", "❌ Si atrapas rayos UV o plagas, ¡pierdes puntos!"],
        good,
        bad,
        (mode) => {
          b = canvasBox();
          if (!b) return;
          const tx = mode === "good" ? tourHint.rainGoodX : tourHint.rainBadX;
          const x = b.r.left + (tx ?? b.r.width / 2);
          pointer(b.c, "pointermove", x, b.r.top + b.r.height - 40, "mouse");
        },
        50
      );
    };
    const clipWhack = (good: number, bad: number) =>
      clip(
        "Aplasta Plagas",
        ["🐛 Aplasta Plagas: toca a los gusanos y pulgones", "❌ ¡Cuidado! Las catarinas son amigas: tocarlas resta puntos"],
        good,
        bad,
        (mode) => {
          const re = mode === "good" ? /^(gusano|pulgon) en la maceta/ : /^catarina en la maceta/;
          const el = $$("button[aria-label]").find((e) => re.test(e.getAttribute("aria-label") ?? ""));
          if (!el) return;
          const r = el.getBoundingClientRect();
          pointer(el, "pointerdown", r.left + r.width / 2, r.top + r.height / 2);
        },
        280
      );
    const clipMemory = (good: number, bad: number) => {
      const nameOf = (b: HTMLElement) => b.querySelector(".card-front span:nth-child(2)")?.textContent ?? "";
      return clip(
        "Memorama Botánico",
        ["🃏 Memorama: encuentra los pares de cultivos de Sinaloa", "❌ Si no son iguales, las cartas se voltean otra vez"],
        good,
        bad,
        async (mode) => {
          const closed = $$<HTMLButtonElement>("button[aria-label^='Carta ']");
          if (closed.length < 2 || (mode === "good" && closed.length <= 6)) return;
          const a = closed[0];
          const other = mode === "good" ? closed.slice(1).find((c) => nameOf(c) === nameOf(a)) : closed.slice(1).find((c) => nameOf(c) !== nameOf(a));
          if (!other) return;
          a.click();
          await sleep(300);
          other.click();
          await sleep(mode === "good" ? 420 : 1000);
        },
        60
      );
    };
    const clipTrivia = (good: number, bad: number) =>
      clip(
        "Trivia del Campo",
        ["🧠 Trivia: preguntas relámpago, ¡cada acierto da monedas!", "❌ Si fallas, te enseña la respuesta correcta"],
        good,
        bad,
        (mode) => {
          const options = $$<HTMLButtonElement>("button:not([disabled])").filter((b) => /^[ABCD]\s/.test(b.innerText.trim()));
          const pick = mode === "good" ? options.find((b) => b.dataset.tourCorrect === "1") : options.find((b) => b.dataset.tourCorrect !== "1");
          if (pick) {
            center(pick);
            pick.click();
          } else buttonWithText("Siguiente")?.click();
        },
        1200
      );
    const clipRoots = (good: number, bad: number) => {
      let b: ReturnType<typeof canvasBox> = null;
      let down = false;
      tourHint.rootGood = null;
      return clip(
        "Laberinto de Raíces",
        ["🌱 Laberinto: guía la raíz hacia el agua y los minerales", "❌ Las piedras y las larvas de gallina ciega la detienen"],
        good,
        bad,
        (mode) => {
          b = canvasBox();
          if (!b) return;
          if (!down && !tourHint.rootGood) return; // el juego aún no empieza
          const target = mode === "good" ? tourHint.rootGood : tourHint.rootBad;
          const x = b.r.left + (target?.x ?? b.r.width / 2);
          const y = b.r.top + (target?.y ?? b.r.height / 2);
          if (!down) {
            down = true;
            pointer(b.c, "pointerdown", x, y);
          }
          pointer(b.c, "pointermove", x, y);
        },
        60
      ).then(() => {
        const box = b as ReturnType<typeof canvasBox>;
        if (box) pointer(box.c, "pointerup", 0, 0);
      });
    };
    const clipBee = async (good: number, bad: number) => {
      let b: ReturnType<typeof canvasBox> = null;
      let y = 175;
      let pressed = false;
      tourHint.beeRunning = false;
      await clip(
        "Vuelo de Polinización",
        ["🐝 Vuelo de Polinización: de flor en flor juntando polen", "❌ El pesticida le quita vida… ¡y si toca el suelo se acaba!"],
        good,
        bad,
        (mode) => {
          b = canvasBox();
          if (!b || !tourHint.beeRunning) return; // espera a que termine la cuenta regresiva
          if (!pressed) {
            pressed = true;
            pointer(b.c, "pointerdown", b.r.left + b.r.width / 2, b.r.top + y);
          }
          const target = mode === "good" ? tourHint.beeY ?? 175 : tourHint.beeBadY ?? b.r.height - 60;
          y += (target - y) * 0.3;
          pointer(b.c, "pointermove", b.r.left + b.r.width / 2, b.r.top + y);
        },
        60
      );
      const box = b as ReturnType<typeof canvasBox>;
      if (box) pointer(box.c, "pointerup", 0, 0); // se suelta: la abeja cae y sale el resultado
      const done = await waitFor(() => buttonWithText("Otra vez"), 4000);
      center(done);
      say("🏆 Cada partida da monedas, XP y +20 % de felicidad");
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

    const tap = async (label: string) => {
      const el = $(`button[aria-label^='${label}']`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      pointer(el, "pointerdown", r.left + r.width / 2, r.top + r.height / 2);
      await sleep(80);
      pointer(el, "pointerup", r.left + r.width / 2, r.top + r.height / 2);
    };
    const closeDialog = () => $<HTMLButtonElement>("[role=dialog] [aria-label='Cerrar']")?.click();
    const focusEl = (el: Element | null | undefined, ms: number) => {
      el?.classList.add("tour-focus");
      setTimeout(() => el?.classList.remove("tour-focus"), ms);
    };

    try {
      // 0:00 – 0:27 · Splash y crecimiento real de 21 días
      tourEmit("splash");
      g().startDemo();
      await at(2.5);
      say("🌱 CultivaT: un kit de cultivo real + una planta virtual para cuidar");
      await at(6.5);
      g().tourPatch({ xp: 0, water: 85, fresh: 85, nutrients: 85, happy: 85, climate: "soleado", dirt: 0 });
      say("🌰 Día 1: Semilla. La planta virtual crece al ritmo de la planta real");
      await at(10.5);
      g().growStage();
      say("🌱 Día 5: Brote");
      await at(14);
      g().growStage();
      say("🌿 Día 12: Planta Joven");
      await at(17.5);
      g().growStage();
      say("🌻 Día 21: ¡Floreciendo! Máximo 100 XP y 150 monedas por día");
      await at(21.5);
      $<HTMLButtonElement>("button[aria-label^='Ver etapas']")?.click();
      say("📈 Aquí ven el progreso de cada etapa");
      await at(26);
      closeDialog();

      // 0:27 – 0:50 · Cuidados y clima de Culiacán
      await at(27);
      g().tourPatch({ water: 30, nutrients: 35 });
      say("💧 Los niños la riegan y la abonan tocando o arrastrando");
      await at(28.5);
      await tap("Regar");
      await at(31.5);
      await tap("Abonar");
      await at(35);
      g().tourPatch({ fresh: 55 });
      g().setClimate("calor");
      say("🔥 El clima de Culiacán cambia solo: ¡ola de calor de 42 °C!");
      await at(39.5);
      g().openUmbrella();
      say("☂️ Hay que protegerla con la sombrilla, como en el campo");
      await at(44);
      g().tourPatch({ water: 35, fresh: 45 });
      g().setClimate("lluvia");
      say("🌧️ Con lluvia la planta se riega y se refresca sola");

      // 0:50 – 1:10 · Plagas y control biológico
      await at(50);
      g().setClimate("soleado");
      g().tourPatch({ nutrients: 70 });
      tourEmit("aphid");
      say("🪲 Aparecen pulgones que le roban nutrientes");
      await at(55);
      tourEmit("ladybugOpen");
      say("🐞 La Catarina Guardiana: una aliada natural del campo");
      await at(60);
      tourEmit("ladybugConfirm");
      say("🐞 Se come los pulgones sin usar químicos: control biológico");
      await at(63);
      tourEmit("aphid");

      // 1:10 – 1:52 · Minijuegos educativos: primero bien, luego un error
      await at(70);
      tab("jugar");
      say("🎮 6 minijuegos para aprender jugando. Veamos 3:");
      await at(73);
      await clipRain(6000, 3500);
      backToGames();
      await at(85);
      await clipRoots(6000, 3500);
      backToGames();
      await at(97);
      g().tourPatch({ happy: 70 });
      await clipBee(6000, 3000);

      // 1:52 – 2:10 · Conexión phygital: Mi Kit
      await at(112);
      tab("kit");
      say("📸 Mi Kit: cada semana fotografían su planta real");
      await at(114.5);
      await scanKit();
      say("🔍 La app escanea la foto de la planta del kit…");
      await at(119);
      showKitResult();
      say("✅ ¡Semana verificada! +50 monedas por cuidar la planta real");
      await at(125);
      say("🪴 Así ven cómo crece su planta semana a semana");

      // 2:10 – 2:18 · Compartir la racha
      await at(130);
      $<HTMLButtonElement>("button[aria-label^='Racha de']")?.click();
      say("🔥 Su racha diaria se comparte con la foto de su planta");
      await at(137.5);
      closeDialog();

      // 2:18 – 2:30 · Sabi
      await at(138);
      tab("sabi");
      say("🌻 Sabi, la guía del campo");
      await sleep(900);
      buttonWithText("Diagnosticar a mi planta")?.click();
      say("🩺 Sabi revisa a la planta y explica qué necesita");
      await at(144.5);
      buttonWithText(SABI_SUGGESTIONS[0])?.click();
      say("💬 Y responde dudas sobre el kit y la agricultura de Sinaloa");

      // 2:30 – 2:40 · Tienda
      await at(150);
      tab("tienda");
      say("🛍️ Con sus monedas personalizan su planta en la Tienda");
      for (const i of [1, 2, 3]) {
        await sleep(1800);
        const item = $$<HTMLButtonElement>("button").filter((b) => b.className.includes("h-28"))[i];
        center(item);
        item?.click();
      }

      // 2:40 – 3:00 · Cierre de marca
      await at(160);
      tab("planta");
      g().tourPatch({ water: 100, fresh: 100, nutrients: 100, happy: 100, climate: "soleado", dirt: 0 });
      say("💚 Niños que cuidan la naturaleza y descubren el campo de Culiacán");
      await at(166);
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
        <div
          className={`pointer-events-none fixed inset-x-0 z-[305] mx-auto flex max-w-[430px] justify-center px-4 ${game.inGame ? "top-[34px]" : "bottom-[104px]"}`}
        >
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
