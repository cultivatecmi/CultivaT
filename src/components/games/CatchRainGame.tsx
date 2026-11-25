"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { PlantCharacter } from "@/components/plant/PlantCharacter";
import { plantGeometry } from "@/components/plant/geometry";
import { getStage } from "@/lib/stages";
import { svgToImage } from "@/lib/svgImage";
import { Countdown, GameIntro, GameResult, GAME_H } from "./GameUi";
import { scoreReward } from "@/lib/games";
import { playSound } from "@/lib/sound";

const DURATION = 30;
const HEIGHT = GAME_H; // llena la pantalla del celular
const POT_W = 78;
const POT_H = 40;
const GROUND = 30;
/** la planta del jugador se dibuja desde su SVG (240×262): el borde de la maceta (y=182) mide 124 */
const POT_RIM_Y = 182;
const PLANT_SCALE = POT_W / 124;
const PLANT_IMG_W = 240 * PLANT_SCALE;
const PLANT_IMG_H = 262 * PLANT_SCALE;

type Kind = "drop" | "abono" | "uv" | "plaga";
interface Item {
  x: number;
  y: number;
  vy: number;
  kind: Kind;
  size: number;
  wobble: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
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

const POINTS: Record<Kind, number> = { drop: 10, abono: 20, uv: -15, plaga: -15 };

interface Result {
  score: number;
  coins: number;
  drops: number;
  abono: number;
  hits: number;
  bestCombo: number;
  newBest: boolean;
  happy: number;
  dailyDone: boolean;
}

export function CatchRainGame({ onExit }: { onExit: () => void }) {
  const { recordGame, state } = useGameState();
  const [phase, setPhase] = useState<"intro" | "countdown" | "playing" | "over">("intro");
  const [result, setResult] = useState<Result | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const recordRef = useRef(recordGame);
  recordRef.current = recordGame;

  // la planta del jugador: su etapa real con la maceta y el accesorio equipados
  const stage = getStage(state.xp).index;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const happySvgRef = useRef<HTMLDivElement>(null);
  const hurtSvgRef = useRef<HTMLDivElement>(null);
  const plantImgs = useRef<{ happy: HTMLImageElement | null; hurt: HTMLImageElement | null }>({ happy: null, hurt: null });
  useEffect(() => {
    let alive = true;
    const load = async (box: HTMLDivElement | null) => {
      const svg = box?.querySelector("svg");
      if (!svg) return null;
      try {
        return await svgToImage(svg, PLANT_IMG_W * 2);
      } catch {
        return null;
      }
    };
    void Promise.all([load(happySvgRef.current), load(hurtSvgRef.current)]).then(([happy, hurt]) => {
      if (alive) plantImgs.current = { happy, hurt };
    });
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
    let W = wrap.clientWidth;
    const resize = () => {
      W = wrap.clientWidth;
      canvas.width = W * dpr;
      canvas.height = HEIGHT * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${HEIGHT}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let potX = W / 2;
    let score = 0;
    let elapsed = 0; // tiempo de juego (solo corre cuando runningRef = true)
    let clock = 0; // tiempo visual (animaciones de fondo)
    let spawnIn = 0.3;
    let shake = 0;
    let hurt = 0;
    let squash = 0;
    let combo = 0;
    let bestCombo = 0;
    let lastBeep = 99;
    const counts = { drops: 0, abono: 0, hits: 0 };
    const items: Item[] = [];
    const sparks: Spark[] = [];
    const floats: Float[] = [];
    const potTop = HEIGHT - GROUND - POT_H;
    // se atrapa desde la cabeza de la planta hasta el borde de la maceta
    const catchTop = potTop - (POT_RIM_Y - plantGeometry(stageRef.current).top) * PLANT_SCALE;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const burst = (x: number, y: number, colors: string[], n: number, power = 160) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
        const v = power * (0.5 + Math.random() * 0.7);
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.3, color: colors[i % colors.length], r: 2.5 + Math.random() * 2.5 });
      }
    };

    const spawn = () => {
      const r = Math.random();
      const bad = 0.28 + Math.min(0.2, elapsed * 0.008);
      const kind: Kind = r < bad * 0.55 ? "uv" : r < bad ? "plaga" : r < bad + 0.17 ? "abono" : "drop";
      const size = kind === "abono" ? 17 : kind === "uv" ? 16 : kind === "plaga" ? 15 : 13;
      items.push({
        x: 22 + Math.random() * (W - 44),
        y: -24,
        vy: 190 + elapsed * 9 + Math.random() * 70 + (kind === "uv" ? 50 : kind === "plaga" ? 10 : 0),
        kind,
        size,
        wobble: Math.random() * Math.PI * 2,
      });
    };

