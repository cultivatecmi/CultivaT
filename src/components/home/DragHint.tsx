"use client";

import { useLayoutEffect, useState } from "react";
import type { ToolId } from "@/lib/types";
import { ToolIcon, TOOLS } from "./SceneProps";

interface Props {
  tool: ToolId;
  homeRef: React.RefObject<HTMLDivElement | null>;
  plantRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Mano que "arrastra" una herramienta desde su botón hasta la planta,
 * para enseñar que las herramientas se arrastran (no solo se tocan).
 */
export function DragHint({ tool, homeRef, plantRef }: Props) {
  const [pos, setPos] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);

  useLayoutEffect(() => {
    const home = homeRef.current;
    const plant = plantRef.current;
    const btn = home?.querySelector<HTMLElement>(`[data-tool="${tool}"]`);
    if (!home || !plant || !btn) return;
    const h = home.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const p = plant.getBoundingClientRect();
    setPos({
      sx: b.left + b.width / 2 - h.left,
      sy: b.top + b.height / 2 - h.top,
      ex: p.left + p.width / 2 - h.left,
      ey: p.top + p.height * 0.45 - h.top,
    });
  }, [tool, homeRef, plantRef]);

  if (!pos) return null;
  const label = TOOLS.find((t) => t.id === tool)?.label.toLowerCase() ?? "";
  const style = {
    "--sx": `${pos.sx}px`,
    "--sy": `${pos.sy}px`,
    "--ex": `${pos.ex}px`,
    "--ey": `${pos.ey}px`,
  } as React.CSSProperties;

  return (
    <>
      <div key={tool} className="drag-hint pointer-events-none absolute left-0 top-0 z-40" style={style} aria-hidden>
        {/* la herramienta viaja junto al dedo */}
        <div className="drag-hint-tool absolute -left-[30px] -top-[62px] drop-shadow-lg">
          <ToolIcon id={tool} size={48} />
        </div>
        <span className="absolute -left-[14px] -top-[6px] text-[44px] leading-none drop-shadow-[0_3px_3px_rgba(0,0,0,.35)]">👆</span>
      </div>
      <div
        className="anim-pop pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-3.5 py-1.5 font-display text-sm font-semibold text-tinta shadow-lg"
        style={{ bottom: "calc(var(--tray-b) + 92px)" }}
      >
        Arrastra {tool === "water" ? "la regadera" : tool === "feed" ? "el abono" : tool === "shade" ? "la sombrilla" : "la esponja"} 👆
        <span className="sr-only">{label}</span>
      </div>
    </>
  );
}
