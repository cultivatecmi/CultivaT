"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { SabiAvatar } from "@/components/ui/SabiAvatar";
import {
  CHALLENGE_REWARD,
  diagnosePlant,
  getFallbackAnswer,
  SABI_CHALLENGES,
  SABI_GREETING,
  SABI_SUGGESTIONS,
  type ChatMessage,
  type Diagnosis,
  type SabiChallenge,
} from "@/lib/sabi";
import { playSound } from "@/lib/sound";
import { cn, shuffle } from "@/lib/utils";

type UiMessage =
  | { id: number; role: "user" | "assistant"; kind: "text"; content: string }
  | { id: number; role: "assistant"; kind: "diagnosis"; content: string; diag: Diagnosis }
  | { id: number; role: "assistant"; kind: "challenge"; content: string; challenge: SabiChallenge; picked: number | null };

const STATUS_STYLE = {
  ok: { bar: "#22C55E", badge: "bg-hoja-light text-hoja-dark", icon: "✅" },
  warn: { bar: "#F59E0B", badge: "bg-sol-light text-sol-dark", icon: "⚠️" },
  bad: { bar: "#FF7043", badge: "bg-alerta-light text-alerta-dark", icon: "🚨" },
} as const;

function DiagnosisCard({ diag }: { diag: Diagnosis }) {
  return (
    <div className="w-full max-w-[300px] overflow-hidden rounded-3xl rounded-bl-md border-2 border-stone-100 bg-white shadow-sm">
      <div className={cn("px-4 py-2.5 font-display text-[15px] font-semibold", STATUS_STYLE[diag.overall].badge)}>🩺 {diag.title}</div>
      <div className="space-y-2.5 p-3">
        {diag.items.map((it) => (
          <div key={it.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-display font-semibold">
                {it.emoji} {it.label}
              </span>
              <span className="font-display text-xs font-semibold text-stone-500">
                {STATUS_STYLE[it.status].icon} {it.value}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(4, it.value)}%`, background: STATUS_STYLE[it.status].bar }} />
            </div>
            {it.status !== "ok" && <p className="mt-1 text-[13px] leading-snug text-stone-600">{it.tip}</p>}
          </div>
        ))}
        {diag.extras.map((e) => (
          <p key={e} className="rounded-xl bg-cielo-light px-2.5 py-1.5 text-[13px] leading-snug">
            {e}
          </p>
        ))}
        {diag.overall === "ok" && diag.extras.length === 0 && <p className="text-[13px] text-stone-600">¡Sigue cuidándola así todos los días! 💚</p>}
      </div>
    </div>
  );
}

function ChallengeCard({ msg, onPick }: { msg: Extract<UiMessage, { kind: "challenge" }>; onPick: (i: number) => void }) {
  const { challenge: c, picked } = msg;
  const answered = picked !== null;
  return (
    <div className="w-full max-w-[300px] rounded-3xl rounded-bl-md border-2 border-sol/50 bg-sol-light p-3 shadow-sm">
      <p className="font-display text-xs font-bold uppercase tracking-wide text-sol-dark">
        🎯 Mini-reto · {c.kind === "vf" ? "¿Verdadero o falso?" : "Adivinanza"} · +{CHALLENGE_REWARD} 🪙
      </p>
      <p className="mt-1.5 text-[15px] font-semibold leading-snug">{c.question}</p>
      <div className={cn("mt-2.5 grid gap-2", c.options.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {c.options.map((o, i) => {
          const right = answered && i === c.answer;
          const wrong = answered && i === picked && picked !== c.answer;
          return (
            <button
              key={o}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              className={cn(
                "btn-3d rounded-2xl border-2 px-3 py-2 font-display text-[15px] font-semibold",
                !answered && "border-stone-200 border-b-stone-300 bg-white",
                right && "anim-match border-hoja border-b-hoja-dark bg-hoja text-white",
                wrong && "border-alerta border-b-alerta-dark bg-alerta text-white",
                answered && !right && !wrong && "border-stone-200 bg-white text-stone-400"
              )}
              style={answered ? { opacity: 1, filter: "none" } : undefined}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SabiScreen() {
  const { state, reward } = useGameState();
  const [messages, setMessages] = useState<UiMessage[]>([{ id: 0, role: "assistant", kind: "text", content: SABI_GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"gemini" | "local" | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const queue = useRef<SabiChallenge[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const push = (m: Omit<UiMessage, "id"> & Record<string, unknown>) => {
    setMessages((cur) => [...cur, { ...(m as UiMessage), id: idRef.current++ }]);
  };

  /** Sabi "escribe" un momento antes de responder */
  const typing = (ms = 750) =>
    new Promise<void>((r) => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        r();
      }, ms);
    });

  const send = async (text: string) => {
    const q = text.trim().slice(0, 300);
    if (!q || loading) return;
    const history: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: q },
    ];
    push({ role: "user", kind: "text", content: q });
    setInput("");
    setLoading(true);
    let reply: string;
    try {
      // en GitHub Pages (sitio estático) no hay servidor: Sabi usa su libreta local
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") throw new Error("static");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-8) }),
      });
      if (!res.ok) throw new Error("api");
      const data = (await res.json()) as { reply?: string; source?: "gemini" | "local" };
      reply = data.reply || getFallbackAnswer(q);
      setSource(data.source ?? "local");
    } catch {
      reply = getFallbackAnswer(q);
      setSource("local");
    }
    await new Promise((r) => setTimeout(r, 450));
    setLoading(false);
    push({ role: "assistant", kind: "text", content: reply });
    playSound("pop", 0.6);
  };

  const diagnose = async () => {
    if (loading) return;
    playSound("tap");
    push({ role: "user", kind: "text", content: "🩺 ¡Diagnostica a mi planta!" });
    await typing(900);
    const diag = diagnosePlant(stateRef.current);
    push({ role: "assistant", kind: "diagnosis", content: diag.summary, diag });
    playSound(diag.overall === "ok" ? "correct" : "pop");
  };

  const challenge = async () => {
    if (loading) return;
    playSound("tap");
    if (queue.current.length === 0) queue.current = shuffle(SABI_CHALLENGES);
    const c = queue.current.shift()!;
    push({ role: "user", kind: "text", content: "🎯 ¡Quiero un mini-reto!" });
    await typing(700);
    push({ role: "assistant", kind: "challenge", content: c.question, challenge: c, picked: null });
  };

  const pick = async (msgId: number, i: number) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.kind !== "challenge" || msg.picked !== null) return;
    setMessages((cur) => cur.map((m) => (m.id === msgId && m.kind === "challenge" ? { ...m, picked: i } : m)));
    const ok = i === msg.challenge.answer;
    if (ok) {
      playSound("correct");
      reward(CHALLENGE_REWARD, 5, "¡Mini-reto de Sabi!");
    } else {
      playSound("wrong");
    }
    await typing(600);
    push({
      role: "assistant",
      kind: "text",
      content: ok ? `¡Correctísimo! 🎉 Ganaste ${CHALLENGE_REWARD} 🪙. ${msg.challenge.explain}` : `¡Casi! 💪 La respuesta era “${msg.challenge.options[msg.challenge.answer]}”. ${msg.challenge.explain}`,
    });
  };

  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content));
  const chips = SABI_SUGGESTIONS.filter((s) => !asked.has(s));

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col">
      <div className="mb-3 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-sol-light to-hoja-light p-3">
        <SabiAvatar className="h-20 w-[72px] shrink-0" talking={loading} />
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold leading-tight">Sabi 🌻</h2>
          <p className="text-sm text-stone-600">{loading ? "Sabi está pensando…" : "Tu guía explorador del campo."}</p>
          {source && <p className="text-[11px] font-semibold text-stone-400">{source === "gemini" ? "✨ Respuestas con IA" : "📚 Respuestas de mi libreta"}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-3 pb-3">
        {messages.map((m) => (
          <div key={m.id} className={cn("anim-pop flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && <SabiAvatar className="h-9 w-8 shrink-0" />}
            {m.kind === "diagnosis" ? (
              <DiagnosisCard diag={m.diag} />
            ) : m.kind === "challenge" ? (
              <ChallengeCard msg={m} onPick={(i) => pick(m.id, i)} />
            ) : (
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-line rounded-3xl px-4 py-2.5 text-[15px] leading-snug shadow-sm",
                  m.role === "user" ? "rounded-br-md bg-cielo text-white" : "rounded-bl-md border-2 border-stone-100 bg-white"
                )}
              >
                {m.content}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2">
            <SabiAvatar className="h-9 w-8 shrink-0" talking />
            <div className="flex gap-1 rounded-3xl rounded-bl-md border-2 border-stone-100 bg-white px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-2 w-2 rounded-full bg-sol" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        {/* margen para que lo último quede visible sobre los botones fijos */}
        <div ref={endRef} style={{ scrollMarginBottom: 250 }} />
      </div>

      <div className="sticky bottom-[92px] -mx-4 space-y-2 bg-crema/95 px-4 pb-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={diagnose}
            disabled={loading}
            className="btn-3d rounded-2xl border-hoja-dark bg-hoja px-2 py-2.5 font-display text-[14px] font-semibold leading-tight text-white"
          >
            🩺 Diagnosticar a mi planta
          </button>
          <button
            type="button"
            onClick={challenge}
            disabled={loading}
            className="btn-3d rounded-2xl border-sol-dark bg-sol px-2 py-2.5 font-display text-[14px] font-semibold leading-tight text-white"
          >
            🎯 Mini-reto de Sabi (+{CHALLENGE_REWARD} 🪙)
          </button>
        </div>
        {chips.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {chips.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={loading}
                className="shrink-0 rounded-full border-2 border-sol/50 bg-sol-light px-3.5 py-1.5 font-display text-sm font-medium text-tierra-dark active:scale-95 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={300}
            placeholder="Escribe tu pregunta..."
            className="min-w-0 flex-1 rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-sol"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-3d grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border-sol-dark bg-sol text-white"
            aria-label="Enviar"
          >
            <Send size={22} />
          </button>
        </form>
      </div>
    </div>
  );
}
