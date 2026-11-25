"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { Countdown, GameIntro, GameResult, GAME_H } from "./GameUi";
import { scoreReward } from "@/lib/games";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { PlantCharacter } from "@/components/plant/PlantCharacter";
import { getStage } from "@/lib/stages";
import { isTourActive, tourHint } from "@/lib/tour";
import { svgToImage } from "@/lib/svgImage";

/**
 * 🌱 Laberinto de Raíces: vista bajo la tierra de una maceta. El niño desliza el dedo
 * y la raíz crece hacia él, recogiendo agua y minerales, rodeando piedras y zonas secas.
 */

const DURATION = 30;
const HEIGHT = GAME_H; // llena la pantalla del celular
const SURFACE = 128; // donde empieza la tierra (arriba se ve tu planta)
/** en el dibujo de la planta (240×262) la tierra empieza en y=184 */
const PLANT_SOIL_Y = 184;
const ROOT_SPEED = 120; // px/s
const HAPPY = 20;

type Kind = "agua" | "mineral" | "piedra" | "seca";
interface Item {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  r: number;
}
interface Branch {
  x: number;
  y: number;
  a: number;
  len: number;
  grow: number;
}
interface Float {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}
interface Result {
  score: number;
  coins: number;
  newBest: boolean;
  happy: number;
  dailyDone: boolean;
}

const POINTS: Record<"agua" | "mineral", number> = { agua: 10, mineral: 15 };

