"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, ScanLine, Trash2, X } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { Polaroid, VerifiedStamp } from "@/components/kit/Polaroid";
import { TapButton } from "@/components/ui/TapButton";
import { currentWeek } from "@/lib/game";
import { compressImage } from "@/lib/image";
import { tipsForWeek } from "@/lib/kit-tips";
import { playSound } from "@/lib/sound";
import { CoinText, InlineCoin } from "@/components/ui/CoinText";
import { cn, formatShortDate, pick } from "@/lib/utils";

const KIT_WEEKS = 8;
const SCAN_MS = 1500;

const SCAN_MESSAGES = [
  "¡Hojas sanas detectadas! Tu planta se ve fuerte y verde 🌿",
  "¡Excelente registro! Los científicos del campo también miden con fotos 🔬",
  "¡Se nota que tu planta recibe luz y mucho cariño! ☀️",
  "¡Gran trabajo, agricultor! Tu kit va creciendo semana a semana 🌱",
];

type Step = "idle" | "preview" | "scanning" | "done";

export function KitScreen() {
  const { state, now, addPhoto, deletePhoto, pushToast } = useGameState();
  const week = currentWeek(state, now);
  const tips = tipsForWeek(week);
  const doneThisWeek = state.photos.some((p) => p.week === week);

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ coins: number; xp: number; first: boolean; week: number; message: string } | null>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (scanTimer.current) clearTimeout(scanTimer.current);
  }, []);

  const sorted = [...state.photos].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const weeksWithPhoto = new Set(state.photos.map((p) => p.week));
  const progress = Math.min(1, weeksWithPhoto.size / KIT_WEEKS);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      setPreview(await compressImage(file));
      setStep("preview");
      playSound("tap");
    } catch {
      pushToast("No pude abrir esa foto 😕 Intenta con otra.", "warning");
    } finally {
      setBusy(false);
    }
  };

  const scanAndSave = () => {
    if (!preview) return;
    setStep("scanning");
    playSound("whoosh", 0.6);
    scanTimer.current = setTimeout(() => {
      const r = addPhoto(preview, note);
      setOutcome({ ...r, message: pick(SCAN_MESSAGES) });
      setStep("done");
      playSound("correct");
    }, SCAN_MS);
  };

  const reset = () => {
    setStep("idle");
    setPreview(null);
    setNote("");
    setOutcome(null);
  };

  return (
    <div className="space-y-4">
      {/* encabezado */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Diario de Explorador 🧭</h2>
          <p className="text-sm text-stone-500">El álbum de campo de tu planta real.</p>
        </div>
        <div className="shrink-0 rotate-3 rounded-2xl border-2 border-dashed border-tierra bg-tierra-light px-3 py-1 text-center font-display leading-tight text-tierra-dark">
          <div className="text-[10px] font-semibold uppercase">Semana</div>
          <div className="text-2xl font-bold">{week}</div>
        </div>
      </div>

      {/* progreso del kit */}
      <section className="rounded-3xl bg-gradient-to-br from-hoja to-hoja-dark p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-semibold">🌱 Progreso del kit</p>
          <p className="font-display text-sm font-semibold">
            {weeksWithPhoto.size}/{KIT_WEEKS} semanas
          </p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-sol transition-[width] duration-700" style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-8 gap-1">
          {Array.from({ length: KIT_WEEKS }, (_, i) => i + 1).map((w) => {
            const has = weeksWithPhoto.has(w);
            const current = w === week;
            return (
              <div
                key={w}
                className={cn(
                  "grid aspect-square place-items-center rounded-full border-2 font-display text-xs font-bold",
                  has ? "border-white bg-white text-hoja-dark" : current ? "anim-streak border-sol bg-sol/30 text-white" : "border-white/40 text-white/70"
                )}
                title={`Semana ${w}`}
              >
                {has ? "✓" : w}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-white/90"><CoinText text={doneThisWeek ? "¡Ya registraste esta semana! Vuelve la próxima 📅" : `Te falta la foto de la semana ${week}: ¡gana +50 🪙 y +30 XP!`} /></p>
      </section>

      {/* antes vs hoy */}
      <section className="paper rounded-3xl border-2 border-tierra/20 p-4">
        <h3 className="mb-3 text-lg font-semibold">🔍 Antes vs. Hoy</h3>
        {first && latest && first.id !== latest.id ? (
          <div className="flex items-center gap-2">
            <Polaroid image={first.image} caption={`Semana ${first.week}`} sub="¡Así empezó!" tilt={-4} className="flex-1" onClick={() => setViewing(first.image)} />
            <div className="shrink-0 text-center font-display text-xs font-semibold text-hoja-dark">
              <div className="text-2xl">➜</div>+{latest.week - first.week} sem.
            </div>
            <Polaroid image={latest.image} caption={`Hoy · Sem. ${latest.week}`} sub="¡Mira cuánto creció!" tilt={3} stamp className="flex-1" onClick={() => setViewing(latest.image)} />
          </div>
        ) : (
          <p className="rounded-2xl bg-white/80 p-4 text-center text-sm text-stone-500">Sube al menos 2 fotos de semanas distintas para comparar el antes y el después 📸</p>
        )}
      </section>

      {/* registrar foto */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-dashed border-tierra/50 bg-tierra-light p-4">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

        {step === "idle" && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex w-full flex-col items-center gap-2 py-3 text-tierra-dark">
            <span className="grid h-20 w-20 place-items-center rounded-[28px] border-b-4 border-tierra-dark bg-tierra text-white shadow-md">
              {busy ? <ImagePlus size={36} className="animate-pulse" /> : <Camera size={36} />}
            </span>
            <span className="font-display text-lg font-semibold">{busy ? "Preparando foto..." : "Registrar mi planta real"}</span>
            <span className="text-xs text-stone-500">Toma o sube una foto de tu kit · ¡solo plantas, sin personas! 🌱</span>
          </button>
        )}

        {(step === "preview" || step === "scanning") && preview && (
          <div className="space-y-3">
            <div className="relative mx-auto max-w-[260px]">
              <Polaroid image={preview} caption={`Semana ${week}`} tilt={-2}>
                {step === "scanning" && (
                  <div className="scan-grid absolute inset-0 bg-hoja/15">
                    <div className="scan-line" />
                    <div className="anim-scan-blink absolute inset-x-0 bottom-2 text-center font-display text-xs font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">
                      🔬 Analizando hojas…
                    </div>
                  </div>
                )}
              </Polaroid>
              {step === "preview" && (
                <button type="button" onClick={reset} className="absolute -right-2 -top-2 rounded-full bg-black/60 p-1.5 text-white" aria-label="Descartar foto">
                  <X size={16} />
                </button>
              )}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
              rows={2}
              disabled={step === "scanning"}
              placeholder="Nota del explorador: ¿cuántas hojas tiene? ¿la regaste hoy?"
              className="paper w-full resize-none rounded-2xl border-2 border-stone-200 px-3 py-2 text-[15px] italic leading-7 outline-none focus:border-tierra"
            />
            <TapButton tone="hoja" size="lg" className="w-full" onClick={scanAndSave} disabled={step === "scanning"}>
              <ScanLine size={20} /> {step === "scanning" ? "Escaneando…" : "Escanear y guardar"}
            </TapButton>
          </div>
        )}

        {step === "done" && outcome && (
          <div className="anim-pop space-y-3 text-center">
            <div className="relative mx-auto max-w-[220px]">
              {preview && <Polaroid image={preview} caption={`Semana ${outcome.week}`} tilt={2} />}
              <VerifiedStamp animate className="absolute -right-3 top-[45%]" />
            </div>
            <p className="font-display text-lg font-semibold text-hoja-dark">{outcome.message}</p>
            <div className="flex justify-center gap-2">
              <span className="rounded-2xl border-b-4 border-sol-dark bg-sol px-4 py-1.5 font-display text-lg font-bold text-white">+{outcome.coins} <InlineCoin /></span>
              <span className="rounded-2xl border-b-4 border-hoja-dark bg-hoja px-4 py-1.5 font-display text-lg font-bold text-white">+{outcome.xp} XP</span>
            </div>
            {!outcome.first && <p className="text-xs text-stone-500">Ya tenías la foto de esta semana: las fotos extra dan un premio menor.</p>}
            <TapButton tone="tierra" onClick={reset}>
              ¡Genial! 🙌
            </TapButton>
          </div>
        )}
      </section>

      {/* notas de campo */}
      <section className="paper rounded-3xl border-2 border-hoja/30 p-4">
        <h3 className="text-lg font-semibold">
          {tips.emoji} Notas de campo · {tips.title}
        </h3>
        <ul className="mt-1">
          {tips.tips.map((t) => (
            <li key={t} className="flex gap-2 text-[15px] leading-7">
              <span className="text-hoja">✔</span> {t}
            </li>
          ))}
        </ul>
      </section>

      {/* álbum */}
      <section>
        <h3 className="mb-3 text-lg font-semibold">📒 Mi álbum de campo</h3>
        {sorted.length === 0 ? (
          <p className="paper rounded-2xl p-4 text-center text-sm text-stone-500">Aún no hay fotos. ¡Registra la primera de tu kit! 📷</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-1 pt-2">
            {[...sorted].reverse().map((p, i) => (
              <div key={p.id} className="relative">
                <Polaroid
                  image={p.image}
                  tilt={i % 2 ? 2.5 : -2.5}
                  stamp
                  caption={
                    <span className="flex items-center justify-between gap-1">
                      <span>Semana {p.week}</span>
                      <span className="text-[11px] font-medium text-stone-400">{formatShortDate(p.date)}</span>
                    </span>
                  }
                  sub={p.note || "Sin nota"}
                  onClick={() => setViewing(p.image)}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Borrar este registro? No se puede deshacer.")) deletePhoto(p.id);
                  }}
                  className="absolute -right-1 -top-1 rounded-full bg-white p-1 text-stone-400 shadow hover:text-alerta-dark"
                  aria-label={`Borrar foto de la semana ${p.week}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {viewing && (
        <button type="button" onClick={() => setViewing(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" aria-label="Cerrar foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="Foto del kit" className="max-h-[80vh] max-w-full rounded-2xl" />
        </button>
      )}
    </div>
  );
}
