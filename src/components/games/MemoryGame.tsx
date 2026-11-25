"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { GameIntro, GameResult } from "./GameUi";
import { playSound } from "@/lib/sound";
import { cn, shuffle } from "@/lib/utils";

interface CardDef {
  id: string;
  emoji: string;
  name: string;
  bg: string;
  fact: string;
}

const CARDS: CardDef[] = [
  { id: "tomate", emoji: "🍅", name: "Tomate", bg: "#FFEBEE", fact: "¡El tomate de Sinaloa viaja hasta Estados Unidos y Canadá!" },
  { id: "maiz", emoji: "🌽", name: "Maíz", bg: "#FFF8E1", fact: "Sinaloa es el estado que más maíz produce en México." },
  { id: "chile", emoji: "🌶️", name: "Chile", bg: "#FBE9E7", fact: "El chile nació en América y hoy se come en todo el mundo." },
  { id: "mango", emoji: "🥭", name: "Mango", bg: "#FFF3E0", fact: "El mango de Escuinapa, en el sur de Sinaloa, es famoso por lo dulce." },
  { id: "agua", emoji: "💧", name: "Agua", bg: "#E1F5FE", fact: "El riego por goteo lleva el agua directo a la raíz y ahorra muchísima." },
  { id: "sol", emoji: "☀️", name: "Sol", bg: "#FFFDE7", fact: "Con la luz del sol las plantas fabrican su comida: ¡fotosíntesis!" },
  { id: "abeja", emoji: "🐝", name: "Abeja", bg: "#FFF8E1", fact: "Las abejas llevan polen de flor en flor para que nazcan los frutos." },
  { id: "catarina", emoji: "🐞", name: "Catarina", bg: "#FCE4EC", fact: "Las catarinas se comen a los pulgones: ¡son guardianas del cultivo!" },
];

interface Card {
  uid: number;
  def: CardDef;
  flipped: boolean;
  matched: boolean;
}

const newDeck = (): Card[] =>
  shuffle([...CARDS, ...CARDS]).map((def, i) => ({ uid: i, def, flipped: false, matched: false }));

function coinsFor(moves: number) {
  return Math.max(10, 45 - Math.max(0, moves - CARDS.length) * 3);
}

function starsFor(moves: number) {
  return moves <= 12 ? 3 : moves <= 18 ? 2 : 1;
}

interface Result {
  moves: number;
  seconds: number;
  coins: number;
  newBest: boolean;
  happy: number;
  dailyDone: boolean;
}

