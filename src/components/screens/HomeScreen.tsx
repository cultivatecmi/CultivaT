"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { PlantCharacter, type Reaction } from "@/components/plant/PlantCharacter";
import { GardenBackdrop } from "@/components/home/GardenBackdrop";
import { HomeHud } from "@/components/home/HomeHud";
import { DragHint } from "@/components/home/DragHint";
import { ActionBar, AphidSvg, ParticleLayer, ToolIcon, UmbrellaSvg, type Particle } from "@/components/home/SceneProps";
import { computeMood, isHeatActive, isLadybugActive, isShaded, TAP_MESSAGES } from "@/lib/game";
import { LadybugSvg } from "@/components/home/Ladybug";
import { leafSpots, plantGeometry, VIEW_H } from "@/components/plant/geometry";
import { getStage } from "@/lib/stages";
import { playSound } from "@/lib/sound";
import { CLIMATES } from "@/lib/weather";
import type { Mood, ToolId } from "@/lib/types";
import { takeJoy } from "@/lib/joy";
import { CoinText } from "@/components/ui/CoinText";
import { cn, pick } from "@/lib/utils";

// Distribución vertical (desde abajo): menú → bandeja de herramientas → maceta
const TRAY_B = "calc(94px + env(safe-area-inset-bottom))";
const PLANT_B = "calc(180px + env(safe-area-inset-bottom))";
/** inicio del escenario: deja la línea del piso justo bajo la maceta (el escenario mide 0.8 × ancho) */
const SCENE_B = "calc(198px + env(safe-area-inset-bottom) - 0.16 * min(100vw, 430px))";
const PLANT_W = "min(290px, 72vw, calc((100dvh - 320px) * 0.9))";

const POSTURE: Record<Mood, string> = {
  feliz: "anim-bob",
  hambrienta: "anim-bob",
  sedienta: "anim-droop",
  acalorada: "anim-shake",
  marchita: "anim-wilt",
};

const TICK_MS = 260;

/** Mano guía: se muestra hasta que el niño arrastre 3 veces, y otra vez tras 30 s sin usar herramientas */
const DRAG_COUNT_KEY = "cultivat:v1:drags";
const HINT_FIRST_MS = 2500;
const HINT_IDLE_MS = 30_000;
const HINT_TOOLS: ToolId[] = ["water", "feed", "shade", "sponge"];

function readDragCount() {
  try {
    return Number(window.localStorage.getItem(DRAG_COUNT_KEY) || 0);
  } catch {
    return 0;
  }
}

/** Lugares (en % de la caja de la planta) donde puede aparecer el pulgón: sus hojas */
const bugSpots = leafSpots;

interface Drag {
  tool: ToolId;
  pointerId: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  t0: number;
  moved: boolean;
  over: boolean;
  rub: number;
  ticks: number;
  warned: boolean;
  /** ticks restantes en modo automático (toque rápido); -1 = arrastrando con el dedo */
  autoLeft: number;
}

