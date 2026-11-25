"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/GameProvider";
import { TapButton } from "@/components/ui/TapButton";
import { GameIntro, GameResult } from "./GameUi";
import { TRIVIA_QUESTIONS, TRIVIA_REWARD, TRIVIA_ROUND, TRIVIA_SECONDS, type TriviaQuestion } from "@/lib/trivia";
import { playSound } from "@/lib/sound";
import { InlineCoin } from "@/components/ui/CoinText";
import { isTourActive } from "@/lib/tour";
import { cn, shuffle } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

/** bonus de racha: 3 seguidas = +5, 5 seguidas = +10 */
const STREAK_BONUS: Record<number, number> = { 3: 5, 5: 10 };

/** Mezcla también las opciones para que no se memorice la letra */
function prepare(q: TriviaQuestion): TriviaQuestion {
  const opts = shuffle(q.options.map((text, i) => ({ text, ok: i === q.answer })));
  return { ...q, options: opts.map((o) => o.text), answer: opts.findIndex((o) => o.ok) };
}

interface Result {
  correct: number;
  bestStreak: number;
  coins: number;
  newBest: boolean;
  happy: number;
  dailyDone: boolean;
}

const RECENT_KEY = "cultivat:v1:trivia-recent";
const RECENT_MAX = 25;

