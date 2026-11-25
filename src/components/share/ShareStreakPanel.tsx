"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, Loader2, Share2, X } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { PlantCharacter } from "@/components/plant/PlantCharacter";
import { BackgroundScene } from "@/components/plant/BackgroundScene";
import { getStage } from "@/lib/stages";
import { playSound } from "@/lib/sound";
import { buildStreakImage } from "./streakImage";

function appLink() {
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
}

/** Comparte la racha con una imagen de la planta (WhatsApp, redes, descargar) */
export function ShareStreakPanel({ onClose }: { onClose: () => void }) {
  const { state, pushToast } = useGameState();
  const st = getStage(state.xp);
  const sceneRef = useRef<HTMLDivElement>(null);
  const plantRef = useRef<HTMLDivElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");

  const days = state.streak === 1 ? "día" : "días";
  const text =
    state.streak > 0
      ? `🔥 ¡Llevo ${state.streak} ${days} seguidos cuidando a mi planta ${state.plantName} en CultivaT! 🌱 Cuida tu planta tú también:`
      : `🌱 ¡Estoy cuidando a mi planta ${state.plantName} en CultivaT! Cuida tu planta tú también:`;
  const fullText = `${text} ${link}`;

  useEffect(() => {
    const l = appLink();
    setLink(l);
    let url: string | null = null;
    let cancelled = false;
    // espera a que los SVG estén en pantalla
    const t = setTimeout(async () => {
      try {
        const b = await buildStreakImage({
          streak: state.streak,
          plantName: state.plantName,
          stageLabel: `${st.stage.emoji} ${st.stage.name}`,
          link: l,
          sceneSvg: sceneRef.current?.querySelector("svg") ?? null,
          plantSvg: plantRef.current?.querySelector("svg") ?? null,
        });
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setBlob(b);
        setPreview(url);
      } catch {
        if (!cancelled) pushToast("No pude crear la imagen 😕", "warning");
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
    };
    // la imagen se arma una vez al abrir el panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const file = blob ? new File([blob], `cultivat-racha-${state.streak}.png`, { type: "image/png" }) : null;
  const canShareFile = typeof navigator !== "undefined" && !!file && !!navigator.canShare?.({ files: [file] });
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const shareNative = async () => {
    playSound("tap");
    try {
      if (canShareFile && file) await navigator.share({ files: [file], text: fullText, title: "Mi racha en CultivaT" });
      else await navigator.share({ text, url: link, title: "Mi racha en CultivaT" });
    } catch {
      /* el usuario canceló */
    }
  };

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `cultivat-racha-${state.streak}.png`;
    a.click();
    pushToast("📥 Imagen descargada", "success");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      pushToast("📋 Texto y enlace copiados", "success");
    } catch {
      pushToast("No se pudo copiar", "warning");
    }
  };

  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const socials = [
    { name: "WhatsApp", color: "#25D366", emoji: "💬", url: `https://wa.me/?text=${encodeURIComponent(fullText)}` },
    { name: "Facebook", color: "#1877F2", emoji: "📘", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(text)}` },
    { name: "X", color: "#111", emoji: "✖️", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}` },
    { name: "Telegram", color: "#229ED9", emoji: "✈️", url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-center bg-black/45" onClick={onClose} role="dialog" aria-modal="true" aria-label="Compartir mi racha">
      <div className="anim-pop mt-auto flex max-h-[94dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="text-xl font-semibold text-tinta">🔥 Compartir mi racha</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 text-tinta">
          {/* vista previa de la imagen */}
          <div className="mx-auto aspect-[4/5] w-full max-w-[300px] overflow-hidden rounded-3xl border-4 border-white bg-stone-100 shadow-lg">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={`Mi planta con ${state.streak} ${days} de racha`} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-stone-500">
                <span className="flex items-center gap-2 font-display font-semibold">
                  <Loader2 size={20} className="animate-spin" /> Preparando tu foto…
                </span>
              </div>
            )}
          </div>

          {canShare && (
            <button
              type="button"
              onClick={shareNative}
              disabled={!blob}
              className="btn-3d flex w-full items-center justify-center gap-2 rounded-2xl border-hoja-dark bg-hoja py-3.5 font-display text-lg font-semibold text-white"
            >
              <Share2 size={20} /> Compartir foto
            </button>
          )}

          <div className="grid grid-cols-4 gap-2">
            {socials.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  playSound("tap");
                  open(s.url);
                }}
                className="flex flex-col items-center gap-1 rounded-2xl bg-stone-100 py-2.5 active:scale-95"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full text-lg text-white" style={{ background: s.color }}>
                  {s.emoji}
                </span>
                <span className="font-display text-xs font-semibold">{s.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={download} disabled={!preview} className="flex items-center justify-center gap-1.5 rounded-2xl bg-stone-100 py-2.5 font-display text-sm font-semibold disabled:opacity-50">
              <Download size={16} /> Descargar foto
            </button>
            <button type="button" onClick={copy} className="flex items-center justify-center gap-1.5 rounded-2xl bg-stone-100 py-2.5 font-display text-sm font-semibold">
              <Copy size={16} /> Copiar enlace
            </button>
          </div>

          <p className="pb-2 text-center text-xs text-stone-500">
            💡 Para mandar la foto por WhatsApp o Instagram usa <b>Compartir foto</b> (o descárgala y adjúntala). Pide permiso a un adulto antes de publicar en redes. 🔒 La imagen no muestra tu apodo.
          </p>
        </div>

        {/* SVG en pantalla (fuera de vista) para armar la imagen */}
        <div aria-hidden className="pointer-events-none fixed -left-[2000px] top-0 h-[320px] w-[400px] opacity-0">
          <div ref={sceneRef} className="h-[320px] w-[400px]">
            <BackgroundScene id={state.equipped.background} className="h-full w-full" />
          </div>
          <div ref={plantRef} className="w-[240px]">
            <PlantCharacter mood="feliz" stage={st.index} pot={state.equipped.pot} accessory={state.equipped.accessory} reaction="risa" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
