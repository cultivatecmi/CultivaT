"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { Countdown, GameIntro, GameResult } from "./GameUi";
import { scoreReward } from "@/lib/games";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * 🌱 Laberinto de Raíces: vista bajo la tierra de una maceta. El niño desliza el dedo
 * y la raíz crece hacia él, recogiendo agua y minerales, rodeando piedras y zonas secas.
 */

const DURATION = 30;
const HEIGHT = 430;
const SURFACE = 74; // donde empieza la tierra
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
    // paredes de la maceta: se estrecha hacia abajo
    const inset = (y: number) => 12 + ((y - SURFACE) / (HEIGHT - SURFACE)) * 34;

    const root: { x: number; y: number }[] = [{ x: W / 2, y: SURFACE + 4 }];
    const tip = () => root[root.length - 1];
    const branches: Branch[] = [];
    const items: Item[] = [];
    const floats: Float[] = [];
    const specks = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(SURFACE + 6, HEIGHT), r: rand(1, 2.6), a: rand(0.15, 0.35) }));
    let nextId = 0;
    let score = 0;
    let left = DURATION;
    let shake = 0;
    let hitCool = 0;
    let lastBeep = 99;
    let hudT = 0;
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
    (["seca", "seca", "seca", "piedra", "piedra", "piedra", "piedra", "piedra", "piedra", "piedra"] as Kind[]).forEach(spawn);
    for (let i = 0; i < 4; i++) spawn("agua");
    for (let i = 0; i < 2; i++) spawn("mineral");

    const finish = () => {
      if (finished) return;
      finished = true;
      runningRef.current = false;
      const reward = scoreReward(score);
      const { newBest, happy } = recordRef.current("raices", { score, ...reward, label: "por Laberinto de Raíces", happy: HAPPY });
      setResult({ score, coins: reward.coins, newBest, happy });
      setPhase("over");
    };

    const step = (dt: number) => {
      clock += dt;
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
      ctx.shadowColor = "rgba(253,224,71,.9)";
      ctx.shadowBlur = 10;
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

    const draw = () => {
      ctx.clearRect(0, 0, W, HEIGHT);
      // cielo y pasto
      const sky = ctx.createLinearGradient(0, 0, 0, SURFACE);
      sky.addColorStop(0, "#BAE6FD");
      sky.addColorStop(1, "#E0F2FE");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, SURFACE);
      // maceta (paredes de barro)
      ctx.fillStyle = "#9A3412";
      ctx.fillRect(0, SURFACE - 6, W, HEIGHT - SURFACE + 6);
      // tierra
      const soil = ctx.createLinearGradient(0, SURFACE, 0, HEIGHT);
      soil.addColorStop(0, "#D97706");
      soil.addColorStop(0.35, "#B45309");
      soil.addColorStop(1, "#78350F");
      ctx.fillStyle = soil;
      ctx.beginPath();
      ctx.moveTo(inset(SURFACE), SURFACE);
      ctx.lineTo(W - inset(SURFACE), SURFACE);
      ctx.lineTo(W - inset(HEIGHT), HEIGHT);
      ctx.lineTo(inset(HEIGHT), HEIGHT);
      ctx.closePath();
      ctx.fill();
      specks.forEach((s) => {
        ctx.fillStyle = `rgba(41,20,5,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      // borde de la maceta
      ctx.fillStyle = "#C2410C";
      ctx.fillRect(0, SURFACE - 10, W, 10);
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.fillRect(6, SURFACE - 8, W * 0.35, 3);

      // brote en la superficie
      const sx = W / 2;
      ctx.strokeStyle = "#15803D";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, SURFACE - 8);
      ctx.quadraticCurveTo(sx - 3, SURFACE - 28, sx, SURFACE - 44);
      ctx.stroke();
      const sway = Math.sin(clock * 2) * 0.08;
      [-1, 1].forEach((d) => {
        ctx.save();
        ctx.translate(sx, SURFACE - 40);
        ctx.rotate(d * (0.5 + sway));
        ctx.fillStyle = d < 0 ? "#22C55E" : "#4ADE80";
        ctx.beginPath();
        ctx.ellipse(d * 14, 0, 15, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // zonas secas
      items
        .filter((it) => it.kind === "seca")
        .forEach((it) => {
          ctx.fillStyle = "rgba(253,230,190,.55)";
          ctx.beginPath();
          ctx.ellipse(it.x, it.y, it.r, it.r * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(120,53,15,.45)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(it.x - it.r * 0.6, it.y - 3);
          ctx.lineTo(it.x - it.r * 0.15, it.y + 4);
          ctx.lineTo(it.x + it.r * 0.2, it.y - 5);
          ctx.lineTo(it.x + it.r * 0.6, it.y + 2);
          ctx.stroke();
        });

      // raíz principal y ramitas
      ctx.save();
      if (shake > 0) ctx.translate(Math.sin(clock * 90) * 3, 0);
      const strokeRoot = (width: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        root.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        branches.forEach((b) => {
          ctx.lineWidth = width * 0.45;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x + Math.cos(b.a) * b.len * b.grow, b.y + Math.sin(b.a) * b.len * b.grow);
          ctx.stroke();
        });
      };
      strokeRoot(10, "#7C2D12");
      strokeRoot(6.5, "#FDE7C3");
      const t = tip();
      ctx.fillStyle = "#FFF7ED";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
      ctx.fill();
      // aro que indica desde dónde guiar la raíz
      if (!pointerRef.current && runningRef.current) {
        const k = (clock * 1.4) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.8 - k * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 10 + k * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // piedras, agua y minerales
      items.forEach((it) => {
        if (it.kind === "piedra") {
          ctx.fillStyle = "#57534E";
          ctx.beginPath();
          ctx.ellipse(it.x, it.y + 2, it.r, it.r * 0.82, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#A8A29E";
          ctx.beginPath();
          ctx.ellipse(it.x, it.y, it.r, it.r * 0.78, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.35)";
          ctx.beginPath();
          ctx.ellipse(it.x - it.r * 0.35, it.y - it.r * 0.3, it.r * 0.3, it.r * 0.15, -0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (it.kind === "agua") {
          drawDrop(it.x, it.y + Math.sin(clock * 3 + it.id) * 2, 1);
        } else if (it.kind === "mineral") {
          drawSpark(it.x, it.y, 1);
        }
      });

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
        className="keep-light relative overflow-hidden rounded-3xl border-4 border-white shadow-lg"
        style={{ height: HEIGHT, background: "linear-gradient(180deg, #FEF3C7, #FDE68A)" }}
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
              Rodea las <b>piedras 🪨</b> (te quitan 2 s) y las zonas secas.
            </p>
          </GameIntro>
        )}
      </div>
    </div>
  );
}
