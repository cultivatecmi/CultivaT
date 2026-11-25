"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { Countdown, GameIntro, GameResult } from "./GameUi";
import { isTourActive, tourHint } from "@/lib/tour";
import { playSound } from "@/lib/sound";

/**
 * 🐝 Vuelo de Polinización (sin límite de tiempo).
 * La abeja vuela hasta que toca el suelo. Cada nivel es un poco más difícil,
 * hasta un tope. Los puntos no tienen límite; las monedas y la XP sí.
 * Tocar = aletear; mantener y deslizar = la abeja sigue al dedo.
 *
 * Rendimiento: casi todo se dibuja con imágenes preparadas una sola vez
 * (fondo, flores, polen, pesticida y cuerpo de la abeja) y por cuadro solo se copian.
 */

const HEIGHT = 430;
const GROUND = HEIGHT - 44;
const BEE_X = 78;
const BEE_R = 14;
const HAPPY = 20;
const GUST_WARN = 1.5; // segundos de aviso antes de la ráfaga
const GUST_H = 46; // alto de la franja de viento
const LEVEL_SECONDS = 12; // cada cuánto sube de nivel
const MAX_LEVEL = 8; // a partir de aquí ya no se pone más difícil
const MAX_COINS = 40;
const MAX_HP = 100;
const HP_PEST = 30; // nube de pesticida
const HP_GUST = 25; // ráfaga de viento
const HP_FLOWER = 15; // cada flor polinizada cura
const MAX_XP = 30;

type Kind = "flor" | "polen" | "pesticida";
type FlowerType = "tomate" | "chile" | "girasol";
interface Obj {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  r: number;
  done: boolean;
  doneAt: number;
  flower?: FlowerType;
  phase: number;
}
interface Gust {
  y: number;
  warn: number;
  x: number;
  len: number;
  hit: boolean;
  speed: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  r: number;
}
interface Float {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  big?: boolean;
}
interface Result {
  score: number;
  coins: number;
  newBest: boolean;
  happy: number;
  dailyDone: boolean;
  level: number;
  reason: "suelo" | "vida";
  xp: number;
}

/** Puntos → monedas y XP con tope (los puntos no tienen tope) */
function capReward(score: number) {
  return { coins: Math.min(MAX_COINS, Math.floor(score / 10)), xp: Math.min(MAX_XP, Math.floor(score / 15)) };
}

