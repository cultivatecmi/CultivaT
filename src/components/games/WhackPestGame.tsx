"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { AphidSvg } from "@/components/home/SceneProps";
import { Countdown, GameIntro, GameResult } from "./GameUi";
import { scoreReward } from "@/lib/games";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const DURATION = 30;
const HOLES = 6;

type Critter = "gusano" | "pulgon" | "catarina";

const POINTS: Record<Critter, number> = { gusano: 10, pulgon: 15, catarina: -20 };

interface Hole {
  /** cambia cada vez que sale un bicho nuevo (para ignorar timers viejos) */
  key: number;
  kind: Critter | null;
  up: boolean;
  hit: boolean;
  fx: string | null;
}

const emptyHoles = (): Hole[] => Array.from({ length: HOLES }, () => ({ key: 0, kind: null, up: false, hit: false, fx: null }));

// ---------------------------------------------------------------------------
// Bichitos
// ---------------------------------------------------------------------------

/** Gusano cogollero (plaga del maíz) */
function WormSvg({ hit }: { hit: boolean }) {
  return (
    <svg viewBox="0 0 60 80" className="h-[70px] w-[54px]" aria-hidden>
      {[66, 52, 38].map((y, i) => (
        <g key={y}>
          <ellipse cx={30 + (i % 2 ? 3 : -3)} cy={y} rx={15 - i} ry={9} fill={i % 2 ? "#9CCC65" : "#7CB342"} stroke="#558B2F" strokeWidth={1.5} />
          <circle cx={30 + (i % 2 ? 3 : -3) - 7} cy={y + 2} r={1.6} fill="#33691E" />
          <circle cx={30 + (i % 2 ? 3 : -3) + 7} cy={y + 2} r={1.6} fill="#33691E" />
        </g>
      ))}
      <circle cx="30" cy="20" r="15" fill="#8BC34A" stroke="#558B2F" strokeWidth={2} />
      <ellipse cx="24" cy="14" rx="5" ry="3" fill="#fff" opacity={0.4} />
      <path d="M22 6 Q 18 -2 13 0 M38 6 Q 42 -2 47 0" stroke="#33691E" strokeWidth={2} fill="none" strokeLinecap="round" />
      {hit ? (
        <>
          <path d="M19 17 l6 5 M25 17 l-6 5 M35 17 l6 5 M41 17 l-6 5" stroke="#2D2A26" strokeWidth={2.2} strokeLinecap="round" />
          <ellipse cx="30" cy="29" rx="4" ry="3" fill="#6D2E1F" />
        </>
      ) : (
        <>
          <circle cx="23" cy="19" r="4.5" fill="#fff" />
          <circle cx="37" cy="19" r="4.5" fill="#fff" />
          <circle cx="24" cy="20" r="2.3" fill="#2D2A26" />
          <circle cx="38" cy="20" r="2.3" fill="#2D2A26" />
          <path d="M17 12 L27 15 M43 12 L33 15" stroke="#2D2A26" strokeWidth={2} strokeLinecap="round" />
          <path d="M24 28 Q 30 32 36 27" stroke="#2D2A26" strokeWidth={2} fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** Catarina: insecto benéfico que come pulgones */
function LadybugSvg() {
  return (
    <svg viewBox="0 0 64 64" className="h-[60px] w-[60px]" aria-hidden>
      <path d="M14 48 l-6 6 M50 48 l6 6 M10 36 h-7 M54 36 h7" stroke="#2D2A26" strokeWidth={2.5} strokeLinecap="round" />
      <ellipse cx="32" cy="38" rx="22" ry="20" fill="#E53935" stroke="#B71C1C" strokeWidth={2} />
      <path d="M32 18 V58" stroke="#2D2A26" strokeWidth={2} />
      {[
        [22, 32, 4.5],
        [42, 32, 4.5],
        [20, 46, 4],
        [44, 46, 4],
        [32, 50, 3],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#2D2A26" />
      ))}
      <ellipse cx="24" cy="26" rx="6" ry="3" fill="#fff" opacity={0.45} />
      <circle cx="32" cy="17" r="11" fill="#2D2A26" />
      <circle cx="27.5" cy="16" r="3.6" fill="#fff" />
      <circle cx="36.5" cy="16" r="3.6" fill="#fff" />
      <circle cx="28" cy="16.5" r="1.8" fill="#2D2A26" />
      <circle cx="37" cy="16.5" r="1.8" fill="#2D2A26" />
      <path d="M28 22 Q 32 25 36 22" stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d="M27 7 Q 24 1 20 2 M37 7 Q 40 1 44 2" stroke="#2D2A26" strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx="22" cy="20" r="2" fill="#FF8A80" opacity={0.8} />
      <circle cx="42" cy="20" r="2" fill="#FF8A80" opacity={0.8} />
    </svg>
  );
}

function PotSvg() {
  return (
    <svg viewBox="0 0 100 58" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <path d="M12 12 H88 L80 56 H20 Z" fill="#8D6E63" />
      <path d="M70 14 H86 L79 54 H66 Z" fill="#000" opacity={0.13} />
      <rect x="4" y="2" width="92" height="14" rx="5" fill="#A1887F" />
      <ellipse cx="50" cy="7" rx="40" ry="5" fill="#4E342E" />
      <rect x="10" y="4" width="34" height="2.5" rx="1" fill="#fff" opacity={0.25} />
    </svg>
  );
}

// ---------------------------------------------------------------------------

interface Result {
  score: number;
  coins: number;
  gusanos: number;
  pulgones: number;
  catarinas: number;
  newBest: boolean;
  happy: number;
}

export function WhackPestGame({ onExit }: { onExit: () => void }) {
  const { recordGame, state } = useGameState();
  const [phase, setPhase] = useState<"intro" | "countdown" | "playing" | "over">("intro");
  const [holes, setHoles] = useState<Hole[]>(emptyHoles);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [shake, setShake] = useState(0);
  const [warning, setWarning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const holesRef = useRef<Hole[]>(holes);
  const scoreRef = useRef(0);
  const counts = useRef({ gusanos: 0, pulgones: 0, catarinas: 0 });
  const startRef = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const keyRef = useRef(0);
  const runningRef = useRef(false);

  const setHolesBoth = (fn: (h: Hole[]) => Hole[]) => {
    holesRef.current = fn(holesRef.current);
    setHoles(holesRef.current);
  };

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  };

  useEffect(() => () => clearAll(), []);

  const elapsed = () => (performance.now() - startRef.current) / 1000;

  const spawn = () => {
    if (!runningRef.current) return;
    const t = elapsed();
    const free = holesRef.current.map((h, i) => (h.up ? -1 : i)).filter((i) => i >= 0);
    const upCount = HOLES - free.length;
    if (free.length && upCount < 3) {
      const i = free[Math.floor(Math.random() * free.length)];
      const r = Math.random();
      const kind: Critter = r < 0.22 ? "catarina" : r < 0.52 ? "pulgon" : "gusano";
      const key = ++keyRef.current;
      const base = Math.max(620, 1300 - t * 22);
      const upMs = kind === "pulgon" ? base * 0.8 : kind === "catarina" ? base * 1.15 : base;
      setHolesBoth((hs) => hs.map((h, j) => (j === i ? { key, kind, up: true, hit: false, fx: null } : h)));
      later(() => {
        setHolesBoth((hs) => hs.map((h, j) => (j === i && h.key === key && !h.hit ? { ...h, up: false } : h)));
      }, upMs);
    }
    const next = Math.max(360, 820 - t * 16) * (0.7 + Math.random() * 0.5);
    later(spawn, next);
  };

  const finish = useCallback(() => {
    runningRef.current = false;
    clearAll();
    setHolesBoth(() => emptyHoles());
    const s = scoreRef.current;
    const reward = scoreReward(s);
    const { newBest, happy } = recordGame("plagas", { score: s, ...reward, label: "por Aplasta Plagas" });
    setResult({ score: s, coins: reward.coins, ...counts.current, newBest, happy });
    setPhase("over");
  }, [recordGame]);

  // reloj
  useEffect(() => {
    if (phase !== "playing") return;
    let lastSec = DURATION + 1;
    const id = setInterval(() => {
      const left = Math.max(0, DURATION - elapsed());
      setTimeLeft(left);
      const sec = Math.ceil(left);
      if (sec <= 5 && sec > 0 && sec < lastSec) {
        lastSec = sec;
        playSound("beep", 0.5);
      }
      if (left <= 0) {
        clearInterval(id);
        finish();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, finish]);

  const start = () => {
    clearAll();
    holesRef.current = emptyHoles();
    setHoles(holesRef.current);
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(DURATION);
    counts.current = { gusanos: 0, pulgones: 0, catarinas: 0 };
    setPhase("countdown");
  };

  const onCountdownDone = () => {
    startRef.current = performance.now();
    runningRef.current = true;
    setPhase("playing");
    later(spawn, 300);
  };

  const whack = (i: number) => {
    const h = holesRef.current[i];
    if (!runningRef.current || !h.up || h.hit || !h.kind) return;
    const pts = POINTS[h.kind];
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    setScore(scoreRef.current);
    if (h.kind === "catarina") {
      counts.current.catarinas++;
      playSound("wrong");
      setShake((s) => s + 1);
      setWarning(true);
      later(() => setWarning(false), 1600);
      if (navigator.vibrate) navigator.vibrate(80);
    } else {
      if (h.kind === "gusano") counts.current.gusanos++;
      else counts.current.pulgones++;
      playSound("squash");
    }
    const key = h.key;
    setHolesBoth((hs) => hs.map((x, j) => (j === i ? { ...x, hit: true, fx: pts > 0 ? `+${pts}` : `${pts}` } : x)));
    later(() => setHolesBoth((hs) => hs.map((x, j) => (j === i && x.key === key ? { ...x, up: false } : x))), 320);
    later(() => setHolesBoth((hs) => hs.map((x, j) => (j === i && x.key === key ? { ...x, fx: null } : x))), 700);
  };

  const best = state.stats.best.plagas;
  const boardBg = "radial-gradient(circle at 20% 15%, #C5E1A5 0 6%, transparent 7%), radial-gradient(circle at 80% 70%, #C5E1A5 0 5%, transparent 6%), linear-gradient(180deg, #9CCC65, #7CB342)";

  if (phase === "intro" || (phase === "over" && result)) {
    return (
      <div className="keep-light overflow-hidden rounded-3xl border-4 border-white shadow-lg" style={{ background: "linear-gradient(180deg, #DCEDC8, #AED581)", minHeight: 430 }}>
        {phase === "over" && result ? (
          <GameResult
            medal={result.score >= 250 ? "🏆" : result.score >= 120 ? "🥈" : "🌱"}
            title={`${result.score} puntos`}
            stats={[
              { label: "gusanos", value: `🐛 ${result.gusanos}` },
              { label: "pulgones", value: `🟢 ${result.pulgones}` },
              { label: "catarinas tocadas", value: `🐞 ${result.catarinas}` },
            ]}
            coins={result.coins}
            newBest={result.newBest}
            happy={result.happy}
            buttonTone="hoja"
            onRetry={start}
            onExit={onExit}
          >
            <p className="max-w-[280px] text-sm leading-snug text-stone-700">
              🤓 ¿Sabías que una catarina puede comerse unos <b>50 pulgones al día</b>? ¡Por eso los agricultores las cuidan!
            </p>
          </GameResult>
        ) : (
          <GameIntro
            emoji="🐛"
            title="Aplasta Plagas"
            color="#33691E"
            best={best !== undefined ? `${best} pts` : null}
            buttonTone="hoja"
            onStart={start}
          >
            <p>
              ¡Las plagas salen de las macetas! Toca rápido a los <b>gusanos 🐛 (+10)</b> y <b>pulgones (+15)</b>.
            </p>
            <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
              🐞 <b>¡No toques a las catarinas!</b> Son nuestras amigas: se comen a los pulgones (-20).
            </p>
          </GameIntro>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* marcador */}
      <div className="flex items-center gap-2">
        <div className="rounded-2xl bg-white px-3 py-1.5 font-display text-xl font-bold shadow-sm">⭐ {score}</div>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className={cn("h-full rounded-full transition-[width] duration-100", timeLeft < 6 ? "bg-alerta" : "bg-hoja")}
            style={{ width: `${(timeLeft / DURATION) * 100}%` }}
          />
        </div>
        <div className={cn("w-14 rounded-2xl bg-white px-2 py-1.5 text-center font-display text-xl font-bold shadow-sm", timeLeft < 6 && "text-alerta-dark")}>
          {Math.ceil(timeLeft)}
        </div>
      </div>

      <div
        key={shake}
        className={cn("relative overflow-hidden rounded-3xl border-4 border-white p-3 shadow-lg", shake > 0 && "anim-board-shake")}
        style={{ background: boardBg }}
      >
        <div className="grid grid-cols-3 gap-x-2 gap-y-3">
          {holes.map((h, i) => (
            <button
              key={i}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                whack(i);
              }}
              className="relative h-[124px] touch-none select-none"
              aria-label={h.up && h.kind ? `${h.kind} en la maceta ${i + 1}` : `Maceta ${i + 1}`}
            >
              {/* el bicho sale de la tierra */}
              <div className="absolute inset-x-1 bottom-[50px] h-[74px] overflow-hidden">
                <div
                  className="absolute bottom-0 left-1/2 transition-transform ease-out"
                  style={{
                    transform: `translateX(-50%) translateY(${h.up ? (h.hit ? "18%" : "0%") : "105%"}) scale(${h.hit ? "1.15, 0.7" : "1, 1"})`,
                    transitionDuration: h.up ? "140ms" : "200ms",
                  }}
                >
                  {h.kind === "gusano" && <WormSvg hit={h.hit} />}
                  {h.kind === "pulgon" && <AphidSvg className={cn("h-[48px] w-[58px]", h.hit && "opacity-60")} />}
                  {h.kind === "catarina" && <LadybugSvg />}
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[58px]">
                <PotSvg />
              </div>
              {h.fx && (
                <span
                  className={cn(
                    "p-text pointer-events-none absolute left-1/2 top-6 font-display text-2xl",
                    h.fx.startsWith("-") ? "text-alerta-dark" : "text-white"
                  )}
                  style={{ "--dy": "-40px" } as React.CSSProperties}
                >
                  {h.fx}
                </span>
              )}
              {h.hit && h.kind !== "catarina" && <span className="anim-pop pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 text-3xl">💥</span>}
            </button>
          ))}
        </div>

        {warning && (
          <div className="anim-pop pointer-events-none absolute inset-x-4 top-3 rounded-2xl bg-alerta px-3 py-2 text-center font-display text-sm font-semibold text-white shadow-lg">
            🐞 ¡Las catarinas son buenas! Se comen a los pulgones.
          </div>
        )}
        {phase === "countdown" && <Countdown onDone={onCountdownDone} />}
      </div>

      <div className="flex justify-center gap-2 text-center font-display text-xs font-semibold text-stone-600">
        <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">🐛 +10</span>
        <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">🟢 pulgón +15</span>
        <span className="rounded-full bg-alerta-light px-2.5 py-1 text-alerta-dark shadow-sm">🐞 ¡no! -20</span>
      </div>
    </div>
  );
}
