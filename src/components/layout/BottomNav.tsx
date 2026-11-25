"use client";

import { Camera, Gamepad2, MessageCircle, ShoppingBag, Sprout } from "lucide-react";
import { useGame } from "@/components/GameProvider";
import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
  { id: "planta", label: "Mi Planta", icon: Sprout, color: "#15803D" },
  { id: "jugar", label: "Jugar", icon: Gamepad2, color: "#29B6F6" },
  { id: "kit", label: "Mi Kit", icon: Camera, color: "#D97706" },
  { id: "tienda", label: "Tienda", icon: ShoppingBag, color: "#F59E0B" },
  { id: "sabi", label: "Sabi", icon: MessageCircle, color: "#FF7043" },
];

export function BottomNav() {
  const { tab, setTab } = useGame();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t-2 border-stone-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur">
      <ul className="grid grid-cols-5 gap-1">
        {TABS.map(({ id, label, icon: Icon, color }) => {
          const active = tab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-all active:scale-95",
                  active ? "bg-stone-100" : "opacity-70"
                )}
              >
                <span
                  className={cn("grid h-10 w-10 place-items-center rounded-2xl transition-all", active ? "-translate-y-0.5 shadow-md" : "nav-idle")}
                  style={{ background: active ? color : "transparent", color: active ? "#fff" : undefined }}
                >
                  <Icon size={24} strokeWidth={2.4} />
                </span>
                <span className={cn("font-display text-[12px] font-semibold", !active && "nav-idle")} style={{ color: active ? color : undefined }}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
