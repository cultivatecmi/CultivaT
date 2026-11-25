"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { Countdown, GameIntro, GameResult } from "./GameUi";
import { scoreReward } from "@/lib/games";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * 🐝 Vuelo de Polinización: la abeja vuela sobre un campo de Sinaloa.
 * Tocar = aletear hacia arriba; mantener y deslizar = la abeja sigue al dedo.
 * Si la abeja toca el suelo, se acaba el juego.
 * Las ráfagas de viento cruzan toda la pantalla de derecha a izquierda y se avisan antes.
 */

const DURATION = 30;
const HEIGHT = 430;
const GROUND = HEIGHT - 44;
const BEE_X = 78;
const BEE_R = 14;
const HAPPY = 20;
const GUST_WARN = 1.5; // segundos de aviso antes de la ráfaga
const GUST_H = 46; // alto de la franja de viento
const GUST_SPEED = 720;

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
  x: number; // frente de la ráfaga (se mueve a la izquierda)
  len: number;
  hit: boolean;
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
}
interface Result {
  score: number;
  coins: number;
  newBest: boolean;
  happy: number;
  fell: boolean;
}

export function PollinationGame({ onExit }: { onExit: () => void }) {
  const { recordGame, state } = useGameState();
  const [phase, setPhase] = useState<"intro" | "countdown" | "playing" | "over">("intro");
  const [result, setResult] = useState<Result | null>(null);
  const [hud, setHud] = useState({ score: 0, left: DURATION });

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
    const bee = { y: HEIGHT * 0.42, vy: 0, stun: 0, hurt: 0, squash: 0, spin: 0, pollen: 0, blink: 0 };
    const objs: Obj[] = [];
    const gusts: Gust[] = [];
    const sparks: Spark[] = [];
    const floats: Float[] = [];
    const clouds = Array.from({ length: 4 }, (_, i) => ({ x: (W / 4) * i + rand(0, 60), y: rand(30, 120), s: rand(0.6, 1.1) }));
    let nextId = 0;
    let score = 0;
    let left = DURATION;
    let elapsed = 0;
    let spawnIn = 0.8;
    let gustIn = 7;
    let scroll = 0;
    let clock = 0;
    let shake = 0;
    let flash = 0;
    let lastBeep = 99;
    let hudScore = -1;
    let hudSec = -1;
    let falling = false;
    let fallT = 0;
    let finished = false;
    let started = false;
    let last = performance.now();
    let raf = 0;

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
      if (Math.random() < 0.68) {
        // flor iluminada con una cadena de polen que lleva a ella
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
      // franja horizontal cerca de la abeja, para que haya que reaccionar
      const y = Math.max(40, Math.min(GROUND - 40, bee.y + rand(-70, 70)));
      gusts.push({ y, warn: GUST_WARN, x: W + 20, len: W * 0.9, hit: false });
      playSound("beep", 0.35);
    };

    const finish = (fell: boolean) => {
      if (finished) return;
      finished = true;
      runningRef.current = false;
      const reward = scoreReward(score);
      const { newBest, happy } = recordRef.current("polinizacion", { score, ...reward, label: "por Vuelo de Polinización", happy: HAPPY });
      setResult({ score, coins: reward.coins, newBest, happy, fell });
      setPhase("over");
    };

    const floatText = (x: number, y: number, text: string, color: string) => floats.push({ x, y, text, color, life: 0.9 });

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
      clouds.forEach((c) => {
        c.x -= dt * 12 * c.s;
        if (c.x < -90) c.x = W + 40;
      });

      // la abeja cayó al suelo: gira, cae y termina el juego
      if (falling) {
        fallT += dt;
        bee.spin += dt * 9;
        bee.vy = Math.min(420, bee.vy + 900 * dt);
        bee.y = Math.min(GROUND - 6, bee.y + bee.vy * dt);
        if (fallT > 0.9) finish(true);
        return;
      }

      if (!runningRef.current) {
        bee.y = HEIGHT * 0.42 + Math.sin(clock * 3) * 6;
        return;
      }
      if (!started) {
        started = true;
        bee.vy = -180; // primer impulso para empezar en el aire
      }

      elapsed += dt;
      left -= dt;
      const sec = Math.ceil(left);
      if (sec <= 5 && sec > 0 && sec < lastBeep) {
        lastBeep = sec;
        playSound("beep", 0.5);
      }
      if (left <= 0) {
        left = 0;
        finish(false);
        return;
      }

      // control de la abeja (física suave para niños)
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
        // ¡tocó el suelo!
        bee.y = GROUND - 12;
        falling = true;
        runningRef.current = false;
        shake = 0.4;
        flash = 0.4;
        bee.vy = -160;
        playSound("wrong");
        if (navigator.vibrate) navigator.vibrate(120);
        burst(BEE_X, GROUND - 6, ["#A16207", "#65A30D", "#FDE68A"], 14, 180);
        return;
      }

      const speed = 150 + elapsed * 4;
      scroll += speed * dt;
      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawnWave();
        spawnIn = rand(0.85, 1.35);
      }
      gustIn -= dt;
      if (gustIn <= 0) {
        spawnGust();
        gustIn = rand(6.5, 9);
      }

      // ráfagas: aviso y luego cruzan la pantalla
      for (let i = gusts.length - 1; i >= 0; i--) {
        const g = gusts[i];
        if (g.warn > 0) {
          g.warn -= dt;
          if (g.warn <= 0) playSound("whoosh");
          continue;
        }
        g.x -= GUST_SPEED * dt;
        if (g.x + g.len < -40) {
          gusts.splice(i, 1);
          continue;
        }
        const inBand = Math.abs(bee.y - g.y) < GUST_H / 2 + BEE_R - 4;
        const overBee = g.x < BEE_X + BEE_R && g.x + g.len > BEE_X - BEE_R;
        if (!g.hit && inBand && overBee) {
          g.hit = true;
          score = Math.max(0, score - 10);
          // el viento la sacude hacia arriba (nunca la avienta al suelo)
          bee.vy = -280;
          bee.hurt = 0.6;
          bee.stun = 0.25;
          shake = 0.25;
          playSound("wrong", 0.7);
          burst(BEE_X, bee.y, ["#E0F2FE", "#BAE6FD", "#FFFFFF"], 10, 200);
          floatText(BEE_X + 20, bee.y - 24, "-10 💨", "#0369A1");
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
        const hit = Math.hypot(o.x - BEE_X, o.y - bee.y) < o.r + BEE_R;
        if (!hit) continue;
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
          burst(o.x, o.y, ["#FDE047", "#FFFFFF", "#86EFAC", "#F472B6"], 16, 170);
          floatText(o.x, o.y - 28, "+20 🌸", "#15803D");
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
        }
      }
    };

    // ---------------------------------------------------------------- dibujo
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "#7DD3FC");
    sky.addColorStop(0.65, "#E0F2FE");
    sky.addColorStop(1, "#FEF3C7");

    const drawBackground = () => {
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, GROUND);
      // sol con rayos que giran
      ctx.save();
      ctx.translate(W - 54, 56);
      ctx.rotate(clock * 0.25);
      ctx.fillStyle = "rgba(245,158,11,.22)";
      for (let i = 0; i < 10; i++) {
        ctx.rotate((Math.PI * 2) / 10);
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(7, -48);
        ctx.lineTo(-7, -48);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      ctx.arc(W - 54, 56, 24, 0, Math.PI * 2);
      ctx.fill();
      // nubes que pasan despacio
      clouds.forEach((c) => {
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 34 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 18 * c.s, c.y - 8 * c.s, 20 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // sierra lejana (parallax)
      ctx.fillStyle = "#A5B4FC";
      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      for (let x = -60; x <= W + 60; x += 30) {
        const wx = x + scroll * 0.15;
        ctx.lineTo(x, GROUND - 62 - Math.sin(wx * 0.025) * 16 - Math.sin(wx * 0.07) * 6);
      }
      ctx.lineTo(W, GROUND);
      ctx.closePath();
      ctx.fill();
      // surcos del campo
      ctx.fillStyle = "#86EFAC";
      ctx.fillRect(0, GROUND - 26, W, 26);
      ctx.fillStyle = "#4ADE80";
      for (let x = -((scroll * 0.6) % 34); x < W; x += 34) {
        ctx.beginPath();
        ctx.ellipse(x + 17, GROUND - 13, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#65A30D";
      ctx.fillRect(0, GROUND, W, HEIGHT - GROUND);
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 2;
      for (let x = -(scroll % 40); x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, HEIGHT);
        ctx.lineTo(x + 20, GROUND);
        ctx.stroke();
      }
      // línea de peligro del suelo
      ctx.strokeStyle = "rgba(185,28,28,.35)";
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -scroll * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND - 1);
      ctx.lineTo(W, GROUND - 1);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const petals = (x: number, y: number, n: number, len: number, w: number, color: string, spin = 0) => {
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + spin;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6, len * 0.55, w, a, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawFlower = (o: Obj) => {
      const sway = Math.sin(clock * 2 + o.phase) * 4;
      const hx = o.x + sway;
      // tallo que se mece
      ctx.strokeStyle = "#16A34A";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(o.x, GROUND);
      ctx.quadraticCurveTo(o.x - 8, (GROUND + o.y) / 2, hx, o.y + o.r * 0.6);
      ctx.stroke();
      ctx.fillStyle = "#22C55E";
      ctx.beginPath();
      ctx.ellipse(o.x - 10, (GROUND + o.y) / 2 + 10, 10, 4, -0.5 + sway * 0.03, 0, Math.PI * 2);
      ctx.fill();
      // brillo pulsante: flor lista para polinizar
      if (!o.done) {
        const g = 0.25 + Math.sin(clock * 5 + o.phase) * 0.12;
        ctx.fillStyle = `rgba(253,224,71,${g * 0.6})`;
        ctx.beginPath();
        ctx.arc(hx, o.y, o.r + 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(253,224,71,${g})`;
        ctx.beginPath();
        ctx.arc(hx, o.y, o.r + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      // el fruto crece con un pequeño rebote
      const k = o.done ? Math.min(1, (clock - o.doneAt) / 0.35) : 0;
      const grow = o.done ? 0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.25 : 1;
      ctx.save();
      ctx.translate(hx, o.y);
      ctx.scale(grow, grow);
      ctx.translate(-hx, -o.y);
      if (o.flower === "girasol") {
        petals(hx, o.y, 12, o.r, 5, "#FACC15", clock * 0.2);
        ctx.fillStyle = "#78350F";
        ctx.beginPath();
        ctx.arc(hx, o.y, o.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        if (o.done) {
          ctx.fillStyle = "#FDE68A";
          for (let i = 0; i < 7; i++) {
            ctx.beginPath();
            ctx.arc(hx + Math.cos(i * 0.9) * 5, o.y + Math.sin(i * 1.7) * 5, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (o.flower === "tomate") {
        if (o.done) {
          ctx.fillStyle = "#EF4444";
          ctx.beginPath();
          ctx.arc(hx, o.y + 4, o.r * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.45)";
          ctx.beginPath();
          ctx.arc(hx - 4, o.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          petals(hx, o.y - o.r * 0.5, 5, 7, 2.5, "#16A34A");
        } else {
          petals(hx, o.y, 5, o.r, 5, "#FDE047", clock * 0.3);
          ctx.fillStyle = "#CA8A04";
          ctx.beginPath();
          ctx.arc(hx, o.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (o.done) {
        ctx.fillStyle = "#16A34A";
        ctx.beginPath();
        ctx.ellipse(hx, o.y + 6, 6, o.r * 0.95, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#166534";
        ctx.fillRect(hx - 3, o.y - o.r * 0.6, 6, 6);
      } else {
        petals(hx, o.y, 5, o.r, 5, "#FFFFFF", clock * 0.3);
        ctx.fillStyle = "#FACC15";
        ctx.beginPath();
        ctx.arc(hx, o.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawPesticide = (o: Obj) => {
      const breathe = 1 + Math.sin(clock * 3 + o.phase) * 0.06;
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.scale(breathe, breathe);
      ctx.fillStyle = "#6B7280";
      [
        [0, 0, 18],
        [-17, 6, 13],
        [17, 6, 14],
        [-6, -10, 13],
        [9, -9, 12],
      ].forEach(([dx, dy, r]) => {
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#9CA3AF";
      ctx.beginPath();
      ctx.arc(-4, -6, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 14px Fredoka, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#F9FAFB";
      ctx.fillText("✕", 0, 5);
      ctx.restore();
      // gotitas tóxicas que caen
      ctx.fillStyle = "rgba(75,85,99,.8)";
      for (let i = 0; i < 4; i++) {
        const dy = ((clock * 40 + i * 13) % 30) + 22;
        ctx.beginPath();
        ctx.arc(o.x - 15 + i * 10, o.y + dy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawGust = (g: Gust) => {
      const top = g.y - GUST_H / 2;
      if (g.warn > 0) {
        // aviso: franja punteada parpadeante, flechas y señal a la derecha
        const blink = Math.floor(g.warn * 6) % 2 === 0;
        ctx.fillStyle = blink ? "rgba(14,165,233,.16)" : "rgba(14,165,233,.08)";
        ctx.fillRect(0, top, W, GUST_H);
        ctx.strokeStyle = "rgba(2,132,199,.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = clock * 40;
        ctx.beginPath();
        ctx.moveTo(0, top);
        ctx.lineTo(W, top);
        ctx.moveTo(0, top + GUST_H);
        ctx.lineTo(W, top + GUST_H);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(2,132,199,.5)";
        for (let i = 0; i < 4; i++) {
          const ax = W - 70 - ((clock * 120 + i * 60) % 240);
          ctx.beginPath();
          ctx.moveTo(ax, g.y);
          ctx.lineTo(ax + 12, g.y - 9);
          ctx.lineTo(ax + 12, g.y + 9);
          ctx.closePath();
          ctx.fill();
        }
        const pulse = 1 + Math.sin(clock * 14) * 0.08;
        ctx.save();
        ctx.translate(W - 34, g.y);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "#0284C7";
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💨", 0, 1);
        ctx.restore();
        ctx.textBaseline = "alphabetic";
        return;
      }
      // ráfaga cruzando de derecha a izquierda
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top - 6, W, GUST_H + 12);
      ctx.clip();
      ctx.fillStyle = "rgba(224,242,254,.55)";
      ctx.fillRect(g.x, top, g.len * 0.6, GUST_H);
      ctx.fillStyle = "rgba(224,242,254,.25)";
      ctx.fillRect(g.x + g.len * 0.6, top, g.len * 0.4, GUST_H);
      ctx.strokeStyle = "rgba(255,255,255,.95)";
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const ly = top + 8 + i * ((GUST_H - 16) / 3);
        const off = (i % 2) * 40;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(g.x + off, ly);
        for (let x = 0; x < g.len * 0.7; x += 30) ctx.lineTo(g.x + off + x, ly + Math.sin((x + clock * 300) * 0.05) * 3);
        ctx.stroke();
      }
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x + 10, g.y, 11, Math.PI * 0.5, Math.PI * 2.2);
      ctx.stroke();
      ctx.restore();
    };

    const drawBee = () => {
      const y = bee.y;
      const tilt = falling ? bee.spin : Math.max(-0.5, Math.min(0.5, bee.vy / 600));
      const bob = falling ? 0 : Math.sin(clock * 10) * 1.5;
      ctx.save();
      ctx.translate(BEE_X, y + bob);
      ctx.rotate(tilt);
      ctx.scale(1 + bee.squash * 0.12, 1 - bee.squash * 0.12);
      if (bee.hurt > 0 && Math.floor(clock * 20) % 2 === 0) ctx.globalAlpha = 0.5;
      // estela de velocidad
      ctx.fillStyle = "rgba(250,204,21,.18)";
      ctx.beginPath();
      ctx.ellipse(-14, 2, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // alas que aletean
      const flap = Math.sin(clock * 46) * 0.5 + 0.5;
      ctx.fillStyle = "rgba(255,255,255,.88)";
      ctx.strokeStyle = "rgba(14,116,144,.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(-3, -12 - flap * 4, 9, 5 + flap * 5, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(6, -11 - flap * 4, 8, 4 + flap * 4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // cuerpo con rayas
      ctx.fillStyle = bee.stun > 0 ? "#D6D3D1" : "#FACC15";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 11.5, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#1C1917";
      [-6, 2].forEach((sx) => ctx.fillRect(sx, -13, 4.5, 26));
      ctx.restore();
      // polen que lleva en las patitas
      ctx.fillStyle = "#F59E0B";
      for (let i = 0; i < bee.pollen; i++) {
        ctx.beginPath();
        ctx.arc(-8 + i * 3.4, 11 + (i % 2) * 2, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // aguijón y cara
      ctx.fillStyle = "#1C1917";
      ctx.beginPath();
      ctx.moveTo(-16, -2);
      ctx.lineTo(-23, 0);
      ctx.lineTo(-16, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(10, -3, 4.2, bee.blink > 0 ? 0.8 : 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (bee.blink <= 0) {
        ctx.fillStyle = "#1C1917";
        ctx.beginPath();
        ctx.arc(11, -2.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#1C1917";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (bee.hurt > 0 || falling) ctx.arc(10, 7, 3, Math.PI + 0.5, -0.5);
      else ctx.arc(10, 4, 3, 0.2, Math.PI - 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, -10);
      ctx.quadraticCurveTo(16, -18 - flap * 2, 20, -17);
      ctx.stroke();
      ctx.fillStyle = "rgba(251,113,133,.6)";
      ctx.beginPath();
      ctx.arc(6, 4, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 16 * shake, (Math.random() - 0.5) * 12 * shake);
      ctx.clearRect(-10, -10, W + 20, HEIGHT + 20);
      drawBackground();
      gusts.forEach((g) => g.warn > 0 && drawGust(g));
      objs.forEach((o) => {
        if (o.kind === "flor") drawFlower(o);
      });
      objs.forEach((o) => {
        if (o.kind === "polen" && !o.done) {
          const tw = 1 + Math.sin(clock * 8 + o.phase) * 0.15;
          const py = o.y + Math.sin(clock * 3 + o.phase) * 3;
          ctx.fillStyle = "rgba(251,191,36,.3)";
          ctx.beginPath();
          ctx.arc(o.x, py, o.r * tw + 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FBBF24";
          ctx.beginPath();
          ctx.arc(o.x, py, o.r * tw, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FEF3C7";
          ctx.beginPath();
          ctx.arc(o.x - 2, py - 2, 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "pesticida") {
          ctx.globalAlpha = o.done ? 0.4 : 1;
          drawPesticide(o);
          ctx.globalAlpha = 1;
        }
      });
      drawBee();
      gusts.forEach((g) => g.warn <= 0 && drawGust(g));
      sparks.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      floats.forEach((f) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
        ctx.font = "bold 18px Fredoka, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#fff";
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      });
      // ayuda al empezar
      if (runningRef.current && elapsed < 2.2) {
        ctx.globalAlpha = Math.min(1, (2.2 - elapsed) * 1.5);
        ctx.font = "bold 20px Fredoka, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#fff";
        ctx.strokeText("¡Toca para volar! 👆", W / 2, HEIGHT * 0.25);
        ctx.fillStyle = "#15803D";
        ctx.fillText("¡Toca para volar! 👆", W / 2, HEIGHT * 0.25);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // destello rojo al chocar
      if (flash > 0) {
        ctx.strokeStyle = `rgba(239,68,68,${flash * 1.6})`;
        ctx.lineWidth = 18;
        ctx.strokeRect(0, 0, W, HEIGHT);
      }
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

  const localY = (e: React.PointerEvent<HTMLCanvasElement>) => e.clientY - e.currentTarget.getBoundingClientRect().top;

  const start = () => {
    inputRef.current = { down: false, y: 0, startY: 0, dragging: false, flap: false };
    setHud({ score: 0, left: DURATION });
    setPhase("countdown");
  };

  const best = state.stats.best.polinizacion;

  return (
    <div className="space-y-3">
      {active && (
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white px-3 py-1.5 font-display text-xl font-bold shadow-sm">⭐ {hud.score}</div>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div
              className={cn("h-full rounded-full transition-[width] duration-100", hud.left < 6 ? "bg-alerta" : "bg-sol")}
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
            medal={result.fell ? "🐝" : result.score >= 250 ? "🏆" : result.score >= 120 ? "🥈" : "🌱"}
            title={`${result.score} puntos`}
            coins={result.coins}
            newBest={result.newBest}
            happy={result.happy}
            buttonTone="hoja"
            onRetry={start}
            onExit={onExit}
          >
            {result.fell && <p className="font-display text-base font-semibold text-[#B91C1C]">¡La abeja tocó el suelo!</p>}
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
              ¡No toques el suelo! Esquiva las <b>ráfagas de viento 💨</b> (se avisan antes) y el <b>pesticida ☁️</b>.
            </p>
          </GameIntro>
        )}
      </div>
    </div>
  );
}