export function MemoryGame({ onExit }: { onExit: () => void }) {
  const { recordGame, state } = useGameState();
  const [phase, setPhase] = useState<"intro" | "playing" | "over">("intro");
  const [deck, setDeck] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [fact, setFact] = useState<{ text: string; emoji: string } | null>(null);
  const [popUid, setPopUid] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const deckRef = useRef<Card[]>([]);
  const openRef = useRef<number | null>(null);
  const lockRef = useRef(false);
  const movesRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);

  // cronómetro (empieza con la primera carta)
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      if (startRef.current) setSeconds(Math.floor((performance.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const update = (fn: (d: Card[]) => Card[]) => {
    deckRef.current = fn(deckRef.current);
    setDeck(deckRef.current);
  };

  const start = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    deckRef.current = newDeck();
    setDeck(deckRef.current);
    openRef.current = null;
    lockRef.current = false;
    movesRef.current = 0;
    startRef.current = null;
    setMoves(0);
    setSeconds(0);
    setFact(null);
    setPhase("playing");
  };

  const finish = () => {
    const m = movesRef.current;
    const secs = startRef.current ? Math.floor((performance.now() - startRef.current) / 1000) : 0;
    const coins = coinsFor(m);
    const { newBest, happy, coins: given, dailyDone } = recordGame("memorama", { score: m, coins, xp: 20, label: "por el Memorama" });
    setResult({ moves: m, seconds: secs, coins: given, newBest, happy, dailyDone });
    playSound("levelup");
    setPhase("over");
  };

  const flip = (i: number) => {
    const card = deckRef.current[i];
    if (lockRef.current || !card || card.flipped || card.matched) return;
    if (startRef.current === null) startRef.current = performance.now();
    playSound("flip");
    update((d) => d.map((c, j) => (j === i ? { ...c, flipped: true } : c)));

    const open = openRef.current;
    if (open === null) {
      openRef.current = i;
      return;
    }
    openRef.current = null;
    movesRef.current += 1;
    setMoves(movesRef.current);
    const a = deckRef.current[open];
    if (a.def.id === card.def.id) {
      update((d) => d.map((c, j) => (j === i || j === open ? { ...c, matched: true } : c)));
      setPopUid([a.uid, card.uid]);
      setFact({ text: card.def.fact, emoji: card.def.emoji });
      later(() => playSound("correct"), 150);
      if (deckRef.current.every((c) => c.matched)) {
        lockRef.current = true;
        later(finish, 900);
      }
    } else {
      lockRef.current = true;
      later(() => {
        update((d) => d.map((c, j) => (j === i || j === open ? { ...c, flipped: false } : c)));
        playSound("flip", 0.5);
        lockRef.current = false;
      }, 650);
    }
  };

  const best = state.stats.best.memorama;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const pairs = deck.filter((c) => c.matched).length / 2;

  if (phase !== "playing") {
    return (
      <div className="keep-light overflow-hidden rounded-3xl border-4 border-white shadow-lg" style={{ background: "linear-gradient(180deg, #FFF8E1, #FFE082)", minHeight: 430 }}>
        {phase === "over" && result ? (
          <GameResult
            medal={"⭐".repeat(starsFor(result.moves))}
            title={`${result.moves} movimientos`}
            coins={result.coins}
            newBest={result.newBest}
            happy={result.happy}
            dailyDone={result.dailyDone}
            buttonTone="sol"
            onRetry={start}
            onExit={onExit}
          />
        ) : (
          <GameIntro
            emoji="🃏"
            title="Memorama Botánico"
            color="#E65100"
            best={best !== undefined ? `${best} movimientos` : null}
            buttonTone="sol"
            onStart={start}
          >
            <p>
              Voltea las cartas y encuentra los <b>{CARDS.length} pares</b>: cultivos de Sinaloa 🍅🌽🌶️🥭, agua, sol y bichitos amigos 🐝🐞.
            </p>
            <p className="mt-1 text-xs text-stone-600">Con cada par descubres un dato curioso.</p>
          </GameIntro>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "movimientos", value: moves },
          { label: "pares", value: `${pairs}/${CARDS.length}` },
          { label: "tiempo", value: mmss(seconds) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white px-2 py-1.5 shadow-sm">
            <div className="font-display text-xl font-bold leading-tight">{s.value}</div>
            <div className="text-[11px] font-semibold text-stone-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="keep-light rounded-3xl border-4 border-white p-2.5 shadow-lg" style={{ background: "linear-gradient(180deg, #FFE082, #FFB300)" }}>
        <div className="grid grid-cols-4 gap-2">
          {deck.map((c, i) => (
            <button
              key={c.uid}
              type="button"
              onClick={() => flip(i)}
              className="card-scene aspect-[3/4] select-none"
              aria-label={c.flipped || c.matched ? c.def.name : `Carta ${i + 1} boca abajo`}
            >
              <div className={cn("card-inner h-full w-full", (c.flipped || c.matched) && "is-flipped")}>
                {/* reverso */}
                <div className="card-face grid place-items-center rounded-2xl border-[3px] border-white bg-hoja shadow-md" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.12) 0 8px, transparent 8px 16px)" }}>
                  <span className="text-3xl drop-shadow">🌱</span>
                </div>
                {/* frente */}
                <div
                  className={cn(
                    "card-face card-front flex flex-col items-center justify-center rounded-2xl border-[3px] shadow-md",
                    c.matched ? "border-hoja" : "border-white"
                  )}
                  style={{ background: c.def.bg }}
                >
                  <span className={cn("text-[34px] leading-none", popUid.includes(c.uid) && "anim-match")}>{c.def.emoji}</span>
                  <span className="mt-1 font-display text-[11px] font-semibold text-tinta">{c.def.name}</span>
                  {c.matched && <span className="absolute right-1 top-0.5 text-xs">✅</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={cn("min-h-[64px] rounded-2xl p-3 text-[15px] leading-snug", fact ? "anim-pop bg-hoja-light" : "bg-white/70 text-stone-500")} key={fact?.text ?? "none"}>
        {fact ? (
          <>
            <b className="font-display">{fact.emoji} ¿Sabías que…?</b> {fact.text}
          </>
        ) : (
          "Toca dos cartas para buscar un par 👆"
        )}
      </div>
    </div>
  );
}