    // ------------------------------ dibujo ------------------------------

    const drawDrop = (x: number, y: number, s: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.3);
      ctx.bezierCurveTo(x + s * 0.6, y - s * 0.4, x + s, y + s * 0.1, x + s, y + s * 0.45);
      ctx.arc(x, y + s * 0.45, s, 0, Math.PI, false);
      ctx.bezierCurveTo(x - s, y + s * 0.1, x - s * 0.6, y - s * 0.4, x, y - s * 1.3);
      ctx.fillStyle = "#29B6F6";
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.beginPath();
      ctx.arc(x - s * 0.35, y + s * 0.25, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawAbono = (x: number, y: number, s: number) => {
      ctx.fillStyle = "#8D6E63";
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, y - s * 0.7);
      ctx.lineTo(x + s * 0.7, y - s * 0.7);
      ctx.quadraticCurveTo(x + s * 1.1, y + s * 0.9, x + s * 0.8, y + s);
      ctx.lineTo(x - s * 0.8, y + s);
      ctx.quadraticCurveTo(x - s * 1.1, y + s * 0.9, x - s * 0.7, y - s * 0.7);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.fillRect(x - s * 0.55, y - s * 0.6, s * 0.3, s * 1.4);
      ctx.fillStyle = "#6D4C41";
      ctx.fillRect(x - s * 0.6, y - s * 0.95, s * 1.2, s * 0.3);
      ctx.fillStyle = "#66BB6A";
      ctx.beginPath();
      ctx.ellipse(x - s * 0.18, y + s * 0.2, s * 0.32, s * 0.16, -0.6, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.18, y + s * 0.2, s * 0.32, s * 0.16, 0.6, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawUV = (x: number, y: number, s: number) => {
      ctx.save();
      // halo dibujado (más ligero que una sombra difuminada)
      ctx.fillStyle = `rgba(255,112,67,${0.28 + Math.sin(clock * 10) * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, s * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7E57C2";
      ctx.beginPath();
      ctx.moveTo(x + s * 0.2, y - s * 1.3);
      ctx.lineTo(x - s * 0.8, y + s * 0.1);
      ctx.lineTo(x - s * 0.05, y + s * 0.1);
      ctx.lineTo(x - s * 0.35, y + s * 1.3);
      ctx.lineTo(x + s * 0.85, y - s * 0.25);
      ctx.lineTo(x + s * 0.1, y - s * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(s * 0.7)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("UV", x + s * 1.3, y - s * 0.6);
    };

    /** gusano/plaga: oruga verde con cara enojada */
    const drawPlaga = (x: number, y: number, s: number, t: number) => {
      for (let i = 3; i >= 0; i--) {
        const sx = x - s * 0.9 + i * s * 0.6;
        const sy = y + Math.sin(t * 9 + i) * 2;
        ctx.fillStyle = i === 3 ? "#7CB342" : i % 2 ? "#9CCC65" : "#8BC34A";
        ctx.beginPath();
        ctx.arc(sx, sy, s * (i === 3 ? 0.6 : 0.48), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#33691E";
        ctx.fillRect(sx - 1, sy + s * 0.4, 2, s * 0.3);
      }
      const hx = x - s * 0.9 + 3 * s * 0.6;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(hx - s * 0.2, y - s * 0.1, s * 0.18, 0, Math.PI * 2);
      ctx.arc(hx + s * 0.2, y - s * 0.1, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2D2A26";
      ctx.beginPath();
      ctx.arc(hx - s * 0.18, y - s * 0.06, s * 0.09, 0, Math.PI * 2);
      ctx.arc(hx + s * 0.22, y - s * 0.06, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2D2A26";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - s * 0.38, y - s * 0.38);
      ctx.lineTo(hx - s * 0.05, y - s * 0.26);
      ctx.moveTo(hx + s * 0.38, y - s * 0.38);
      ctx.lineTo(hx + s * 0.05, y - s * 0.26);
      ctx.stroke();
    };

    const drawPot = (x: number) => {
      const img = hurt > 0 ? plantImgs.current.hurt ?? plantImgs.current.happy : plantImgs.current.happy;
      if (img) {
        // planta real dibujada desde su SVG (el borde de la maceta queda en potTop)
        ctx.save();
        ctx.translate(x, potTop + POT_H);
        ctx.scale(1 + squash * 0.5, 1 - squash * 0.5);
        ctx.fillStyle = "rgba(0,0,0,.18)";
        ctx.beginPath();
        ctx.ellipse(0, 4, POT_W * 0.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        const top = -POT_H - POT_RIM_Y * PLANT_SCALE;
        ctx.drawImage(img, -PLANT_IMG_W / 2, top, PLANT_IMG_W, PLANT_IMG_H);
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.translate(x, potTop + POT_H);
      ctx.scale(1 + squash * 0.5, 1 - squash * 0.5);
      ctx.translate(0, -POT_H);
      // sombra
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.beginPath();
      ctx.ellipse(0, POT_H + 4, POT_W * 0.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // planta
      const g = ctx.createRadialGradient(-8, -14, 2, 0, -4, 26);
      g.addColorStop(0, hurt > 0 ? "#FFCCBC" : "#C8F7CF");
      g.addColorStop(0.6, hurt > 0 ? "#FF8A65" : "#5CB860");
      g.addColorStop(1, hurt > 0 ? "#E64A19" : "#2E7D32");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -4, 25, 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#43A047";
      ctx.beginPath();
      ctx.ellipse(-10, -31, 11, 5, -0.6, 0, Math.PI * 2);
      ctx.ellipse(10, -31, 11, 5, 0.6, 0, Math.PI * 2);
      ctx.fill();
      // cara
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(-8, -8, 4.5, 5.5, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -8, 4.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      const look = Math.max(-1.5, Math.min(1.5, dirRef.current * 1.5));
      ctx.fillStyle = "#2D2A26";
      ctx.beginPath();
      ctx.arc(-8 + look, -7.5, 2.8, 0, Math.PI * 2);
      ctx.arc(8 + look, -7.5, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2D2A26";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (hurt > 0) ctx.arc(0, 8, 5, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(0, 1, 6.5, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      // maceta
      ctx.fillStyle = "#8D6E63";
      ctx.beginPath();
      ctx.moveTo(-POT_W / 2 + 6, 8);
      ctx.lineTo(POT_W / 2 - 6, 8);
      ctx.lineTo(POT_W / 2 - 14, POT_H);
      ctx.lineTo(-POT_W / 2 + 14, POT_H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.15)";
      ctx.fillRect(POT_W / 2 - 26, 10, 12, POT_H - 12);
      ctx.fillStyle = "#A1887F";
      ctx.fillRect(-POT_W / 2, 0, POT_W, 12);
      ctx.fillStyle = "rgba(255,255,255,.3)";
      ctx.fillRect(-POT_W / 2 + 6, 2, POT_W * 0.4, 3);
      ctx.restore();
    };

    // cielo, cerros y surcos: se pintan una sola vez y luego solo se copian
    const BG = document.createElement("canvas");
    BG.width = Math.round(W * dpr);
    BG.height = Math.round(HEIGHT * dpr);
    {
      const c = BG.getContext("2d")!;
      c.scale(dpr, dpr);
      const sky = c.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#4FC3F7");
      sky.addColorStop(0.7, "#B3E5FC");
      sky.addColorStop(1, "#E1F5FE");
      c.fillStyle = sky;
      c.fillRect(0, 0, W, HEIGHT);
      c.fillStyle = "#AED581";
      c.beginPath();
      c.moveTo(0, HEIGHT - GROUND - 40);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, HEIGHT - GROUND - 40 - Math.sin(x / 70) * 14);
      c.lineTo(W, HEIGHT);
      c.lineTo(0, HEIGHT);
      c.fill();
      c.fillStyle = "#8BC34A";
      c.fillRect(0, HEIGHT - GROUND, W, GROUND);
      c.fillStyle = "#7CB342";
      c.fillRect(0, HEIGHT - GROUND, W, 5);
      c.strokeStyle = "rgba(85,139,47,.5)";
      c.lineWidth = 2;
      c.beginPath();
      for (let x = 10; x < W; x += 26) {
        c.moveTo(x, HEIGHT - GROUND + 9);
        c.lineTo(x + 10, HEIGHT - GROUND + 9);
      }
      c.stroke();
    }

    const drawBackground = () => {
      ctx.drawImage(BG, 0, 0, W, HEIGHT);
      // sol con rayos
      ctx.save();
      ctx.translate(40, 70);
      ctx.rotate(clock * 0.3);
      ctx.fillStyle = "rgba(255,213,79,.7)";
      for (let i = 0; i < 10; i++) {
        ctx.rotate((Math.PI * 2) / 10);
        ctx.beginPath();
        ctx.moveTo(-4, 26);
        ctx.lineTo(4, 26);
        ctx.lineTo(0, 40);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#FFD54F";
      ctx.beginPath();
      ctx.arc(40, 70, 20, 0, Math.PI * 2);
      ctx.fill();
      // nubes
      ctx.fillStyle = "rgba(255,255,255,.9)";
      for (let c = 0; c < 3; c++) {
        const cx = ((c * 170 + clock * (10 + c * 4)) % (W + 140)) - 70;
        const cy = 40 + c * 26;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 34, 13, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 22, cy + 4, 22, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 18, cy + 4, 18, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // lluvia de fondo
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 22; i++) {
        const rx = (i * 53 + clock * 40) % W;
        const ry = (i * 97 + clock * 380) % HEIGHT;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 12);
      }
      ctx.stroke();
    };

    const pill = (x: number, y: number, w: number, text: string, color = "#3E2C23", bg = "rgba(255,255,255,.92)") => {
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = "bold 19px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, x, y + 7);
    };

    // ------------------------------ bucle ------------------------------

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const running = runningRef.current;
      if (running) elapsed += dt;
      const timeLeft = Math.max(0, DURATION - elapsed);

      // movimiento
      if (dirRef.current !== 0) {
        targetRef.current = null;
        potX += dirRef.current * 440 * dt;
      } else if (targetRef.current !== null) {
        const diff = targetRef.current - potX;
        potX += Math.sign(diff) * Math.min(Math.abs(diff), 900 * dt);
      }
      potX = Math.max(POT_W / 2, Math.min(W - POT_W / 2, potX));

      if (running) {
        spawnIn -= dt;
        if (spawnIn <= 0 && timeLeft > 0.5) {
          spawn();
          spawnIn = Math.max(0.22, 0.5 - elapsed * 0.012) * (0.7 + Math.random() * 0.6);
        }
        const sec = Math.ceil(timeLeft);
        if (sec <= 5 && sec > 0 && sec < lastBeep) {
          lastBeep = sec;
          playSound("beep", 0.5);
        }
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt;
        it.wobble += dt * 4;
        const ix = it.x + Math.sin(it.wobble) * (it.kind === "uv" ? 10 : it.kind === "plaga" ? 6 : 3);
        const caught = it.y + it.size >= (plantImgs.current.happy ? catchTop : potTop - 20) && it.y - it.size <= potTop + 14 && Math.abs(ix - potX) < POT_W / 2 - 4;
        if (caught) {
          const pts = POINTS[it.kind];
          let bonus = 0;
          if (pts > 0) {
            combo += 1;
            bestCombo = Math.max(bestCombo, combo);
            squash = 0.28;
            if (it.kind === "drop") {
              counts.drops++;
              burst(ix, potTop - 6, ["#29B6F6", "#81D4FA", "#fff"], 10);
              playSound("drop");
            } else {
              counts.abono++;
              burst(ix, potTop - 6, ["#8D6E63", "#66BB6A", "#FFB300"], 10);
              playSound("bite");
            }
            if (combo % 5 === 0) {
              bonus = 5;
              floats.push({ x: potX, y: potTop - 80, text: `¡Combo x${combo}! +5`, color: "#F57F17", life: 1.2 });
              playSound("correct", 0.7);
            }
          } else {
            combo = 0;
            counts.hits++;
            hurt = 0.45;
            shake = 0.35;
            burst(ix, potTop - 6, ["#FF7043", "#FFB300", "#7E57C2"], 12, 220);
            playSound("wrong");
            if (navigator.vibrate) navigator.vibrate(60);
          }
          score = Math.max(0, score + pts + bonus);
          floats.push({
            x: potX,
            y: potTop - 44,
            text: pts > 0 ? `+${pts}` : `${pts}`,
            color: pts > 0 ? (it.kind === "abono" ? "#6D4C41" : "#0277BD") : "#E64A19",
            life: 0.9,
          });
          items.splice(i, 1);
        } else if (it.y > HEIGHT - GROUND + 6) {
          if (it.kind === "drop") burst(ix, HEIGHT - GROUND, ["#81D4FA", "#fff"], 4, 90);
          items.splice(i, 1);
        }
      }
      hurt = Math.max(0, hurt - dt);
      shake = Math.max(0, shake - dt);
      squash = Math.max(0, squash - dt * 1.6);

      // ------- dibujo -------
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 14 * shake, (Math.random() - 0.5) * 10 * shake);
      drawBackground();
      if (hurt > 0) {
        ctx.fillStyle = `rgba(255,112,67,${hurt * 0.6})`;
        ctx.fillRect(-10, -10, W + 20, HEIGHT + 20);
      }
      for (const it of items) {
        const ix = it.x + Math.sin(it.wobble) * (it.kind === "uv" ? 10 : it.kind === "plaga" ? 6 : 3);
        if (it.kind === "drop") drawDrop(ix, it.y, it.size);
        else if (it.kind === "abono") drawAbono(ix, it.y, it.size);
        else if (it.kind === "uv") drawUV(ix, it.y, it.size);
        else drawPlaga(ix, it.y, it.size, clock);
      }
      drawPot(potX);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        p.vy += 500 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt;
        f.y -= 50 * dt;
        if (f.life <= 0) {
          floats.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, f.life * 2);
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#fff";
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // HUD
      pill(62, 30, 104, `⭐ ${score}`);
      pill(W - 54, 30, 88, `⏱ ${Math.ceil(timeLeft)}`, timeLeft < 6 ? "#E64A19" : "#3E2C23");
      if (combo >= 2) pill(W / 2, 30, 96, `🔥 x${combo}`, "#fff", "rgba(255,179,0,.95)");
      ctx.fillStyle = "rgba(0,0,0,.08)";
      ctx.fillRect(0, 0, W, 5);
      ctx.fillStyle = timeLeft < 6 ? "#FF7043" : "#4CAF50";
      ctx.fillRect(0, 0, (W * timeLeft) / DURATION, 5);

      if (running && timeLeft <= 0 && !finished) {
        finished = true;
        runningRef.current = false;
        const reward = scoreReward(score);
        const { newBest, happy, coins, dailyDone } = recordRef.current("lluvia", { score, ...reward, label: "por Atrapa la Lluvia" });
        setResult({ score, coins, ...counts, bestCombo, newBest, happy, dailyDone });
        setPhase("over");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKey = (e: KeyboardEvent) => {
      const down = e.type === "keydown";
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        dirRef.current = down ? -1 : dirRef.current === -1 ? 0 : dirRef.current;
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        dirRef.current = down ? 1 : dirRef.current === 1 ? 0 : dirRef.current;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    return () => {
      cancelAnimationFrame(raf);
      runningRef.current = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      dirRef.current = 0;
      targetRef.current = null;
    };
  }, [active]);

  const pointerToTarget = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    targetRef.current = e.clientX - rect.left;
  };


  const best = state.stats.best.lluvia ?? (state.stats.bestScore || undefined);

  return (
    <div className="space-y-3">
      {/* plantas ocultas: se copian como imagen para el canvas */}
      <div className="pointer-events-none fixed -left-[9999px] top-0 w-[240px]" aria-hidden="true">
        <div ref={happySvgRef}>
          <PlantCharacter mood="feliz" stage={stage} pot={state.equipped.pot} accessory={state.equipped.accessory} />
        </div>
        <div ref={hurtSvgRef}>
          <PlantCharacter mood="acalorada" stage={stage} pot={state.equipped.pot} accessory={state.equipped.accessory} reaction="incomoda" />
        </div>
      </div>
      <div ref={wrapRef} className="keep-light relative overflow-hidden rounded-3xl border-4 border-white bg-cielo-light shadow-lg" style={{ height: active ? HEIGHT : undefined, minHeight: HEIGHT }}>
        {active ? (
          <>
            <canvas
              ref={canvasRef}
              className="block touch-none select-none"
              onPointerDown={pointerToTarget}
              onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons > 0) && pointerToTarget(e)}
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
            className="bg-gradient-to-b from-[#81D4FA] to-[#E1F5FE]"
            medal={result.score >= 300 ? "🏆" : result.score >= 150 ? "🥈" : "🌱"}
            title={`${result.score} puntos`}
            coins={result.coins}
            newBest={result.newBest}
            happy={result.happy}
            dailyDone={result.dailyDone}
            buttonTone="cielo"
            onRetry={() => setPhase("countdown")}
            onExit={onExit}
          />
        ) : (
          <GameIntro
            className="bg-gradient-to-b from-[#81D4FA] to-[#E1F5FE]"
            emoji="🌧️"
            title="Atrapa la Lluvia"
            color="#0288D1"
            best={best !== undefined ? `${best} pts` : null}
            buttonTone="cielo"
            onStart={() => setPhase("countdown")}
          >
            <p>
              Atrapa <b>gotas 💧 (+10)</b> y <b>abono 🍂 (+20)</b>. ¡Esquiva <b>rayos UV ⚡</b> y <b>plagas 🐛 (-15)</b>!
            </p>
            <p className="mt-1 text-xs text-stone-600">Desliza el dedo para mover tu planta.</p>
          </GameIntro>
        )}
      </div>

    </div>
  );
}