export function PollinationGame({ onExit }: { onExit: () => void }) {
  const { recordGame, state } = useGameState();
  const [phase, setPhase] = useState<"intro" | "countdown" | "playing" | "over">("intro");
  const [result, setResult] = useState<Result | null>(null);
  const [hud, setHud] = useState({ score: 0, level: 1, hp: MAX_HP });

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(false);
  const inputRef = useRef({ down: false, y: 0, startY: 0, dragging: false, flap: false });
  const recordRef = useRef(recordGame);
  recordRef.current = recordGame;

  const active = phase === "countdown" || phase === "playing";

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = wrap.clientWidth;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // ------------------------------------------------------------ imágenes preparadas
    const sprite = (w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) => {
      const cv = document.createElement("canvas");
      cv.width = Math.ceil(w * dpr);
      cv.height = Math.ceil(h * dpr);
      const c = cv.getContext("2d")!;
      c.scale(dpr, dpr);
      paint(c);
      return cv;
    };
    const blit = (img: HTMLCanvasElement, cx: number, cy: number, w: number, h: number) => ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);

    const petals = (c: CanvasRenderingContext2D, x: number, y: number, n: number, len: number, w: number, color: string) => {
      c.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        c.beginPath();
        c.ellipse(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6, len * 0.55, w, a, 0, Math.PI * 2);
        c.fill();
      }
    };

    // cielo y sol (fijo)
    const SKY = sprite(W, GROUND, (c) => {
      const g = c.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, "#7DD3FC");
      g.addColorStop(0.65, "#E0F2FE");
      g.addColorStop(1, "#FEF3C7");
      c.fillStyle = g;
      c.fillRect(0, 0, W, GROUND);
      c.save();
      c.translate(W - 54, 56);
      c.fillStyle = "rgba(245,158,11,.22)";
      for (let i = 0; i < 10; i++) {
        c.rotate((Math.PI * 2) / 10);
        c.beginPath();
        c.moveTo(0, -30);
        c.lineTo(7, -48);
        c.lineTo(-7, -48);
        c.fill();
      }
      c.restore();
      c.fillStyle = "#FBBF24";
      c.beginPath();
      c.arc(W - 54, 56, 24, 0, Math.PI * 2);
      c.fill();
    });
    const CLOUD = sprite(90, 40, (c) => {
      c.fillStyle = "rgba(255,255,255,.85)";
      c.beginPath();
      c.ellipse(40, 24, 34, 13, 0, 0, Math.PI * 2);
      c.ellipse(58, 16, 20, 13, 0, 0, Math.PI * 2);
      c.fill();
    });
    // sierra: tira que se repite (periodo = 2W)
    const SIERRA_W = W * 2;
    const SIERRA = sprite(SIERRA_W, 110, (c) => {
      c.fillStyle = "#A5B4FC";
      c.beginPath();
      c.moveTo(0, 110);
      for (let x = 0; x <= SIERRA_W; x += 12) {
        const t = (x / SIERRA_W) * Math.PI * 2;
        c.lineTo(x, 46 - Math.sin(t * 3) * 16 - Math.sin(t * 8) * 6);
      }
      c.lineTo(SIERRA_W, 110);
      c.closePath();
      c.fill();
    });
    // campo: tira que se repite cada 40 px
    const FIELD_W = W + 40;
    const FIELD = sprite(FIELD_W, HEIGHT - GROUND + 26, (c) => {
      c.fillStyle = "#86EFAC";
      c.fillRect(0, 0, FIELD_W, 26);
      c.fillStyle = "#4ADE80";
      for (let x = 0; x < FIELD_W; x += 40) {
        c.beginPath();
        c.ellipse(x + 20, 13, 16, 7, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "#65A30D";
      c.fillRect(0, 26, FIELD_W, HEIGHT - GROUND);
      c.strokeStyle = "rgba(255,255,255,.18)";
      c.lineWidth = 2;
      for (let x = 0; x < FIELD_W; x += 40) {
        c.beginPath();
        c.moveTo(x, 26 + HEIGHT - GROUND);
        c.lineTo(x + 20, 26);
        c.stroke();
      }
      c.strokeStyle = "rgba(185,28,28,.4)";
      c.setLineDash([8, 8]);
      c.beginPath();
      c.moveTo(0, 25);
      c.lineTo(FIELD_W, 25);
      c.stroke();
    });

    const FS = 64; // tamaño del sprite de flor
    const flowerSprite = (type: FlowerType, done: boolean) =>
      sprite(FS, FS, (c) => {
        const x = FS / 2;
        const y = FS / 2;
        const r = type === "girasol" ? 18 : 15;
        if (type === "girasol") {
          petals(c, x, y, 12, r, 5, "#FACC15");
          c.fillStyle = "#78350F";
          c.beginPath();
          c.arc(x, y, r * 0.55, 0, Math.PI * 2);
          c.fill();
          if (done) {
            c.fillStyle = "#FDE68A";
            for (let i = 0; i < 7; i++) {
              c.beginPath();
              c.arc(x + Math.cos(i * 0.9) * 5, y + Math.sin(i * 1.7) * 5, 1.6, 0, Math.PI * 2);
              c.fill();
            }
          }
        } else if (type === "tomate") {
          if (done) {
            c.fillStyle = "#EF4444";
            c.beginPath();
            c.arc(x, y + 4, r * 0.85, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = "rgba(255,255,255,.45)";
            c.beginPath();
            c.arc(x - 4, y, 3.2, 0, Math.PI * 2);
            c.fill();
            petals(c, x, y - r * 0.5, 5, 7, 2.5, "#16A34A");
          } else {
            petals(c, x, y, 5, r, 5, "#FDE047");
            c.fillStyle = "#CA8A04";
            c.beginPath();
            c.arc(x, y, 5, 0, Math.PI * 2);
            c.fill();
          }
        } else if (done) {
          c.fillStyle = "#16A34A";
          c.beginPath();
          c.ellipse(x, y + 6, 6, r * 0.95, 0.25, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#166534";
          c.fillRect(x - 3, y - r * 0.6, 6, 6);
        } else {
          petals(c, x, y, 5, r, 5, "#FFFFFF");
          c.fillStyle = "#FACC15";
          c.beginPath();
          c.arc(x, y, 5, 0, Math.PI * 2);
          c.fill();
        }
      });
    const FLOWERS: Record<FlowerType, { open: HTMLCanvasElement; done: HTMLCanvasElement }> = {
      tomate: { open: flowerSprite("tomate", false), done: flowerSprite("tomate", true) },
      chile: { open: flowerSprite("chile", false), done: flowerSprite("chile", true) },
      girasol: { open: flowerSprite("girasol", false), done: flowerSprite("girasol", true) },
    };
    const GLOW = sprite(80, 80, (c) => {
      c.fillStyle = "rgba(253,224,71,.35)";
      c.beginPath();
      c.arc(40, 40, 34, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(253,224,71,.55)";
      c.beginPath();
      c.arc(40, 40, 26, 0, Math.PI * 2);
      c.fill();
    });
    const POLLEN = sprite(30, 30, (c) => {
      c.fillStyle = "rgba(251,191,36,.3)";
      c.beginPath();
      c.arc(15, 15, 12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#FBBF24";
      c.beginPath();
      c.arc(15, 15, 7, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#FEF3C7";
      c.beginPath();
      c.arc(13, 13, 2.4, 0, Math.PI * 2);
      c.fill();
    });
    const PEST = sprite(80, 64, (c) => {
      c.translate(40, 32);
      c.fillStyle = "#6B7280";
      [
        [0, 0, 18],
        [-17, 6, 13],
        [17, 6, 14],
        [-6, -10, 13],
        [9, -9, 12],
      ].forEach(([dx, dy, r]) => {
        c.beginPath();
        c.arc(dx, dy, r, 0, Math.PI * 2);
        c.fill();
      });
      c.fillStyle = "#9CA3AF";
      c.beginPath();
      c.arc(-4, -6, 10, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#F9FAFB";
      c.lineWidth = 2.5;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(-4, -1);
      c.lineTo(4, 7);
      c.moveTo(4, -1);
      c.lineTo(-4, 7);
      c.stroke();
    });
    // cuerpo de la abeja (sin alas): normal, parpadeo y lastimada
    const beeBody = (mode: "ok" | "blink" | "hurt") =>
      sprite(56, 40, (c) => {
        c.translate(30, 20);
        c.fillStyle = "rgba(250,204,21,.18)";
        c.beginPath();
        c.ellipse(-14, 2, 14, 8, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = mode === "hurt" ? "#D6D3D1" : "#FACC15";
        c.beginPath();
        c.ellipse(0, 0, 16, 11.5, 0, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.beginPath();
        c.ellipse(0, 0, 16, 11.5, 0, 0, Math.PI * 2);
        c.clip();
        c.fillStyle = "#1C1917";
        [-6, 2].forEach((sx) => c.fillRect(sx, -13, 4.5, 26));
        c.restore();
        c.fillStyle = "#1C1917";
        c.beginPath();
        c.moveTo(-16, -2);
        c.lineTo(-23, 0);
        c.lineTo(-16, 3);
        c.fill();
        c.fillStyle = "#fff";
        c.beginPath();
        c.ellipse(10, -3, 4.2, mode === "blink" ? 0.8 : 4.2, 0, 0, Math.PI * 2);
        c.fill();
        if (mode !== "blink") {
          c.fillStyle = "#1C1917";
          c.beginPath();
          c.arc(11, -2.5, 2.2, 0, Math.PI * 2);
          c.fill();
        }
        c.strokeStyle = "#1C1917";
        c.lineWidth = 1.6;
        c.beginPath();
        if (mode === "hurt") c.arc(10, 7, 3, Math.PI + 0.5, -0.5);
        else c.arc(10, 4, 3, 0.2, Math.PI - 0.6);
        c.stroke();
        c.beginPath();
        c.moveTo(12, -10);
        c.quadraticCurveTo(16, -18, 20, -17);
        c.stroke();
        c.fillStyle = "rgba(251,113,133,.6)";
        c.beginPath();
        c.arc(6, 4, 2.4, 0, Math.PI * 2);
        c.fill();
      });
    const BEE = { ok: beeBody("ok"), blink: beeBody("blink"), hurt: beeBody("hurt") };

    // ------------------------------------------------------------ estado
    const bee = { y: HEIGHT * 0.42, vy: 0, stun: 0, hurt: 0, squash: 0, spin: 0, pollen: 0, blink: 0 };
    const objs: Obj[] = [];
    const gusts: Gust[] = [];
    const sparks: Spark[] = [];
    const floats: Float[] = [];
    const clouds = Array.from({ length: 4 }, (_, i) => ({ x: (W / 4) * i + rand(0, 60), y: rand(30, 120), s: rand(0.6, 1.1) }));
    let nextId = 0;
    let score = 0;
    let elapsed = 0;
    let level = 1;
    let spawnIn = 0.8;
    let gustIn = 7;
    let scroll = 0;
    let clock = 0;
    let shake = 0;
    let flash = 0;
    let hudScore = -1;
    let hudLevel = -1;
    let hudHp = -1;
    let hp = MAX_HP;
    let reason: "suelo" | "vida" = "suelo";
    let falling = false;
    let fallT = 0;
    let finished = false;
    let started = false;
    let last = performance.now();
    let raf = 0;

    /** 0 → 1 según el nivel (tope en MAX_LEVEL) */
    const diff = () => (level - 1) / (MAX_LEVEL - 1);

    const add = (o: Omit<Obj, "id" | "done" | "doneAt" | "phase">) => objs.push({ ...o, id: ++nextId, done: false, doneAt: 0, phase: Math.random() * 6 });

    const burst = (x: number, y: number, colors: string[], n = 10, power = 160) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = power * (0.4 + Math.random() * 0.8);
        const life = 0.45 + Math.random() * 0.35;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life, max: life, color: colors[i % colors.length], r: 2 + Math.random() * 2.5 });
      }
    };

    const spawnWave = () => {
      const x = W + 40;
      if (Math.random() < 0.68 - 0.18 * diff()) {
        const types: FlowerType[] = ["tomate", "chile", "girasol"];
        const flower = types[Math.floor(Math.random() * 3)];
        const fy = rand(GROUND - 190, GROUND - 70);
        const py = Math.max(50, Math.min(GROUND - 40, fy + rand(-90, 90)));
        for (let i = 0; i < 4; i++) add({ kind: "polen", x: x + i * 26, y: py + Math.sin(i * 0.9) * 14, r: 7 });
        add({ kind: "flor", x: x + 4 * 26 + 70, y: fy, r: flower === "girasol" ? 18 : 15, flower });
      } else {
        add({ kind: "pesticida", x, y: rand(50, GROUND - 90), r: 30 });
      }
    };

    const spawnGust = () => {
      const y = Math.max(40, Math.min(GROUND - 40, bee.y + rand(-70, 70)));
      gusts.push({ y, warn: GUST_WARN, x: W + 20, len: W * 0.9, hit: false, speed: 720 + 200 * diff() });
      playSound("beep", 0.35);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      runningRef.current = false;
      const reward = capReward(score);
      const { newBest, happy, coins, dailyDone, xp } = recordRef.current("polinizacion", { score, ...reward, label: "por Vuelo de Polinización", happy: HAPPY });
      setResult({ score, coins, newBest, happy, level, reason, dailyDone, xp });
      setPhase("over");
    };

    const startFall = (why: "suelo" | "vida") => {
      reason = why;
      falling = true;
      runningRef.current = false;
      shake = 0.4;
      flash = 0.4;
      bee.vy = -160;
      playSound("wrong");
      if (navigator.vibrate) navigator.vibrate(120);
    };

    const floatText = (x: number, y: number, text: string, color: string, big = false) => floats.push({ x, y, text, color, life: big ? 1.4 : 0.9, big });

    const step = (dt: number) => {
      clock += dt;
      shake = Math.max(0, shake - dt);
      flash = Math.max(0, flash - dt);
      bee.squash = Math.max(0, bee.squash - dt * 4);
      bee.blink = bee.blink > 0 ? bee.blink - dt : Math.random() < dt * 0.4 ? 0.12 : 0;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 260 * dt;
        if (p.life <= 0) sparks.splice(i, 1);
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].life -= dt;
        floats[i].y -= dt * 34;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }
      for (const c of clouds) {
        c.x -= dt * 12 * c.s;
        if (c.x < -90) c.x = W + 40;
      }

      if (falling) {
        fallT += dt;
        bee.spin += dt * 9;
        bee.vy = Math.min(420, bee.vy + 900 * dt);
        bee.y = Math.min(GROUND - 6, bee.y + bee.vy * dt);
        if (fallT > 0.9) finish();
        return;
      }

      if (!runningRef.current) {
        bee.y = HEIGHT * 0.42 + Math.sin(clock * 3) * 6;
        return;
      }
      if (!started) {
        started = true;
        bee.vy = -180;
      }

      elapsed += dt;
      const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(elapsed / LEVEL_SECONDS));
      if (newLevel > level) {
        level = newLevel;
        playSound("correct", 0.6);
        floatText(W / 2, HEIGHT * 0.3, level === MAX_LEVEL ? `¡Nivel ${level}! Máximo 🔥` : `¡Nivel ${level}!`, "#15803D", true);
      }

      // control de la abeja
      const inp = inputRef.current;
      bee.stun = Math.max(0, bee.stun - dt);
      bee.hurt = Math.max(0, bee.hurt - dt);
      if (inp.flap && bee.stun <= 0) {
        bee.vy = -260;
        bee.squash = 1;
        inp.flap = false;
      }
      if (inp.down && inp.dragging && bee.stun <= 0) {
        bee.vy = 0;
        bee.y += (inp.y - bee.y) * Math.min(1, dt * 9);
      } else {
        bee.vy = Math.min(280, bee.vy + 650 * dt);
        bee.y += bee.vy * dt;
      }
      if (bee.y < 24) {
        bee.y = 24;
        bee.vy = Math.max(0, bee.vy);
      }
      if (bee.y >= GROUND - 12) {
        bee.y = GROUND - 12;
        startFall("suelo");
        burst(BEE_X, GROUND - 6, ["#A16207", "#65A30D", "#FDE68A"], 14, 180);
        return;
      }

      const d = diff();
      const speed = 150 + 170 * d;
      if (isTourActive()) {
        // el tour guía a la abeja hacia el siguiente polen o flor
        const next = objs.find((o) => !o.done && o.kind !== "pesticida" && o.x > BEE_X - 6);
        tourHint.beeY = next ? next.y : null;
      }
      scroll += speed * dt;
      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawnWave();
        spawnIn = rand(0.85, 1.35) * (1 - 0.3 * d);
      }
      gustIn -= dt;
      if (gustIn <= 0) {
        spawnGust();
        gustIn = rand(6.5, 9) - 3 * d;
      }

      for (let i = gusts.length - 1; i >= 0; i--) {
        const g = gusts[i];
        if (g.warn > 0) {
          g.warn -= dt;
          if (g.warn <= 0) playSound("whoosh");
          continue;
        }
        g.x -= g.speed * dt;
        if (g.x + g.len < -40) {
          gusts.splice(i, 1);
          continue;
        }
        const inBand = Math.abs(bee.y - g.y) < GUST_H / 2 + BEE_R - 4;
        const overBee = g.x < BEE_X + BEE_R && g.x + g.len > BEE_X - BEE_R;
        if (!g.hit && inBand && overBee) {
          g.hit = true;
          score = Math.max(0, score - 10);
          bee.vy = -280; // el viento la sacude hacia arriba, nunca al suelo
          bee.hurt = 0.6;
          bee.stun = 0.25;
          shake = 0.25;
          playSound("wrong", 0.7);
          burst(BEE_X, bee.y, ["#E0F2FE", "#BAE6FD", "#FFFFFF"], 10, 200);
          floatText(BEE_X + 20, bee.y - 24, "-10 💨", "#0369A1");
          hp = Math.max(0, hp - HP_GUST);
          if (hp <= 0) {
            startFall("vida");
            return;
          }
        }
      }

      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        o.x -= speed * dt;
        if (o.x < -60) {
          objs.splice(i, 1);
          continue;
        }
        if (o.done) continue;
        const dx = o.x - BEE_X;
        const dy = o.y - bee.y;
        const rr = o.r + BEE_R;
        if (dx * dx + dy * dy > rr * rr) continue;
        o.done = true;
        o.doneAt = clock;
        if (o.kind === "polen") {
          score += 5;
          bee.pollen = Math.min(6, bee.pollen + 1);
          playSound("pop", 0.6);
          burst(o.x, o.y, ["#FBBF24", "#FDE68A"], 6, 90);
          floatText(o.x, o.y - 10, "+5", "#B45309");
        } else if (o.kind === "flor") {
          score += 20;
          bee.pollen = 0;
          playSound("drop");
          burst(o.x, o.y, ["#FDE047", "#FFFFFF", "#86EFAC", "#F472B6"], 14, 170);
          floatText(o.x, o.y - 28, "+20 🌸", "#15803D");
          if (hp < MAX_HP) {
            hp = Math.min(MAX_HP, hp + HP_FLOWER);
            floatText(BEE_X, bee.y - 30, `+${HP_FLOWER} ❤️`, "#DB2777");
          }
        } else {
          score = Math.max(0, score - 15);
          bee.stun = 0.8;
          bee.hurt = 0.8;
          shake = 0.35;
          flash = 0.3;
          playSound("wrong");
          if (navigator.vibrate) navigator.vibrate(70);
          burst(o.x, o.y, ["#6B7280", "#9CA3AF"], 10, 120);
          floatText(BEE_X, bee.y - 24, "-15", "#B91C1C");
          hp = Math.max(0, hp - HP_PEST);
          if (hp <= 0) {
            startFall("vida");
            return;
          }
        }
      }
    };

    // ------------------------------------------------------------ dibujo
    const drawGustWarn = (g: Gust) => {
      const top = g.y - GUST_H / 2;
      const blink = Math.floor(g.warn * 6) % 2 === 0;
      ctx.fillStyle = blink ? "rgba(14,165,233,.16)" : "rgba(14,165,233,.08)";
      ctx.fillRect(0, top, W, GUST_H);
      ctx.fillStyle = "rgba(2,132,199,.55)";
      ctx.fillRect(0, top, W, 2);
      ctx.fillRect(0, top + GUST_H - 2, W, 2);
      for (let i = 0; i < 4; i++) {
        const ax = W - 70 - ((clock * 120 + i * 60) % 240);
        ctx.beginPath();
        ctx.moveTo(ax, g.y);
        ctx.lineTo(ax + 12, g.y - 9);
        ctx.lineTo(ax + 12, g.y + 9);
        ctx.closePath();
        ctx.fill();
      }
      const pulse = 17 + Math.sin(clock * 14) * 1.5;
      ctx.fillStyle = "#0284C7";
      ctx.beginPath();
      ctx.arc(W - 34, g.y, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W - 44, g.y - 5);
      ctx.lineTo(W - 26, g.y - 5);
      ctx.moveTo(W - 46, g.y + 1);
      ctx.lineTo(W - 22, g.y + 1);
      ctx.moveTo(W - 42, g.y + 7);
      ctx.lineTo(W - 28, g.y + 7);
      ctx.stroke();
    };

    const drawGust = (g: Gust) => {
      const top = g.y - GUST_H / 2;
      ctx.fillStyle = "rgba(224,242,254,.55)";
      ctx.fillRect(g.x, top, g.len * 0.6, GUST_H);
      ctx.fillStyle = "rgba(224,242,254,.25)";
      ctx.fillRect(g.x + g.len * 0.6, top, g.len * 0.4, GUST_H);
      ctx.strokeStyle = "rgba(255,255,255,.95)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const ly = top + 8 + i * ((GUST_H - 16) / 3);
        const off = (i % 2) * 40;
        ctx.moveTo(g.x + off, ly);
        ctx.lineTo(g.x + off + g.len * 0.65, ly);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.x + 10, g.y, 11, Math.PI * 0.5, Math.PI * 2.2);
      ctx.stroke();
    };

    const drawBee = () => {
      const tilt = falling ? bee.spin : Math.max(-0.5, Math.min(0.5, bee.vy / 600));
      const bob = falling ? 0 : Math.sin(clock * 10) * 1.5;
      ctx.save();
      ctx.translate(BEE_X, bee.y + bob);
      ctx.rotate(tilt);
      ctx.scale(1 + bee.squash * 0.12, 1 - bee.squash * 0.12);
      if (bee.hurt > 0 && Math.floor(clock * 20) % 2 === 0) ctx.globalAlpha = 0.5;
      // alas que aletean
      const flap = Math.sin(clock * 46) * 0.5 + 0.5;
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.ellipse(-3, -12 - flap * 4, 9, 5 + flap * 5, -0.6, 0, Math.PI * 2);
      ctx.ellipse(6, -11 - flap * 4, 8, 4 + flap * 4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      const body = bee.stun > 0 || bee.hurt > 0 || falling ? BEE.hurt : bee.blink > 0 ? BEE.blink : BEE.ok;
      ctx.drawImage(body, -30, -20, 56, 40);
      if (bee.pollen > 0) {
        ctx.fillStyle = "#F59E0B";
        ctx.beginPath();
        for (let i = 0; i < bee.pollen; i++) {
          ctx.moveTo(-8 + i * 3.4 + 2.4, 11 + (i % 2) * 2);
          ctx.arc(-8 + i * 3.4, 11 + (i % 2) * 2, 2.4, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.restore();
    };

    const draw = () => {
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 16 * shake, (Math.random() - 0.5) * 12 * shake);
      // fondo con imágenes que se repiten
      ctx.drawImage(SKY, 0, 0, W, GROUND);
      for (const c of clouds) ctx.drawImage(CLOUD, c.x, c.y, 90 * c.s, 40 * c.s);
      const sOff = -((scroll * 0.15) % SIERRA_W);
      ctx.drawImage(SIERRA, sOff, GROUND - 110, SIERRA_W, 110);
      ctx.drawImage(SIERRA, sOff + SIERRA_W, GROUND - 110, SIERRA_W, 110);
      ctx.drawImage(FIELD, -(scroll % 40), GROUND - 26, FIELD_W, HEIGHT - GROUND + 26);

      for (const g of gusts) if (g.warn > 0) drawGustWarn(g);

      // tallos (un solo trazo para todos) y flores
      ctx.strokeStyle = "#16A34A";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const o of objs) {
        if (o.kind !== "flor") continue;
        const hx = o.x + Math.sin(clock * 2 + o.phase) * 4;
        ctx.moveTo(o.x, GROUND);
        ctx.quadraticCurveTo(o.x - 8, (GROUND + o.y) / 2, hx, o.y + o.r * 0.6);
      }
      ctx.stroke();
      for (const o of objs) {
        if (o.kind !== "flor" || !o.flower) continue;
        const hx = o.x + Math.sin(clock * 2 + o.phase) * 4;
        if (!o.done) {
          ctx.globalAlpha = 0.55 + Math.sin(clock * 5 + o.phase) * 0.3;
          blit(GLOW, hx, o.y, o.r * 4.2, o.r * 4.2);
          ctx.globalAlpha = 1;
          blit(FLOWERS[o.flower].open, hx, o.y, FS, FS);
        } else {
          const k = Math.min(1, (clock - o.doneAt) / 0.35);
          const grow = 0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.25;
          blit(FLOWERS[o.flower].done, hx, o.y, FS * grow, FS * grow);
        }
      }
      for (const o of objs) {
        if (o.kind === "polen" && !o.done) {
          const tw = 30 * (1 + Math.sin(clock * 8 + o.phase) * 0.12);
          blit(POLLEN, o.x, o.y + Math.sin(clock * 3 + o.phase) * 3, tw, tw);
        } else if (o.kind === "pesticida") {
          const b = 1 + Math.sin(clock * 3 + o.phase) * 0.06;
          if (o.done) ctx.globalAlpha = 0.4;
          blit(PEST, o.x, o.y, 80 * b, 64 * b);
          ctx.fillStyle = "rgba(75,85,99,.8)";
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const dy = ((clock * 40 + i * 13) % 30) + 22;
            ctx.moveTo(o.x - 15 + i * 10 + 2.4, o.y + dy);
            ctx.arc(o.x - 15 + i * 10, o.y + dy, 2.4, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      drawBee();
      for (const g of gusts) if (g.warn <= 0) drawGust(g);

      for (const p of sparks) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      for (const f of floats) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
        ctx.font = f.big ? "bold 26px Fredoka, system-ui, sans-serif" : "bold 18px Fredoka, system-ui, sans-serif";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#fff";
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
      if (runningRef.current && elapsed < 2.2) {
        ctx.globalAlpha = Math.min(1, (2.2 - elapsed) * 1.5);
        ctx.font = "bold 20px Fredoka, system-ui, sans-serif";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#fff";
        ctx.strokeText("¡Toca para volar! 👆", W / 2, HEIGHT * 0.25);
        ctx.fillStyle = "#15803D";
        ctx.fillText("¡Toca para volar! 👆", W / 2, HEIGHT * 0.25);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (flash > 0) {
        ctx.strokeStyle = `rgba(239,68,68,${Math.min(1, flash * 1.6)})`;
        ctx.lineWidth = 18;
        ctx.strokeRect(0, 0, W, HEIGHT);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      if (score !== hudScore || level !== hudLevel || hp !== hudHp) {
        hudScore = score;
        hudLevel = level;
        hudHp = hp;
        setHud({ score, level, hp });
      }
      if (!finished) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const localY = (e: React.PointerEvent<HTMLCanvasElement>) => e.clientY - e.currentTarget.getBoundingClientRect().top;

  const start = () => {
    inputRef.current = { down: false, y: 0, startY: 0, dragging: false, flap: false };
    setHud({ score: 0, level: 1, hp: MAX_HP });
    setPhase("countdown");
  };

  const best = state.stats.best.polinizacion;

  return (
    <div className="space-y-3">
      {active && (
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white px-3 py-1.5 font-display text-xl font-bold shadow-sm">⭐ {hud.score}</div>
          <div className="rounded-2xl bg-[#DCFCE7] px-2.5 py-1.5 font-display text-base font-bold text-[#15803D] shadow-sm">Nv {hud.level}</div>
          <div className="flex flex-1 items-center gap-1.5 rounded-2xl bg-white px-2.5 py-2 shadow-sm" role="progressbar" aria-label="Vida de la abeja" aria-valuenow={hud.hp} aria-valuemin={0} aria-valuemax={MAX_HP}>
            <span className={hud.hp <= 30 ? "anim-wiggle" : ""}>❤️</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${(hud.hp / MAX_HP) * 100}%`, background: hud.hp > 60 ? "#22C55E" : hud.hp > 30 ? "#F59E0B" : "#EF4444" }}
              />
            </div>
          </div>
        </div>
      )}
      <div
        ref={wrapRef}
        className="keep-light relative overflow-hidden rounded-3xl border-4 border-white shadow-lg"
        style={{ height: HEIGHT, background: "linear-gradient(180deg, #DCFCE7, #BBF7D0)" }}
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
                if (!runningRef.current) return;
                const y = localY(e);
                inputRef.current = { down: true, y, startY: y, dragging: false, flap: true };
              }}
              onPointerMove={(e) => {
                const inp = inputRef.current;
                if (!inp.down) return;
                inp.y = localY(e);
                if (Math.abs(inp.y - inp.startY) > 8) inp.dragging = true;
              }}
              onPointerUp={() => {
                inputRef.current.down = false;
                inputRef.current.dragging = false;
              }}
              onPointerCancel={() => {
                inputRef.current.down = false;
                inputRef.current.dragging = false;
              }}
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
            className="bg-gradient-to-b from-[#DCFCE7] to-[#BBF7D0]"
            medal={result.score >= 400 ? "🏆" : result.score >= 200 ? "🥈" : "🐝"}
            title={`${result.score} puntos`}
            coins={result.coins}
            newBest={result.newBest}
            happy={result.happy}
            dailyDone={result.dailyDone}
            xp={result.xp}
            buttonTone="hoja"
            onRetry={start}
            onExit={onExit}
          >
            <p className="font-display text-base font-semibold text-[#15803D]">
              {result.reason === "vida" ? "¡La abeja se quedó sin vida!" : "¡La abeja tocó el suelo!"} Llegaste al nivel {result.level}
            </p>
            <p className="max-w-[290px] rounded-2xl bg-white/75 px-3 py-2 text-sm leading-snug text-[#3E2C23]">
              🐝 Las abejas llevan el polen de flor en flor. Sin ellas no nacerían tomates, chiles ni girasoles en los campos de Culiacán.
            </p>
          </GameResult>
        ) : (
          <GameIntro
            emoji="🐝"
            title="Vuelo de Polinización"
            color="#15803D"
            best={best !== undefined ? `${best} pts` : null}
            buttonTone="hoja"
            onStart={start}
          >
            <p>
              Toca para volar o desliza el dedo. Visita las <b>flores que brillan 🌼</b> y junta <b>polen</b>.
            </p>
            <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
              Vuela todo lo que puedas: <b>si tocas el suelo se acaba</b>. El <b>viento 💨</b> y el <b>pesticida ☁️</b> te quitan vida ❤️; las flores te curan.
            </p>
          </GameIntro>
        )}
      </div>
    </div>
  );
}
