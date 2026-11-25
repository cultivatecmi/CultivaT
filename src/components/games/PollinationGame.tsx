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
 * Flores iluminadas y polen suman; viento y nubes de pesticida restan.
 */

const DURATION = 30;
const HEIGHT = 430;
const GROUND = HEIGHT - 44;
const BEE_X = 78;
const BEE_R = 15;
const HAPPY = 20;

type Kind = "flor" | "polen" | "viento" | "pesticida";
type FlowerType = "tomate" | "chile" | "girasol";
interface Obj {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  r: number;
  done: boolean;
  flower?: FlowerType;
  phase: number;
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = wrap.clientWidth;
    canvas.width = W * dpr;
    canvas.height = HEIGHT * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const bee = { y: HEIGHT * 0.45, vy: 0, stun: 0, hurt: 0 };
    const objs: Obj[] = [];
    const floats: Float[] = [];
    let nextId = 0;
    let score = 0;
    let left = DURATION;
    let elapsed = 0;
    let spawnIn = 0.6;
    let scroll = 0;
    let clock = 0;
    let lastBeep = 99;
    let hudT = 0;
    let finished = false;
    let last = performance.now();
    let raf = 0;

    const add = (o: Omit<Obj, "id" | "done" | "phase">) => objs.push({ ...o, id: ++nextId, done: false, phase: Math.random() * 6 });

    const spawnWave = () => {
      const x = W + 40;
      const r = Math.random();
      if (r < 0.48) {
        // flor iluminada con una cadena de polen que lleva a ella
        const types: FlowerType[] = ["tomate", "chile", "girasol"];
        const flower = types[Math.floor(Math.random() * 3)];
        const fy = rand(GROUND - 190, GROUND - 70);
        const n = 4;
        const py = Math.max(50, Math.min(GROUND - 40, fy + rand(-90, 90)));
        for (let i = 0; i < n; i++) add({ kind: "polen", x: x + i * 26, y: py + Math.sin(i * 0.9) * 14, r: 7 });
        add({ kind: "flor", x: x + n * 26 + 70, y: fy, r: flower === "girasol" ? 18 : 15, flower });
      } else if (r < 0.74) {
        add({ kind: "viento", x, y: rand(60, GROUND - 60), r: 24 });
      } else {
        add({ kind: "pesticida", x, y: rand(50, GROUND - 90), r: 30 });
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      runningRef.current = false;
      const reward = scoreReward(score);
      const { newBest, happy } = recordRef.current("polinizacion", { score, ...reward, label: "por Vuelo de Polinización", happy: HAPPY });
      setResult({ score, coins: reward.coins, newBest, happy });
      setPhase("over");
    };

    const floatText = (x: number, y: number, text: string, color: string) => floats.push({ x, y, text, color, life: 0.9 });

    const step = (dt: number) => {
      clock += dt;
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].life -= dt;
        floats[i].y -= dt * 30;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }
      if (!runningRef.current) {
        bee.y = HEIGHT * 0.45 + Math.sin(clock * 3) * 6;
        return;
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
        finish();
        return;
      }

      // control de la abeja (física suave para niños)
      const inp = inputRef.current;
      bee.stun = Math.max(0, bee.stun - dt);
      bee.hurt = Math.max(0, bee.hurt - dt);
      if (inp.flap && bee.stun <= 0) {
        bee.vy = -270;
        inp.flap = false;
      }
      if (inp.down && inp.dragging && bee.stun <= 0) {
        bee.vy = 0;
        bee.y += (inp.y - bee.y) * Math.min(1, dt * 9);
      } else {
        bee.vy = Math.min(280, bee.vy + 650 * dt);
        bee.y += bee.vy * dt;
      }
      if (bee.y < 26) {
        bee.y = 26;
        bee.vy = Math.max(0, bee.vy);
      }
      if (bee.y > GROUND - 16) {
        bee.y = GROUND - 16;
        bee.vy = 0;
      }