export function RootMazeGame({ onExit }: { onExit: () => void }) {
  const { recordGame, state } = useGameState();
  const [phase, setPhase] = useState<"intro" | "countdown" | "playing" | "over">("intro");
  const [result, setResult] = useState<Result | null>(null);
  const [hud, setHud] = useState({ score: 0, left: DURATION });

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const runningRef = useRef(false);
  const recordRef = useRef(recordGame);
  recordRef.current = recordGame;

  // tu planta de "Mi Planta": su etapa real con maceta y accesorio
  const stage = getStage(state.xp).index;
  const plantBoxRef = useRef<HTMLDivElement>(null);
  const plantImgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    const svg = plantBoxRef.current?.querySelector("svg");
    if (!svg) return;
    svgToImage(svg, 480)
      .then((img) => {
        if (alive) plantImgRef.current = img;
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [stage, state.equipped.pot, state.equipped.accessory]);

  const active = phase === "countdown" || phase === "playing";

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = wrap.clientWidth;
    canvas.width = W * dpr;
    canvas.height = HEIGHT * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    // paredes de la maceta: se estrecha hacia abajo
    const inset = (y: number) => 12 + ((y - SURFACE) / (HEIGHT - SURFACE)) * 34;

    const root: { x: number; y: number }[] = [{ x: W / 2, y: SURFACE + 4 }];
    const tip = () => root[root.length - 1];
    const branches: Branch[] = [];
    const items: Item[] = [];
    const floats: Float[] = [];
    const specks = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(SURFACE + 6, HEIGHT), r: rand(1, 2.6), a: rand(0.15, 0.35) }));
    // larvas de gallina ciega: plaga real que se come las raíces; se arrastran y estorban
    const GRUBS = 3;
    const grubs = Array.from({ length: GRUBS }, (_, i) => ({
      x: rand(0, W),
      y: SURFACE + 60 + ((i + 0.5) * (HEIGHT - SURFACE - 90)) / GRUBS,
      dir: i % 2 === 0 ? 1 : -1,
      speed: rand(16, 24),
      phase: rand(0, 6),
    }));
    type Grub = (typeof grubs)[number];
    /** puntos del cuerpo (cabeza primero) para dibujar y para chocar */
    const grubBody = (w: Grub) => {
      const pts: { x: number; y: number; r: number }[] = [];
      for (let i = 0; i < 9; i++) {
        const squeeze = 5.6 + Math.sin(clock * 6 - i * 0.7 + w.phase) * 1.1;
        pts.push({
          x: w.x - w.dir * i * squeeze,
          y: w.y + Math.sin(i * 0.55 + clock * 1.4 + w.phase) * 4,
          r: i === 0 ? 6.4 : 6.2 - i * 0.25,
        });
      }
      return pts;
    };
    let nextId = 0;
    let score = 0;
    let left = DURATION;
    let shake = 0;
    let hitCool = 0;
    let lastBeep = 99;
    let hudScore = -1;
    let hudSec = -1;
    let clock = 0;
    let finished = false;
    let last = performance.now();
    let raf = 0;

    const spawn = (kind: Kind) => {
      for (let k = 0; k < 40; k++) {
        const y = rand(SURFACE + 46, HEIGHT - 26);
        const m = inset(y) + 26;
        const x = rand(m, W - m);
        const r = kind === "piedra" ? rand(17, 25) : kind === "seca" ? rand(28, 40) : 13;
        const t = tip();
        const free = items.every((it) => Math.hypot(it.x - x, it.y - y) > it.r + r + 12) && Math.hypot(x - t.x, y - t.y) > 60;
        if (free) {
          items.push({ id: ++nextId, kind, x, y, r });
          return;
        }
      }
    };
    (["seca", "seca", "piedra", "piedra", "piedra", "piedra", "piedra"] as Kind[]).forEach(spawn);
    for (let i = 0; i < 4; i++) spawn("agua");
    for (let i = 0; i < 2; i++) spawn("mineral");

    const finish = () => {
      if (finished) return;
      finished = true;
      runningRef.current = false;
      const reward = scoreReward(score);
      const { newBest, happy, coins, dailyDone } = recordRef.current("raices", { score, ...reward, label: "por Laberinto de Raíces", happy: HAPPY });
      setResult({ score, coins, newBest, happy, dailyDone });
      setPhase("over");
    };

    const step = (dt: number) => {
      clock += dt;
      for (const w of grubs) {
        // avanza a tirones, como una larva de verdad
        const push = 0.55 + 0.45 * Math.max(0, Math.sin(clock * 3 + w.phase));
        w.x += w.dir * w.speed * push * dt;
        if (w.x > W + 60) w.x = -60;
        if (w.x < -60) w.x = W + 60;
      }
      hitCool = Math.max(0, hitCool - dt);
      shake = Math.max(0, shake - dt);
      branches.forEach((b) => (b.grow = Math.min(1, b.grow + dt * 2.5)));
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].life -= dt;
        floats[i].y -= dt * 30;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }
      if (!runningRef.current) return;

      left -= dt;
      const sec = Math.ceil(left);
      if (sec <= 5 && sec > 0 && sec < lastBeep) {
        lastBeep = sec;
        playSound("beep", 0.5);
      }
      if (left <= 0) {
        left = 0;
        finish();
        return;
      }

      if (isTourActive()) {
        const t0 = tip();
        const d2 = (x: number, y: number) => (x - t0.x) ** 2 + (y - t0.y) ** 2;
        let good: { x: number; y: number } | null = null;
        let bad: { x: number; y: number } | null = null;
        for (const it of items) {
          if ((it.kind === "agua" || it.kind === "mineral") && (!good || d2(it.x, it.y) < d2(good.x, good.y))) good = { x: it.x, y: it.y };
          if (it.kind === "piedra" && (!bad || d2(it.x, it.y) < d2(bad.x, bad.y))) bad = { x: it.x, y: it.y };
        }
        for (const w of grubs) {
          const h = grubBody(w)[0];
          if (h.x > 0 && h.x < W && (!bad || d2(h.x, h.y) < d2(bad.x, bad.y))) bad = { x: h.x, y: h.y };
        }
        tourHint.rootGood = good;
        tourHint.rootBad = bad;
      }

      const p = pointerRef.current;
      if (!p) return;
      const t = tip();
      const dx = p.x - t.x;
      const dy = p.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 3) return;
      const dry = items.some((it) => it.kind === "seca" && Math.hypot(it.x - t.x, it.y - t.y) < it.r);
      const move = Math.min(dist, ROOT_SPEED * (dry ? 0.4 : 1) * dt);
      const ny = Math.max(SURFACE + 4, Math.min(HEIGHT - 12, t.y + (dy / dist) * move));
      const m = inset(ny) + 8;
      const nx = Math.max(m, Math.min(W - m, t.x + (dx / dist) * move));

      // piedra: la raíz no puede atravesarla
      const stone = items.find((it) => it.kind === "piedra" && Math.hypot(it.x - nx, it.y - ny) < it.r + 5);
      if (stone) {
        if (hitCool <= 0) {
          hitCool = 1;
          shake = 0.35;
          left = Math.max(0, left - 2);
          playSound("wrong");
          if (navigator.vibrate) navigator.vibrate(60);
          floats.push({ x: stone.x, y: stone.y - stone.r - 6, text: "-2 s", color: "#B91C1C", life: 1 });
        }
        return;
      }

      // larva: no deja pasar a la raíz y le quita puntos
      const grubHit = grubs.find((w) => grubBody(w).some((b) => (b.x - nx) ** 2 + (b.y - ny) ** 2 < (b.r + 6) ** 2));
      if (grubHit) {
        if (hitCool <= 0) {
          hitCool = 1;
          shake = 0.35;
          score = Math.max(0, score - 10);
          playSound("squash", 0.7);
          if (navigator.vibrate) navigator.vibrate(60);
          floats.push({ x: nx, y: ny - 16, text: "-10", color: "#B91C1C", life: 1 });
        }
        return;
      }

      const prev = root[root.length - 2];
      if (prev && Math.hypot(nx - prev.x, ny - prev.y) < 5) root[root.length - 1] = { x: nx, y: ny };
      else root.push({ x: nx, y: ny });

      // recoger agua y minerales
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if ((it.kind === "agua" || it.kind === "mineral") && Math.hypot(it.x - nx, it.y - ny) < it.r + 9) {
          items.splice(i, 1);
          const pts = POINTS[it.kind];
          score += pts;
          playSound(it.kind === "agua" ? "drop" : "pop");
          floats.push({ x: it.x, y: it.y - 14, text: `+${pts}`, color: it.kind === "agua" ? "#0369A1" : "#A16207", life: 0.9 });
          // la raíz se ramifica al alimentarse
          const side = Math.random() < 0.5 ? -1 : 1;
          branches.push({ x: nx, y: ny, a: Math.PI / 2 + side * rand(0.6, 1.3), len: rand(24, 44), grow: 0 });
          spawn(it.kind);
        }
      }
    };

    const drawDrop = (x: number, y: number, s: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = "#38BDF8";
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.bezierCurveTo(9, -2, 9, 9, 0, 9);
      ctx.bezierCurveTo(-9, 9, -9, -2, 0, -13);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.beginPath();
      ctx.ellipse(-3, 1, 2, 3.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawSpark = (x: number, y: number, s: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(clock * 1.2);
      ctx.scale(s, s);
      ctx.fillStyle = "rgba(253,224,71,.3)";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FDE047";
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 12 : 4.5;
        const a = (i / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // ---------------- imágenes preparadas una sola vez ----------------
    const layer = () => {
      const cv = document.createElement("canvas");
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(HEIGHT * dpr);
      const c = cv.getContext("2d")!;
      c.scale(dpr, dpr);
      return { cv, c };
    };

    // fondo fijo: cielo, maceta, tierra, piedras y zonas secas (no se mueven)
    const bg = layer();
    {
      const c = bg.c;
      const sky = c.createLinearGradient(0, 0, 0, SURFACE);
      sky.addColorStop(0, "#BAE6FD");
      sky.addColorStop(1, "#E0F2FE");
      c.fillStyle = sky;
      c.fillRect(0, 0, W, SURFACE);
      c.fillStyle = "#9A3412";
      c.fillRect(0, SURFACE - 6, W, HEIGHT - SURFACE + 6);
      const soil = c.createLinearGradient(0, SURFACE, 0, HEIGHT);
      soil.addColorStop(0, "#D97706");
      soil.addColorStop(0.35, "#B45309");
      soil.addColorStop(1, "#78350F");
      c.fillStyle = soil;
      c.beginPath();
      c.moveTo(inset(SURFACE), SURFACE);
      c.lineTo(W - inset(SURFACE), SURFACE);
      c.lineTo(W - inset(HEIGHT), HEIGHT);
      c.lineTo(inset(HEIGHT), HEIGHT);
      c.closePath();
      c.fill();
      for (const sp of specks) {
        c.fillStyle = `rgba(41,20,5,${sp.a})`;
        c.beginPath();
        c.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "#C2410C";
      c.fillRect(0, SURFACE - 10, W, 10);
      c.fillStyle = "rgba(255,255,255,.25)";
      c.fillRect(6, SURFACE - 8, W * 0.35, 3);
      for (const it of items) {
        if (it.kind === "seca") {
          c.fillStyle = "rgba(253,230,190,.55)";
          c.beginPath();
          c.ellipse(it.x, it.y, it.r, it.r * 0.7, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "rgba(120,53,15,.45)";
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(it.x - it.r * 0.6, it.y - 3);
          c.lineTo(it.x - it.r * 0.15, it.y + 4);
          c.lineTo(it.x + it.r * 0.2, it.y - 5);
          c.lineTo(it.x + it.r * 0.6, it.y + 2);
          c.stroke();
        } else if (it.kind === "piedra") {
          c.fillStyle = "#57534E";
          c.beginPath();
          c.ellipse(it.x, it.y + 2, it.r, it.r * 0.82, 0.2, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#A8A29E";
          c.beginPath();
          c.ellipse(it.x, it.y, it.r, it.r * 0.78, 0.2, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "rgba(255,255,255,.35)";
          c.beginPath();
          c.ellipse(it.x - it.r * 0.35, it.y - it.r * 0.3, it.r * 0.3, it.r * 0.15, -0.4, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    // la raíz se pinta por partes en dos capas (borde y centro), sin redibujarla completa
    const rootOuter = layer();
    const rootInner = layer();
    for (const L of [rootOuter.c, rootInner.c]) {
      L.lineCap = "round";
      L.lineJoin = "round";
    }
    rootOuter.c.strokeStyle = "#7C2D12";
    rootOuter.c.lineWidth = 10;
    rootInner.c.strokeStyle = "#FDE7C3";
    rootInner.c.lineWidth = 6.5;
    let drawn = { ...root[0] };
    const paintSeg = (x0: number, y0: number, x1: number, y1: number, scale = 1) => {
      for (const [L, wdt] of [
        [rootOuter.c, 10],
        [rootInner.c, 6.5],
      ] as const) {
        L.lineWidth = wdt * scale;
        L.beginPath();
        L.moveTo(x0, y0);
        L.lineTo(x1, y1);
        L.stroke();
      }
    };
    paintSeg(drawn.x, drawn.y, drawn.x, drawn.y + 0.1);
    const committed = new Set<Branch>();

    const draw = () => {
      ctx.drawImage(bg.cv, 0, 0, W, HEIGHT);

      // larvas de gallina ciega (cuerpo blanco con anillos, cabeza café)
      for (const w of grubs) {
        const body = grubBody(w);
        for (let i = body.length - 1; i >= 0; i--) {
          const b = body[i];
          ctx.fillStyle = i === 0 ? "#B45309" : i % 2 ? "#F5EBDD" : "#EADBC6";
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
        const h = body[0];
        ctx.fillStyle = "#3F1D0B";
        ctx.beginPath();
        ctx.arc(h.x + w.dir * 2.5, h.y - 1.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // tu planta arriba de la tierra
      const pimg = plantImgRef.current;
      if (pimg) {
        const dh = SURFACE - 6;
        const dw = dh * (240 / PLANT_SOIL_Y);
        ctx.save();
        ctx.translate(W / 2, SURFACE - 4);
        ctx.rotate(Math.sin(clock * 1.6) * 0.025);
        ctx.drawImage(pimg, 0, 0, pimg.width, pimg.height * (PLANT_SOIL_Y / 262), -dw / 2, -dh, dw, dh);
        ctx.restore();
      } else {
        ctx.strokeStyle = "#15803D";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(W / 2, SURFACE - 8);
        ctx.lineTo(W / 2, SURFACE - 44);
        ctx.stroke();
      }

      // raíz: solo se agrega el tramo nuevo
      const t = tip();
      if (t.x !== drawn.x || t.y !== drawn.y) {
        paintSeg(drawn.x, drawn.y, t.x, t.y);
        drawn = { ...t };
      }
      for (const b of branches) {
        if (b.grow >= 1 && !committed.has(b)) {
          committed.add(b);
          paintSeg(b.x, b.y, b.x + Math.cos(b.a) * b.len, b.y + Math.sin(b.a) * b.len, 0.45);
        }
      }
      ctx.save();
      if (shake > 0) ctx.translate(Math.sin(clock * 90) * 3, 0);
      ctx.drawImage(rootOuter.cv, 0, 0, W, HEIGHT);
      ctx.drawImage(rootInner.cv, 0, 0, W, HEIGHT);
      // ramitas que todavía están creciendo
      ctx.lineCap = "round";
      for (const b of branches) {
        if (committed.has(b)) continue;
        const ex = b.x + Math.cos(b.a) * b.len * b.grow;
        const ey = b.y + Math.sin(b.a) * b.len * b.grow;
        ctx.strokeStyle = "#7C2D12";
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.strokeStyle = "#FDE7C3";
        ctx.lineWidth = 2.9;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.fillStyle = "#FFF7ED";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
      ctx.fill();
      if (!pointerRef.current && runningRef.current) {
        const k = (clock * 1.4) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.8 - k * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 10 + k * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // agua y minerales
      for (const it of items) {
        if (it.kind === "agua") drawDrop(it.x, it.y + Math.sin(clock * 3 + it.id) * 2, 1);
        else if (it.kind === "mineral") drawSpark(it.x, it.y, 1);
      }

      ctx.textAlign = "center";
      ctx.font = "bold 18px Fredoka, system-ui, sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#fff";
      for (const f of floats) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      const sec = Math.ceil(left);
      if (score !== hudScore || sec !== hudSec) {
        hudScore = score;
        hudSec = sec;
        setHud({ score, left });
      }
      if (!finished) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = () => {
    pointerRef.current = null;
    setHud({ score: 0, left: DURATION });
    setPhase("countdown");
  };

  const best = state.stats.best.raices;

  return (
    <div className="space-y-3">
      <div ref={plantBoxRef} className="pointer-events-none fixed -left-[9999px] top-0 w-[240px]" aria-hidden="true">
        <PlantCharacter mood="feliz" stage={stage} pot={state.equipped.pot} accessory={state.equipped.accessory} />
      </div>
      {active && (
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white px-3 py-1.5 font-display text-xl font-bold shadow-sm">⭐ {hud.score}</div>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div
              className={cn("h-full rounded-full transition-[width] duration-100", hud.left < 6 ? "bg-alerta" : "bg-tierra")}
              style={{ width: `${(hud.left / DURATION) * 100}%` }}
            />
          </div>
          <div className={cn("w-14 rounded-2xl bg-white px-2 py-1.5 text-center font-display text-xl font-bold shadow-sm", hud.left < 6 && "text-alerta-dark")}>
            {Math.ceil(hud.left)}
          </div>
        </div>
      )}
      <div
        ref={wrapRef}
        className="keep-light relative flex flex-col overflow-hidden rounded-3xl border-4 border-white shadow-lg"
        style={{ height: active ? HEIGHT : undefined, minHeight: HEIGHT, background: "linear-gradient(180deg, #FEF3C7, #FDE68A)" }}
      >
        {active ? (
          <>
            <canvas
              ref={canvasRef}
              className="block touch-none select-none"
              onPointerDown={(e) => {
                e.preventDefault();
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  /* algunos navegadores no lo permiten */
                }
                if (runningRef.current) pointerRef.current = toLocal(e);
              }}
              onPointerMove={(e) => {
                if (runningRef.current && (pointerRef.current || e.pointerType === "mouse")) pointerRef.current = toLocal(e);
              }}
              onPointerUp={() => (pointerRef.current = null)}
              onPointerCancel={() => (pointerRef.current = null)}
              onPointerLeave={() => (pointerRef.current = null)}
            />
            {phase === "countdown" && (
              <Countdown
                onDone={() => {
                  runningRef.current = true;
                  setPhase("playing");
                }}
              />
            )}
          </>
        ) : phase === "over" && result ? (
          <GameResult
            className="bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A]"
            medal={result.score >= 250 ? "🏆" : result.score >= 120 ? "🥈" : "🌱"}
            title={`${result.score} puntos`}
            coins={result.coins}
            newBest={result.newBest}
            happy={result.happy}
            dailyDone={result.dailyDone}
            buttonTone="sol"
            onRetry={start}
            onExit={onExit}
          >
            <p className="max-w-[290px] rounded-2xl bg-white/75 px-3 py-2 text-sm leading-snug text-[#3E2C23]">
              🌱 Las raíces exploran la tierra buscando agua y minerales. Así alimentan a la planta y la sostienen firme.
            </p>
          </GameResult>
        ) : (
          <GameIntro
            emoji="🌱"
            title="Laberinto de Raíces"
            color="#92400E"
            best={best !== undefined ? `${best} pts` : null}
            buttonTone="sol"
            onStart={start}
          >
            <p>
              Desliza el dedo para que la raíz crezca. Atrapa <b>agua 💧</b> y <b>minerales ✨</b>.
            </p>
            <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
              Rodea las <b>piedras 🪨</b> (te quitan 2 s) y las <b>larvas de gallina ciega 🐛</b>, que se comen las raíces (-10).
            </p>
          </GameIntro>
        )}
      </div>
    </div>
  );
}
