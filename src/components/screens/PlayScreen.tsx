"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { CatchRainGame } from "@/components/games/CatchRainGame";
import { WhackPestGame } from "@/components/games/WhackPestGame";
import { MemoryGame } from "@/components/games/MemoryGame";
import { TriviaGame } from "@/components/games/TriviaGame";
import { RootMazeGame } from "@/components/games/RootMazeGame";
import { PollinationGame } from "@/components/games/PollinationGame";
import { GAMES, getGame, type GameId } from "@/lib/games";
import { CoinText, InlineCoin } from "@/components/ui/CoinText";
import { DAILY_COINS, DAILY_XP, dailyOf } from "@/lib/game";
import { playSound } from "@/lib/sound";

export function PlayScreen() {
  const { state, now, setInGame } = useGameState();
  const today = dailyOf(state, now);
  const dailyDone = today.xp >= DAILY_XP || today.coins >= DAILY_COINS;
  const [game, setGame] = useState<GameId | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [game]);

  // dentro de un minijuego: sin avisos emergentes ni sus sonidos
  useEffect(() => {
    setInGame(game !== null);
    return () => setInGame(false);
  }, [game, setInGame]);

  const exit = () => setGame(null);

  if (game) {
    const info = getGame(game);
    return (
      <div className="flex min-h-[calc(100dvh-30px)] flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSound("tap");
              exit();
            }}
            className="flex items-center gap-0.5 rounded-full border-2 border-stone-200 bg-white py-1.5 pl-1.5 pr-3 font-display text-sm font-semibold text-tinta shadow-sm active:scale-95"
          >
            <ChevronLeft size={18} /> Juegos
          </button>
          <h2 className="truncate text-xl font-semibold">
            {info.emoji} {info.name}
          </h2>
        </div>
        <div className="flex flex-1 flex-col justify-center">
        {game === "lluvia" && <CatchRainGame onExit={exit} />}
        {game === "plagas" && <WhackPestGame onExit={exit} />}
        {game === "memorama" && <MemoryGame onExit={exit} />}
        {game === "trivia" && <TriviaGame onExit={exit} />}
        {game === "raices" && <RootMazeGame onExit={exit} />}
        {game === "polinizacion" && <PollinationGame onExit={exit} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Sala de Juegos 🎮</h2>
          <p className="text-sm text-stone-500">Gana monedas y XP para tu planta.</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white px-3 py-1.5 text-center shadow-sm">
          <div className="font-display text-lg font-bold leading-none">{state.stats.gamesPlayed}</div>
          <div className="text-[10px] font-semibold text-stone-500">partidas</div>
        </div>
      </div>

      {/* progreso del día: la planta crece al ritmo de una planta real */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between font-display text-sm font-semibold">
            <span>✨ XP hoy</span>
            <span>
              {today.xp}/{DAILY_XP}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${Math.min(100, (today.xp / DAILY_XP) * 100)}%` }} />
          </div>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between font-display text-sm font-semibold">
            <span className="flex items-center gap-1">
              <InlineCoin /> Monedas hoy
            </span>
            <span>
              {today.coins}/{DAILY_COINS}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: `${Math.min(100, (today.coins / DAILY_COINS) * 100)}%` }} />
          </div>
        </div>
      </div>
      {dailyDone && (
        <p className="rounded-2xl bg-[#DCFCE7] px-3 py-2 text-center text-sm font-semibold text-[#15803D]">
          ¡Meta diaria completada! 🌱 Sigue jugando para subir la felicidad; mañana ganas más XP y monedas.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((g, i) => {
          const best = state.stats.best[g.id];
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                playSound("tap");
                setGame(g.id);
              }}
              className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-[26px] border-b-[6px] p-3 text-left text-white shadow-lg transition-transform active:translate-y-1 active:scale-[0.98] active:border-b-2"
              style={{ background: `linear-gradient(160deg, ${g.from}, ${g.to})`, borderColor: "rgba(0,0,0,.22)" }}
              aria-label={`Jugar ${g.name}`}
            >
              {/* brillos decorativos */}
              <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
              <span className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-black/10" />
              <span className="anim-card-float relative block text-[52px] leading-none drop-shadow-md" style={{ animationDelay: `${i * 0.4}s` }}>
                {g.emoji}
              </span>
              <span className="relative mt-2 font-display text-lg font-bold leading-tight [text-shadow:0_2px_0_rgba(0,0,0,.18)]">{g.name}</span>
              <span className="relative mt-0.5 flex-1 text-[12px] font-semibold leading-snug text-white/90">{g.tagline}</span>
              <span className="relative mt-2 flex flex-wrap gap-1">
                <span className="rounded-full bg-white/25 px-2 py-0.5 font-display text-[11px] font-semibold"><CoinText text={g.reward} /></span>
                {best !== undefined && (
                  <span className="rounded-full bg-black/20 px-2 py-0.5 font-display text-[11px] font-semibold">🏆 {g.bestLabel(best)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="rounded-2xl bg-sol-light p-3 text-center text-sm text-stone-600">
        💡 Con tus monedas compra macetas, accesorios y escenarios en la <b>Tienda</b>.
      </p>
    </div>
  );
}