      const speed = 150 + elapsed * 4;
      scroll += speed * dt;
      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawnWave();
        spawnIn = rand(0.85, 1.35);
      }

      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        o.x -= speed * dt;
        if (o.kind === "viento") o.y += Math.sin(clock * 3 + o.phase) * 30 * dt;
        if (o.x < -60) {
          objs.splice(i, 1);
          continue;
        }
        if (o.done) continue;
        const hit = Math.hypot(o.x - BEE_X, o.y - bee.y) < o.r + BEE_R;
        if (!hit) continue;
        if (o.kind === "polen") {
          o.done = true;
          score += 5;
          playSound("pop", 0.6);
          floatText(o.x, o.y - 10, "+5", "#B45309");
        } else if (o.kind === "flor") {
          o.done = true;
          score += 20;
          playSound("drop");
          floatText(o.x, o.y - 26, "+20 🌸", "#15803D");
        } else if (o.kind === "viento") {
          o.done = true;
          score = Math.max(0, score - 10);
          bee.vy = Math.random() < 0.5 ? -320 : 300;
          bee.hurt = 0.5;
          playSound("whoosh");
          floatText(BEE_X, bee.y - 24, "-10", "#0369A1");
        } else {
          o.done = true;
          score = Math.max(0, score - 15);
          bee.stun = 0.8;
          bee.hurt = 0.8;
          playSound("wrong");
          if (navigator.vibrate) navigator.vibrate(70);
          floatText(BEE_X, bee.y - 24, "-15", "#B91C1C");
        }
      }
    };

    // ---------------------------------------------------------------- dibujo
    const drawBackground = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, "#7DD3FC");
      sky.addColorStop(0.65, "#E0F2FE");
      sky.addColorStop(1, "#FEF3C7");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, GROUND);
      // sol cálido
      ctx.fillStyle = "rgba(245,158,11,.25)";
      ctx.beginPath();
      ctx.arc(W - 54, 56, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      ctx.arc(W - 54, 56, 24, 0, Math.PI * 2);
      ctx.fill();
      // sierra lejana
      ctx.fillStyle = "#A5B4FC";
      ctx.beginPath();
      ctx.moveTo(0, GROUND - 60);
      for (let x = 0; x <= W + 60; x += 60) {
        const off = (x + scroll * 0.15) % 120;
        ctx.lineTo(x, GROUND - 70 - (off < 60 ? off : 120 - off) * 0.5);
      }
      ctx.lineTo(W, GROUND);
      ctx.lineTo(0, GROUND);
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
    };

    const petals = (x: number, y: number, n: number, len: number, w: number, color: string) => {
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + clock * 0.3;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6, len * 0.55, w, a, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawFlower = (o: Obj) => {
      // tallo
      ctx.strokeStyle = "#16A34A";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(o.x, GROUND);
      ctx.quadraticCurveTo(o.x - 8, (GROUND + o.y) / 2, o.x, o.y + o.r * 0.6);
      ctx.stroke();
      ctx.fillStyle = "#22C55E";
      ctx.beginPath();
      ctx.ellipse(o.x - 10, (GROUND + o.y) / 2 + 10, 10, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // brillo: flor lista para polinizar
      if (!o.done) {
        const g = 0.45 + Math.sin(clock * 5 + o.phase) * 0.2;
        ctx.fillStyle = `rgba(253,224,71,${g})`;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r + 12, 0, Math.PI * 2);
        ctx.fill();
      }
      if (o.flower === "girasol") {
        petals(o.x, o.y, 12, o.r, 5, "#FACC15");
        ctx.fillStyle = "#78350F";
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        if (o.done) {
          ctx.fillStyle = "#FDE68A";
          for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(o.x + Math.cos(i) * 5, o.y + Math.sin(i * 2) * 5, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (o.flower === "tomate") {
        if (o.done) {
          // ¡ya nació un tomate!
          ctx.fillStyle = "#EF4444";
          ctx.beginPath();
          ctx.arc(o.x, o.y + 4, o.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.4)";
          ctx.beginPath();
          ctx.arc(o.x - 5, o.y - 1, 3.5, 0, Math.PI * 2);
          ctx.fill();
          petals(o.x, o.y - o.r * 0.6, 5, 7, 2.5, "#16A34A");
        } else {
          petals(o.x, o.y, 5, o.r, 5, "#FDE047");
          ctx.fillStyle = "#CA8A04";
          ctx.beginPath();
          ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (o.done) {
        // ¡ya nació un chile!
        ctx.fillStyle = "#16A34A";
        ctx.beginPath();
        ctx.ellipse(o.x, o.y + 6, 6, o.r * 0.9, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#166534";
        ctx.fillRect(o.x - 3, o.y - o.r * 0.6, 6, 6);
      } else {
        petals(o.x, o.y, 5, o.r, 5, "#FFFFFF");
        ctx.fillStyle = "#FACC15";
        ctx.beginPath();
        ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawWind = (o: Obj) => {
      ctx.strokeStyle = "rgba(255,255,255,.95)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        const y = o.y + i * 11;
        ctx.beginPath();
        ctx.moveTo(o.x - 26 + Math.abs(i) * 6, y);
        ctx.quadraticCurveTo(o.x, y - 9, o.x + 18, y);
        ctx.arc(o.x + 18, y - 6, 6, Math.PI / 2, -Math.PI, true);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(14,116,144,.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawPesticide = (o: Obj) => {
      ctx.fillStyle = "#6B7280";
      [
        [0, 0, 18],
        [-17, 6, 13],
        [17, 6, 14],
        [-6, -10, 13],
        [9, -9, 12],
      ].forEach(([dx, dy, r]) => {
        ctx.beginPath();
        ctx.arc(o.x + dx, o.y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#9CA3AF";
      ctx.beginPath();
      ctx.arc(o.x - 4, o.y - 6, 10, 0, Math.PI * 2);
      ctx.fill();
      // gotitas tóxicas
      ctx.fillStyle = "rgba(75,85,99,.8)";
      for (let i = 0; i < 4; i++) {
        const dy = ((clock * 40 + i * 13) % 30) + 22;
        ctx.beginPath();
        ctx.arc(o.x - 15 + i * 10, o.y + dy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = "bold 13px Fredoka, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#F9FAFB";
      ctx.fillText("✕", o.x, o.y + 4);
    };

    const drawBee = () => {
      const y = bee.y;
      const tilt = Math.max(-0.5, Math.min(0.5, bee.vy / 600));
      ctx.save();
      ctx.translate(BEE_X, y);
      ctx.rotate(tilt);
      if (bee.hurt > 0 && Math.floor(clock * 20) % 2 === 0) ctx.globalAlpha = 0.5;
      // alas que aletean
      const flap = Math.sin(clock * 40) * 0.5 + 0.5;
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.strokeStyle = "rgba(14,116,144,.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(-3, -13 - flap * 3, 9, 6 + flap * 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(6, -12 - flap * 3, 8, 5 + flap * 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // cuerpo con rayas
      ctx.fillStyle = bee.stun > 0 ? "#D6D3D1" : "#FACC15";
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 12, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#1C1917";
      [-6, 2].forEach((sx) => ctx.fillRect(sx, -13, 4.5, 26));
      ctx.restore();
      // aguijón y cara
      ctx.fillStyle = "#1C1917";
      ctx.beginPath();
      ctx.moveTo(-17, -2);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-17, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(10, -3, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1C1917";
      ctx.beginPath();
      ctx.arc(11, -2.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1C1917";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(10, 4, 3, 0.2, Math.PI - 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, -10);
      ctx.quadraticCurveTo(16, -18, 20, -17);
      ctx.stroke();
      ctx.fillStyle = "rgba(251,113,133,.6)";
      ctx.beginPath();
      ctx.arc(6, 4, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, HEIGHT);
      drawBackground();
      objs.forEach((o) => {
        if (o.kind === "flor") drawFlower(o);
      });
      objs.forEach((o) => {
        if (o.kind === "polen" && !o.done) {
          ctx.shadowColor = "rgba(251,191,36,.9)";
          ctx.shadowBlur = 10;
          ctx.fillStyle = "#FBBF24";
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#FEF3C7";
          ctx.beginPath();
          ctx.arc(o.x - 2, o.y - 2, 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "viento" && !o.done) drawWind(o);
        else if (o.kind === "pesticida") {
          ctx.globalAlpha = o.done ? 0.45 : 1;
          drawPesticide(o);
          ctx.globalAlpha = 1;
        }
      });
      drawBee();
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
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      hudT += dt;
      if (hudT > 0.1) {
        hudT = 0;
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
            medal={result.score >= 250 ? "🏆" : result.score >= 120 ? "🥈" : "🌱"}
            title={`${result.score} puntos`}
            coins={result.coins}
            newBest={result.newBest}
            happy={result.happy}
            buttonTone="hoja"
            onRetry={start}
            onExit={onExit}
          >
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
              Esquiva el <b>viento 💨</b> y las <b>nubes de pesticida ☁️</b>.
            </p>
          </GameIntro>
        )}
      </div>
    </div>
  );
}