export function HomeScreen() {
  const ctx = useGameState();
  const { state, now, openUmbrella, cleanDirt, addDirt, reward } = ctx;
  const mood = computeMood(state, now);
  const heat = isHeatActive(state, now);
  const shaded = isShaded(state, now);
  // cuando la sombrilla termina su tiempo y se cierra: sonido suave que baja
  const wasShaded = useRef(shaded);
  useEffect(() => {
    if (wasShaded.current && !shaded) playSound("umbrellaOff");
    wasShaded.current = shaded;
  }, [shaded]);
  const stage = getStage(state.xp).index;

  const homeRef = useRef<HTMLDivElement>(null);
  const plantRef = useRef<HTMLDivElement>(null);
  const springRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  const [bubble, setBubble] = useState<string | null>(null);
  const [reaction, setReaction] = useState<Reaction>(null);
  const [dancing, setDancing] = useState(false);
  const [wet, setWet] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [pouring, setPouring] = useState(false);
  const [bug, setBug] = useState<{ id: number; x: number; y: number; squashed: boolean } | null>(null);
  const [hint, setHint] = useState(true);

  // referencias "vivas" para timers e intervalos
  const latest = useRef({ ctx, mood, stage });
  latest.current = { ctx, mood, stage };
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const named = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pid = useRef(0);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  /** timer con nombre: reinicia el anterior del mismo nombre */
  const restart = useCallback((name: string, fn: () => void, ms: number) => {
    clearTimeout(named.current[name]);
    named.current[name] = setTimeout(fn, ms);
  }, []);

  useEffect(() => {
    const all = timers.current;
    const byName = named.current;
    return () => {
      all.forEach(clearTimeout);
      Object.values(byName).forEach(clearTimeout);
    };
  }, []);

  const say = useCallback(
    (text: string, ms = 3000) => {
      setBubble(text);
      restart("bubble", () => setBubble(null), ms);
    },
    [restart]
  );

  // -------------------------------------------------------------------------
  // Partículas
  // -------------------------------------------------------------------------

  const emit = useCallback(
    (list: Omit<Particle, "id">[], ttl = 1500) => {
      const items = list.map((p) => ({ ...p, id: ++pid.current }));
      const ids = new Set(items.map((p) => p.id));
      setParticles((cur) => [...cur, ...items].slice(-70));
      later(() => setParticles((cur) => cur.filter((p) => !ids.has(p.id))), ttl + 400);
    },
    [later]
  );

  const toLocal = useCallback((cx: number, cy: number) => {
    const r = homeRef.current?.getBoundingClientRect();
    return r ? { x: cx - r.left, y: cy - r.top } : { x: cx, y: cy };
  }, []);

  /** punto dentro de la planta (fracciones de su caja) en coordenadas locales */
  const plantPoint = useCallback(
    (fx: number, fy: number) => {
      const r = plantRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return toLocal(r.left + r.width * fx, r.top + r.height * fy);
    },
    [toLocal]
  );

  // -------------------------------------------------------------------------
  // Física elástica (resorte amortiguado) para aplastar/rebotar a Brotín
  // -------------------------------------------------------------------------

  const spring = useRef({ x: 0, v: 0, raf: 0, last: 0 });

  const springStep = useCallback((t: number) => {
    const s = spring.current;
    const dt = Math.min(0.032, (t - s.last) / 1000);
    s.last = t;
    const a = -240 * s.x - 9 * s.v;
    s.v += a * dt;
    s.x += s.v * dt;
    const el = springRef.current;
    if (Math.abs(s.x) < 0.002 && Math.abs(s.v) < 0.02) {
      s.x = 0;
      s.v = 0;
      s.raf = 0;
      if (el) el.style.transform = "";
      return;
    }
    if (el) el.style.transform = `translateY(${Math.min(0, s.x) * 70}px) scale(${1 + s.x * 0.4}, ${1 - s.x * 0.4})`;
    s.raf = requestAnimationFrame(springStep);
  }, []);

  const kick = useCallback(
    (impulse: number) => {
      const s = spring.current;
      s.v += impulse;
      if (!s.raf) {
        s.last = performance.now();
        s.raf = requestAnimationFrame(springStep);
      }
    },
    [springStep]
  );

  useEffect(() => () => cancelAnimationFrame(spring.current.raf), []);

  // -------------------------------------------------------------------------
  // Ojos que siguen el dedo/cursor + parpadeo aleatorio
  // -------------------------------------------------------------------------

  const look = useRef({ x: 0, y: 0 });

  const applyLook = useCallback(() => {
    const el = plantRef.current;
    if (!el) return;
    el.querySelectorAll<SVGGElement>("[data-pupil]").forEach((g) => {
      const m = Number(g.dataset.m || 0);
      g.setAttribute("transform", `translate(${(look.current.x * m).toFixed(2)} ${(look.current.y * m * 0.8).toFixed(2)})`);
    });
  }, []);

  // tras cada render (la cara puede cambiar) se vuelve a aplicar la mirada
  useEffect(() => {
    applyLook();
  });

  useEffect(() => {
    let raf = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onMove = (e: PointerEvent) => {
      const el = plantRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * (plantGeometry(latest.current.stage).eyeY / VIEW_H));
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 140);
      look.current = { x: (dx / d) * k, y: (dy / d) * k };
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), applyLook()));
      clearTimeout(idle);
      idle = setTimeout(() => {
        look.current = { x: 0, y: 0 };
        applyLook();
      }, 3000);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove);

    let blinkT: ReturnType<typeof setTimeout>;
    const blink = () => {
      const el = plantRef.current;
      el?.setAttribute("data-blink", "1");
      setTimeout(() => el?.removeAttribute("data-blink"), 130);
      if (Math.random() < 0.25) {
        setTimeout(() => el?.setAttribute("data-blink", "1"), 260);
        setTimeout(() => el?.removeAttribute("data-blink"), 390);
      }
      blinkT = setTimeout(blink, 2200 + Math.random() * 3500);
    };
    blinkT = setTimeout(blink, 1800);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      clearTimeout(blinkT);
    };
  }, [applyLook]);

  // -------------------------------------------------------------------------
  // Caricias y toques
  // -------------------------------------------------------------------------

  const pet = useRef<{ id: number; x: number; y: number; t: number; dist: number; acc: number; scrub: number } | null>(null);
  // caricias: tocar (+3 %) y frotar (+2 %) suben la felicidad; jugar minijuegos sube más
  const lastHappy = useRef(0);
  const addHappy = useCallback((amount: number) => {
    const t = performance.now();
    if (t - lastHappy.current < 250) return;
    lastHappy.current = t;
    latest.current.ctx.boost("happy", amount, false);
  }, []);

  const tapPlant = (cx: number, cy: number) => {
    kick(6);
    playSound("bounce");
    addHappy(3);
    const p = toLocal(cx, cy);
    emit(
      ["💖", "💚", "⭐", "💛", "✨"].map((c, i) => ({
        x: p.x,
        y: p.y,
        kind: "burst" as const,
        content: c,
        dx: Math.cos((i / 5) * Math.PI * 2 - Math.PI / 2) * 70,
        dy: Math.sin((i / 5) * Math.PI * 2 - Math.PI / 2) * 60 - 20,
        size: 22,
      })),
      800
    );
    say(pick(TAP_MESSAGES[mood]));
    if (mood === "feliz" || mood === "hambrienta") {
      setReaction("risa");
      restart("reaction", () => setReaction(null), 1200);
    }
  };

  const onPlantDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pet.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dist: 0, acc: 0, scrub: 0 };
    setHint(false);
  };

  const onPlantMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pet.current;
    if (!p || p.id !== e.pointerId) return;
    const d = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    p.dist += d;
    p.acc += d;
    p.x = e.clientX;
    p.y = e.clientY;
    if (p.acc > (latest.current.ctx.state.dirt > 0 ? 28 : 45)) {
      p.acc = 0;
      kick(1.6);
      const l = toLocal(e.clientX, e.clientY);
      const L = latest.current;
      // si tiene manchitas, frotar la limpia; si no, son caricias
      if (L.ctx.state.dirt > 0) {
        p.scrub += 1;
        playSound("scrub");
        emit(
          [0, 1, 2].map(() => ({
            x: l.x + (Math.random() - 0.5) * 30,
            y: l.y + (Math.random() - 0.5) * 20,
            kind: "rise" as const,
            content: "bubble",
            size: 9 + Math.random() * 12,
            dx: (Math.random() - 0.5) * 50,
          })),
          1300
        );
        if (p.scrub >= 2) {
          p.scrub = 0;
          const res = L.ctx.cleanDirt();
          if (res.ok) {
            playSound("coin");
            emit([
              { x: l.x, y: l.y - 10, kind: "text", content: "+1 🪙", size: 20 },
              ...[0, 1, 2, 3].map((i) => ({ x: l.x, y: l.y, kind: "burst" as const, content: "✨", dx: (i - 1.5) * 34, dy: -50, size: 18 })),
            ]);
            say(res.full ? "¡Quedé rechinando de limpia! ✨" : "¡Una manchita menos! Sigue frotando 🧽");
          }
        }
        return;
      }
      playSound("pop", 0.7);
      addHappy(2);
      emit([{ x: l.x, y: l.y, kind: "rise", content: pick(["💖", "💕", "💗", "✨"]), dx: (Math.random() - 0.5) * 40, size: 20 }]);
      if (mood === "feliz") {
        setReaction("risa");
        restart("reaction", () => setReaction(null), 700);
      }
    }
  };

  const onPlantUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pet.current;
    if (!p || p.id !== e.pointerId) return;
    pet.current = null;
    if (p.dist < 14 && performance.now() - p.t < 450) tapPlant(e.clientX, e.clientY);
    else if (p.dist > 120) say(pick(["¡Qué rico, más caricias! 😊", "¡Jiji, me encanta! 💚", "¡Eres el mejor! 🥰"]));
  };

  // -------------------------------------------------------------------------
  // Herramientas táctiles (arrastrar hacia la planta, mantener o tocar)
  // -------------------------------------------------------------------------

  // ---- mano guía ----
  const [hintTool, setHintTool] = useState<ToolId | null>(null);
  const lastToolUse = useRef(Date.now());
  const dragCount = useRef(0);

  useEffect(() => {
    dragCount.current = readDragCount();
    let cycle = 0;
    const id = setInterval(() => {
      const idle = Date.now() - lastToolUse.current;
      const firstTimes = dragCount.current < 3;
      const show = !drag.current && idle > (firstTimes ? HINT_FIRST_MS : HINT_IDLE_MS);
      if (!show) {
        setHintTool((t) => (t ? null : t));
        return;
      }
      // cambia de herramienta en cada vuelta de la animación (2.6 s)
      cycle += 1;
      if (cycle % 3 === 1) {
        const L = latest.current.ctx.state;
        // primero la que más se necesita
        const urgent: ToolId | null =
          L.climate === "calor" ? "shade" : L.water < 40 && L.climate !== "lluvia" ? "water" : L.nutrients < 40 ? "feed" : L.dirt > 0 ? "sponge" : null;
        setHintTool((t) => urgent ?? HINT_TOOLS[(HINT_TOOLS.indexOf(t ?? "sponge") + 1) % HINT_TOOLS.length]);
      }
    }, 900);
    return () => clearInterval(id);
  }, []);

  const noteToolUse = (dragged: boolean) => {
    lastToolUse.current = Date.now();
    setHintTool(null);
    if (dragged) {
      dragCount.current += 1;
      try {
        window.localStorage.setItem(DRAG_COUNT_KEY, String(dragCount.current));
      } catch {
        /* sin almacenamiento */
      }
    }
  };

  const drag = useRef<Drag | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pouringRef = useRef(false);

  const setPour = (v: boolean) => {
    if (pouringRef.current !== v) {
      pouringRef.current = v;
      setPouring(v);
    }
  };

  const placeGhost = (x: number, y: number, smooth = false) => {
    const g = ghostRef.current;
    if (!g) return;
    g.style.transition = smooth ? "transform 220ms ease-out" : "none";
    g.style.transform = `translate3d(${x - 34}px, ${y - 82}px, 0)`;
  };

  const hitPlant = (x: number, y: number) => {
    const r = plantRef.current?.getBoundingClientRect();
    if (!r) return false;
    const ay = y - 40; // punto de acción: debajo de la herramienta
    return x > r.left - 12 && x < r.right + 12 && ay > r.top - 100 && ay < r.bottom - 25;
  };

  const endDrag = () => {
    drag.current = null;
    if (tickTimer.current) clearInterval(tickTimer.current);
    tickTimer.current = null;
    setActiveTool(null);
    setPour(false);
  };

  const applyTool = (d: Drag) => {
    const L = latest.current;
    const p = toLocal(d.x, d.y - 40);
    d.ticks += 1;

    if (d.tool === "water") {
      // con lluvia no se riega: ya la riega el cielo (evita ahogar las raíces)
      if (L.ctx.state.climate === "lluvia") {
        if (!d.warned) {
          d.warned = true;
          say("¡Ya me riega la lluvia! Si me pones más agua mis raíces se pueden ahogar 🌧️", 4200);
          playSound("tap");
        }
        return;
      }
      const res = L.ctx.boost("water", 5, true);
      if (res.ok) {
        const soil = plantPoint(0.5, 0.7);
        emit(
          [0, 1, 2].map((i) => ({
            x: p.x - 18 + i * 12 + Math.random() * 6,
            y: p.y + 4,
            kind: "fall" as const,
            content: "💧",
            size: 15 + Math.random() * 6,
            dx: (soil.x - p.x) * 0.3,
            dy: Math.max(50, soil.y - p.y),
            delay: i * 0.07,
          })),
          1000
        );
        playSound("drop");
        setWet(true);
        restart("wet", () => setWet(false), 4000);
        if (res.full) say("¡Glup! Ya estoy llenita 💧");
      } else if (!d.warned) {
        d.warned = true;
        say("¡Ya estoy llenita! 💧 Mucha agua pudre mis raíces");
      }
    } else if (d.tool === "feed") {
      const res = L.ctx.boost("nutrients", 6, true);
      if (res.ok) {
        const mouth = plantPoint(0.5, plantGeometry(L.stage).mouthY / VIEW_H);
        emit(
          [0, 1, 2].map((i) => ({
            x: p.x + (Math.random() - 0.5) * 14,
            y: p.y,
            kind: "fall" as const,
            content: `dot:${pick(["#8D6E63", "#66BB6A", "#A1887F", "#FFB300"])}`,
            size: 10 + Math.random() * 5,
            dx: mouth.x - p.x + (Math.random() - 0.5) * 10,
            dy: mouth.y - p.y,
            delay: i * 0.1,
          })),
          1000
        );
        setReaction("comiendo");
        restart("reaction", () => setReaction(null), 1300);
        if (d.ticks % 2 === 1) playSound("bite");
        if (res.full) say("¡Ñam ñam! ¡Qué rica composta! 🌱");
      } else if (!d.warned) {
        d.warned = true;
        say("¡Estoy llenísima! Mucho abono quema mis raíces 🌱");
      }
    } else if (d.tool === "shade") {
      // con lluvia no hace falta sombra: las nubes ya la refrescan
      if (L.ctx.state.climate === "lluvia") {
        say("¡Las nubes y la lluvia ya me mantienen fresquita! 🌧️", 4200);
        playSound("tap");
        endDrag();
        return;
      }
      L.ctx.openUmbrella();
      playSound("whoosh");
      say(L.ctx.state.climate === "calor" ? "¡Gracias! La sombrilla me protege del sol de Culiacán 😎" : "¡Qué fresquito bajo la sombrilla! ☂️");
      const top = plantPoint(0.5, 0.05);
      emit(["✨", "💨", "✨"].map((c, i) => ({ x: top.x + (i - 1) * 50, y: top.y, kind: "burst" as const, content: c, dy: -30, size: 22 })), 800);
      endDrag();
    } else if (d.tool === "sponge") {
      const moving = d.autoLeft >= 0 || Math.hypot(d.x - d.lastX, d.y - d.lastY) > 8;
      if (!moving) return;
      emit(
        [0, 1, 2].map(() => ({
          x: p.x + (Math.random() - 0.5) * 40,
          y: p.y + (Math.random() - 0.5) * 24,
          kind: "rise" as const,
          content: "bubble",
          size: 9 + Math.random() * 12,
          dx: (Math.random() - 0.5) * 50,
        })),
        1300
      );
      playSound("scrub");
      d.rub += 1;
      if (d.rub >= 2) {
        d.rub = 0;
        if (L.ctx.state.dirt > 0) {
          const res = L.ctx.cleanDirt();
          if (res.ok) {
            playSound("coin");
            emit([
              { x: p.x, y: p.y - 10, kind: "text", content: "+1 🪙", size: 20 },
              ...[0, 1, 2, 3].map((i) => ({ x: p.x, y: p.y, kind: "burst" as const, content: "✨", dx: (i - 1.5) * 34, dy: -50, size: 18 })),
            ]);
            say(res.full ? "¡Quedé rechinando de limpia! ✨" : "¡Una manchita menos! 🧽");
          }
        } else if (!d.warned) {
          d.warned = true;
          say("¡Ya estoy limpiecita! ✨");
        }
      }
    }
  };

  const tick = () => {
    const d = drag.current;
    if (!d) return;
    if (d.over) applyTool(d);
    if (!drag.current) return; // la herramienta pudo terminar (sombrilla)
    d.lastX = d.x;
    d.lastY = d.y;
    if (d.autoLeft >= 0) {
      d.autoLeft -= 1;
      if (d.autoLeft <= 0) endDrag();
    }
  };
  const tickRef = useRef(tick);
  tickRef.current = tick;

  const onToolPointerDown = (tool: ToolId, e: React.PointerEvent<HTMLButtonElement>) => {
    if (drag.current) return;
    noteToolUse(false);
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      tool,
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      t0: performance.now(),
      moved: false,
      over: false,
      rub: 0,
      ticks: 0,
      warned: false,
      autoLeft: -1,
    };
    placeGhost(e.clientX, e.clientY);
    setActiveTool(tool);
    playSound("tap", 0.6);
    tickTimer.current = setInterval(() => tickRef.current(), TICK_MS);
  };

  const onToolPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId || d.autoLeft >= 0) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (Math.hypot(d.x - d.sx, d.y - d.sy) > 10) d.moved = true;
    placeGhost(d.x, d.y);
    d.over = hitPlant(d.x, d.y);
    setPour(d.over);
  };

  const onToolPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId || d.autoLeft >= 0) return;
    if (d.moved && d.ticks > 0) noteToolUse(true);
    else lastToolUse.current = Date.now();
    if (!d.moved && performance.now() - d.t0 < 400) {
      // toque rápido: la herramienta vuela sola hasta Brotín
      const r = plantRef.current?.getBoundingClientRect();
      if (!r) return endDrag();
      // la esponja va a la cabecita (donde salen las manchitas)
      const fy = d.tool === "sponge" ? plantGeometry(latest.current.stage).hy / VIEW_H : d.tool === "feed" ? 0.28 : 0.12;
      d.x = r.left + r.width * (d.tool === "water" ? 0.62 : 0.5);
      d.y = r.top + r.height * fy + 40;
      d.over = true;
      d.autoLeft = d.tool === "shade" ? 1 : 6;
      placeGhost(d.x, d.y, true);
      setPour(true);
    } else {
      endDrag();
    }
  };

  useEffect(
    () => () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Eventos sorpresa: pulgones y manchitas de tierra
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (bug && !bug.squashed) {
      const t = setTimeout(() => {
        setBug(null);
        say("¡El pulgón se escapó! 🐛 Al siguiente lo atrapas");
      }, 12000);
      return () => clearTimeout(t);
    }
    if (!bug) {
      const t = setTimeout(() => {
        const s = pick(bugSpots(latest.current.stage));
        setBug({ id: Date.now(), x: s.x, y: s.y, squashed: false });
        playSound("pop", 0.5);
      }, 15000 + Math.random() * 5000);
      return () => clearTimeout(t);
    }
  }, [bug, say]);

  // pulgón activo: chupa la savia (-1 % de nutrientes por segundo, sin bajar de 15 %)
  const bugActive = !!bug && !bug.squashed;
  useEffect(() => {
    if (!bugActive) return;
    if (!isLadybugActive(latest.current.ctx.state)) say("¡Ay! Un pulgón me está chupando la savia 🪲 ¡Aplástalo!", 3200);
    const t = setInterval(() => latest.current.ctx.drain("nutrients", 1, 15), 1000);
    return () => clearInterval(t);
  }, [bugActive, say]);

  // -------------------------------------------------------------------------
  // Catarina Guardiana: patrulla las hojas y se come los pulgones (control biológico)
  // -------------------------------------------------------------------------
  const ladyActive = isLadybugActive(state, now);
  const [ladyShown, setLadyShown] = useState(ladyActive);
  const [ladyLeaving, setLadyLeaving] = useState(false);
  const [ladyPos, setLadyPos] = useState(() => pick(bugSpots(stage)));
  const prevLady = useRef(ladyActive);

  useEffect(() => {
    if (ladyActive && !prevLady.current) {
      setLadyLeaving(false);
      setLadyShown(true);
      setLadyPos(pick(bugSpots(latest.current.stage)));
      say("¡Llegó la Catarina Guardiana! 🐞 Cuidará mis hojas 3 minutos", 3600);
    } else if (!ladyActive && prevLady.current) {
      setLadyLeaving(true);
      say("¡Gracias, catarina! Ya se va volando 🐞👋", 3200);
      later(() => {
        setLadyShown(false);
        setLadyLeaving(false);
      }, 1300);
    }
    prevLady.current = ladyActive;
  }, [ladyActive, say, later]);

  // patrulla: camina de hoja en hoja
  useEffect(() => {
    if (!ladyActive || bugActive) return;
    const t = setInterval(() => setLadyPos(pick(bugSpots(latest.current.stage))), 3200);
    return () => clearInterval(t);
  }, [ladyActive, bugActive]);

  // caza: va hacia el pulgón (≈1.1 s) y se lo come
  const bugId = bug?.id;
  useEffect(() => {
    if (!ladyActive || !bugActive || !bug) return;
    setLadyPos({ x: bug.x, y: bug.y });
    const t = setTimeout(() => {
      setBug((b) => (b && b.id === bugId ? { ...b, squashed: true } : b));
      playSound("pop");
      const p = plantPoint(bug.x / 100, bug.y / 100);
      emit([
        { x: p.x, y: p.y, kind: "burst", content: "✨", dy: -20, size: 26 },
        { x: p.x, y: p.y - 12, kind: "text", content: "¡Ñam! 🐞", size: 20 },
      ]);
      say("¡Control biológico! La catarina eliminó al pulgón sin pesticidas 🐞", 4200);
      later(() => setBug((b) => (b && b.id === bugId ? null : b)), 650);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ladyActive, bugActive, bugId]);

  const squashBug = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!bug || bug.squashed) return;
    setBug({ ...bug, squashed: true });
    playSound("squash");
    const p = toLocal(e.clientX, e.clientY);
    emit([
      { x: p.x, y: p.y, kind: "burst", content: "💥", dy: 0, size: 34 },
      { x: p.x, y: p.y - 14, kind: "text", content: "+5 🪙", size: 24 },
    ]);
    playSound("coin");
    reward(5, 2, "¡Pulgón aplastado!");
    say("¡Salvada! Los pulgones chupan la savia y roban nutrientes 🪲", 4200);
    later(() => setBug(null), 650);
  };

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        const L = latest.current;
        if (L.ctx.state.dirt < 3) {
          L.ctx.addDirt();
          if (Math.random() < 0.6) say("¡Ay! Me cayó tierrita. ¡Frótame con el dedo para limpiarme! 🧽");
        }
        schedule();
      }, 35000 + Math.random() * 15000);
    };
    schedule();
    return () => clearTimeout(t);
  }, [say]);

  // -------------------------------------------------------------------------
  // Subir de etapa: ¡a bailar!
  // -------------------------------------------------------------------------

  // la planta comenta cuando el clima cambia solo
  const prevClimate = useRef(state.climate);
  useEffect(() => {
    if (state.climate !== prevClimate.current) {
      say(CLIMATES[state.climate].message, 3800);
      if (state.climate === "lluvia") {
        setWet(true);
        restart("wet", () => setWet(false), 4000);
      }
    }
    prevClimate.current = state.climate;
  }, [state.climate, say, restart]);

  const prevStage = useRef(stage);
  useEffect(() => {
    if (stage > prevStage.current) {
      setDancing(true);
      say("¡Crecí! ¡Mira cómo bailo! 💃🌱", 3500);
      const c = plantPoint(0.5, 0.3);
      emit(["🎉", "⭐", "🌟", "🎊", "✨", "⭐"].map((e, i) => ({ x: c.x, y: c.y, kind: "burst" as const, content: e, dx: (i - 2.5) * 40, dy: -80 - (i % 2) * 30, size: 26 })), 900);
      later(() => setDancing(false), 2100);
    }
    prevStage.current = stage;
  }, [stage, say, emit, plantPoint, later]);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 9000);
    return () => clearTimeout(t);
  }, []);

  // volvió de jugar: la felicidad ganada se celebra al instante (risa, baile y corazones)
  useEffect(() => {
    const joy = takeJoy();
    if (joy <= 0) return;
    later(() => {
      setDancing(true);
      playSound("coin");
      say(`¡Jugar contigo me pone muy feliz! +${joy}% 😊`, 3600);
      const c = plantPoint(0.5, 0.3);
      emit(["💖", "😊", "💚", "✨", "💛", "💕"].map((e, i) => ({ x: c.x, y: c.y, kind: "burst" as const, content: e, dx: (i - 2.5) * 38, dy: -70 - (i % 2) * 30, size: 26 })), 900);
      later(() => setDancing(false), 1800);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------

  const umbrellaLeft = state.shadeUntil - now;
  // la felicidad se ve en el brillo de la planta (sin medidor aparte)
  const happyGlow =
    state.happy >= 70
      ? "saturate(1.12) brightness(1.04) drop-shadow(0 0 10px rgba(255,236,150,.75))"
      : state.happy < 30
        ? "saturate(0.65) brightness(0.92)"
        : "none";

  return (
    <div
      ref={homeRef}
      className="relative h-dvh touch-manipulation select-none overflow-hidden"
      style={{ "--tray-b": TRAY_B } as React.CSSProperties}
    >
      <GardenBackdrop background={state.equipped.background} climate={state.climate} floorBottom={SCENE_B} />

      <HomeHud aphidAlert={bugActive && !ladyActive} />

      {/* Brotín */}
      <div
        ref={plantRef}
        onPointerDown={onPlantDown}
        onPointerMove={onPlantMove}
        onPointerUp={onPlantUp}
        onPointerCancel={() => (pet.current = null)}
        className="absolute left-1/2 z-10 -translate-x-1/2 cursor-grab touch-none"
        style={{ bottom: PLANT_B, width: PLANT_W }}
        role="button"
        aria-label={`${state.plantName}: tócalo o acarícialo`}
      >
        {shaded && (
          <div className="umbrella-open pointer-events-none absolute left-1/2 z-10 w-[118%]" style={{ top: "-30%" }}>
            <UmbrellaSvg className="w-full drop-shadow-lg" fading={umbrellaLeft < 6000} />
          </div>
        )}

        <div className={dancing ? "anim-dance" : reaction ? "" : POSTURE[mood]}>
          <div ref={springRef} style={{ transformOrigin: "50% 92%", filter: happyGlow, transition: "filter 1s" }}>
            <PlantCharacter
              mood={mood}
              stage={stage}
              pot={state.equipped.pot}
              accessory={state.equipped.accessory}
              reaction={dancing ? "risa" : (reaction ?? (bugActive ? "incomoda" : null))}
              dirt={state.dirt}
              wet={wet || state.climate === "lluvia"}
              className="w-full drop-shadow-[0_10px_8px_rgba(0,0,0,0.18)]"
            />
          </div>
        </div>

        {bug && (
          <button
            key={bug.id}
            type="button"
            onPointerDown={squashBug}
            aria-label="Pulgón: tócalo para atraparlo"
            className={cn("absolute z-20 grid h-12 w-12 place-items-center", bug.squashed ? "transition-all duration-300" : "bug")}
            style={{
              left: `${bug.x}%`,
              top: `${bug.y}%`,
              transform: bug.squashed ? "translate(-50%, -50%) scale(1.3, 0.15)" : undefined,
              opacity: bug.squashed ? 0 : 1,
            }}
          >
            <AphidSvg className="h-9 w-10 drop-shadow" />
          </button>
        )}

        {ladyShown && (
          <div
            className="pointer-events-none absolute z-20 h-10 w-10"
            style={{
              left: `${ladyPos.x}%`,
              top: `${ladyPos.y}%`,
              transform: "translate(-50%, -70%)",
              transition: "left 1.1s ease-in-out, top 1.1s ease-in-out",
            }}
            aria-hidden="true"
          >
            <div className={ladyLeaving ? "ladybug-fly" : "ladybug-walk"}>
              <LadybugSvg className="h-10 w-10 drop-shadow" />
            </div>
          </div>
        )}

        {bubble && (
          <div key={bubble} className="anim-pop pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-max max-w-[260px] -translate-x-1/2">
            <div className="relative rounded-2xl border-2 border-stone-200 bg-white px-3.5 py-2 text-center font-display text-[15px] font-medium leading-snug text-tinta shadow-lg">
              <CoinText text={bubble} />
              <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-stone-200 bg-white" />
            </div>
          </div>
        )}
      </div>

      <ParticleLayer particles={particles} />

      {hintTool && !activeTool && <DragHint tool={hintTool} homeRef={homeRef} plantRef={plantRef} />}

      <ActionBar
        activeTool={activeTool}
        alerts={{ water: state.water < 30 && state.climate !== "lluvia", feed: state.nutrients < 30, shade: heat, sponge: state.dirt > 0 }}
        onToolPointerDown={onToolPointerDown}
        onToolPointerMove={onToolPointerMove}
        onToolPointerUp={onToolPointerUp}
      />

      {/* herramienta que sigue al dedo */}
      <div ref={ghostRef} className="pointer-events-none fixed left-0 top-0 z-50 h-[68px] w-[68px]" style={{ opacity: activeTool ? 1 : 0 }}>
        <span
          className={cn(
            "grid h-[68px] w-[68px] place-items-center drop-shadow-lg",
            pouring && (activeTool === "water" || activeTool === "feed") && "tool-pour",
            pouring && activeTool === "sponge" && "tool-scrub"
          )}
        >
          {activeTool && <ToolIcon id={activeTool} size={60} />}
        </span>
      </div>
    </div>
  );
}
