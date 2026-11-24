"use client";

import { useEffect, useState } from "react";
import { BellRing, LogOut, Trash2, X } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { cn, timeAgo } from "@/lib/utils";

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { state, clearNotifications, enableBrowserNotifications, logout, now, session } = useGameState();
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    else setPerm("unsupported");
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div className="anim-pop absolute left-3 right-3 top-full z-50 mt-1 max-h-[70vh] overflow-hidden rounded-3xl border-2 border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-lg font-semibold">🔔 Avisos de cuidado</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-stone-400 hover:bg-stone-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[42vh] overflow-y-auto px-2 py-2">
          {state.notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-stone-500">¡Todo en orden! No tienes avisos. 🌿</p>}
          {state.notifications.map((n) => (
            <div key={n.id} className={cn("mb-1 rounded-2xl px-3 py-2.5", n.read ? "bg-white" : "bg-hoja-light")}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-[15px] font-semibold leading-tight">{n.title}</p>
                <span className="shrink-0 text-[11px] text-stone-400">{timeAgo(n.createdAt, now)}</span>
              </div>
              <p className="mt-0.5 text-sm leading-snug text-stone-600">{n.body}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-stone-100 p-3">
          {perm === "default" && (
            <button
              type="button"
              onClick={async () => {
                const ok = await enableBrowserNotifications();
                setPerm(ok ? "granted" : "denied");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cielo-light py-2.5 font-display font-semibold text-cielo-dark"
            >
              <BellRing size={18} /> Activar recordatorios del navegador
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={clearNotifications} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-stone-100 py-2 font-display text-sm font-semibold text-stone-600">
              <Trash2 size={16} /> Borrar avisos
            </button>
            <button type="button" onClick={logout} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-alerta-light py-2 font-display text-sm font-semibold text-alerta-dark">
              <LogOut size={16} /> {session?.isDemo ? "Salir del demo" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