function readRecent(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(ids: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(Array.from(new Set(ids)).slice(0, RECENT_MAX)));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function TriviaGame({ onExit }: { onExit: () => void }) {
  const { reward, recordGame, recordTriviaRound, state } = useGameState();
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [earned, setEarned] = useState(0);
  const [bonus, setBonus] = useState<number | null>(null);
  const [left, setLeft] = useState(TRIVIA_SECONDS);
  const [result, setResult] = useState<Result | null>(null);
  const qStart = useRef(0);

  const answered = selected !== null || timedOut;

  const start = () => {
    // primero las preguntas que no salieron en las últimas rondas
    const recent = readRecent();
    const fresh = shuffle(TRIVIA_QUESTIONS.filter((q) => !recent.includes(q.id)));
    const pickList = [...fresh, ...shuffle(TRIVIA_QUESTIONS.filter((q) => recent.includes(q.id)))].slice(0, TRIVIA_ROUND);
    saveRecent([...pickList.map((q) => q.id), ...recent]);
    setQuestions(pickList.map(prepare));
    setIdx(0);
    setSelected(null);
    setTimedOut(false);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setEarned(0);
    setBonus(null);
    setPhase("playing");
  };

  // temporizador de cada pregunta
  useEffect(() => {
    if (phase !== "playing" || answered) return;
    qStart.current = performance.now();
    setLeft(TRIVIA_SECONDS);
    const id = setInterval(() => {
      const l = Math.max(0, TRIVIA_SECONDS - (performance.now() - qStart.current) / 1000);
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        setTimedOut(true);
        setStreak(0);
        playSound("wrong");
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, idx, answered]);

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i);
    if (i === questions[idx].answer) {
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setCorrect((c) => c + 1);
      const extra = STREAK_BONUS[s] ?? 0;
      setBonus(extra || null);
      const given = reward(TRIVIA_REWARD + extra, 10 + extra, extra ? `¡Racha x${s}! (+${extra} bonus)` : "¡Respuesta correcta!");
      setEarned((e) => e + given);
      playSound("correct");
      if (navigator.vibrate) navigator.vibrate(30);
    } else {
      setStreak(0);
      setBonus(null);
      playSound("wrong");
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      recordTriviaRound(correct);
      const { newBest, happy, dailyDone } = recordGame("trivia", { score: correct, coins: 0, xp: 5, label: "" });
      setResult({ correct, bestStreak, coins: earned, newBest, happy, dailyDone });
      if (correct >= 4) playSound("levelup");
      setPhase("done");
    } else {
      setIdx(idx + 1);
      setSelected(null);
      setTimedOut(false);
      setBonus(null);
    }
  };

  const best = state.stats.best.trivia;
  const shell = "keep-light overflow-hidden rounded-3xl border-4 border-white shadow-lg";
  const bg = { background: "linear-gradient(180deg, #FFF3E0, #FFCCBC)", minHeight: 430 };

  if (phase === "intro") {
    return (
      <div className={shell} style={bg}>
        <GameIntro emoji="🧠" title="Trivia del Campo" color="#E64A19" best={best !== undefined ? `${best}/${TRIVIA_ROUND} aciertos` : null} buttonTone="alerta" onStart={start}>
          <p>
            {TRIVIA_ROUND} preguntas relámpago de <b>{TRIVIA_SECONDS} segundos</b> sobre plantas, agua y el campo de Culiacán.
          </p>
          <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
            <InlineCoin /> <b>{TRIVIA_REWARD}</b> por acierto · 🔥 Racha de 3 = <b>+5</b> · Racha de 5 = <b>+10</b>
          </p>
        </GameIntro>
      </div>
    );
  }

  if (phase === "done" && result) {
    const perfect = result.correct === TRIVIA_ROUND;
    return (
      <div className={shell} style={bg}>
        <GameResult
          medal={perfect ? "🏆" : result.correct >= 3 ? "🥈" : "🌱"}
          title={`${result.correct}/${TRIVIA_ROUND} aciertos`}
          coins={result.coins}
          newBest={result.newBest && result.correct > 0}
          happy={result.happy}
            dailyDone={result.dailyDone}
          buttonTone="alerta"
          onRetry={start}
          onExit={onExit}
        />
      </div>
    );
  }

  const q = questions[idx];
  if (!q) return null;
  const isRight = selected === q.answer;

  return (
    <div className="space-y-3">
      {/* progreso + racha */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className={cn("h-2.5 flex-1 rounded-full", i < idx ? "bg-hoja" : i === idx ? "bg-sol" : "bg-stone-200")} />
          ))}
        </div>
        <div className={cn("rounded-full px-3 py-1 font-display text-sm font-bold", streak >= 2 ? "anim-streak bg-sol text-white" : "bg-white text-stone-500 shadow-sm")}>
          🔥 {streak}
        </div>
      </div>

      <div key={q.id} className="anim-pop relative overflow-hidden rounded-3xl border-2 border-stone-200 bg-white p-5 pt-6 text-center shadow-sm">
        {/* tiempo */}
        <div className="absolute inset-x-0 top-0 h-2 bg-stone-100">
          <div
            className={cn("h-full transition-[width] duration-100", left < 6 ? "bg-alerta" : "bg-hoja")}
            style={{ width: `${answered ? 0 : (left / TRIVIA_SECONDS) * 100}%` }}
          />
        </div>
        <div className="anim-card-float text-6xl">{q.emoji}</div>
        <p className="mt-1 font-display text-xs font-semibold uppercase tracking-wider text-stone-400">
          Pregunta {idx + 1} de {questions.length} · ⏱ {Math.ceil(left)} s
        </p>
        <h3 className="mt-2 text-xl font-semibold leading-snug">{q.question}</h3>
      </div>

      <div className="grid gap-2.5">
        {q.options.map((opt, i) => {
          const showRight = answered && i === q.answer;
          const showWrong = answered && i === selected && !isRight;
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => choose(i)}
              data-tour-correct={isTourActive() && i === q.answer ? "1" : undefined}
              className={cn(
                "btn-3d flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-display text-[17px] font-medium transition-colors",
                !answered && "border-stone-200 border-b-stone-300 bg-white active:bg-stone-50",
                showRight && "anim-match border-hoja border-b-hoja-dark bg-hoja text-white",
                showWrong && "anim-board-shake border-alerta border-b-alerta-dark bg-alerta text-white",
                answered && !showRight && !showWrong && "border-stone-200 bg-stone-50 text-stone-400"
              )}
              style={answered ? { opacity: 1, filter: "none" } : undefined}
            >
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold", showRight || showWrong ? "bg-white/25" : "bg-stone-100")}>
                {showRight ? "✓" : showWrong ? "✗" : LETTERS[i]}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="anim-pop space-y-2">
          <div className={cn("rounded-2xl p-4", isRight ? "bg-hoja-light" : "bg-alerta-light")}>
            <p className="font-display text-lg font-semibold">
              {timedOut ? "⏰ ¡Se acabó el tiempo!" : isRight ? <>¡Correcto! +{TRIVIA_REWARD} <InlineCoin /></> : "¡Casi! 💪"}
              {bonus ? <span className="ml-1 text-sol-dark">🔥 +{bonus} bonus</span> : null}
            </p>
            <p className="text-[15px] leading-snug">{q.explanation}</p>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-sol bg-sol-light p-3 text-[15px] leading-snug">
            <b className="font-display">🤓 ¿Sabías que…?</b> {q.fact}
          </div>
          <TapButton tone={isRight ? "hoja" : "alerta"} className="w-full" onClick={next}>
            {idx + 1 >= questions.length ? "Ver resultado 🏁" : "Siguiente pregunta →"}
          </TapButton>
        </div>
      )}
    </div>
  );
}
