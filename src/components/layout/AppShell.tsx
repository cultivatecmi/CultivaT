"use client";

import { useEffect } from "react";
import { useGame } from "@/components/GameProvider";
import { Welcome } from "@/components/Welcome";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { PlayScreen } from "@/components/screens/PlayScreen";
import { KitScreen } from "@/components/screens/KitScreen";
import { ShopScreen } from "@/components/screens/ShopScreen";
import { SabiScreen } from "@/components/screens/SabiScreen";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Toasts } from "./Toasts";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh max-w-[430px] border-x border-stone-200 bg-crema shadow-2xl">
      {children}
      <Toasts />
    </div>
  );
}

export function AppShell() {
  const { hydrated, session, state, tab } = useGame();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, session]);

  if (!hydrated) {
    return (
      <Frame>
        <div className="grid min-h-screen place-items-center">
          <div className="anim-bob text-6xl">🌱</div>
        </div>
      </Frame>
    );
  }

  if (!session || !state) {
    return (
      <Frame>
        <Welcome />
      </Frame>
    );
  }

  // "Mi Planta" es una escena inmersiva a pantalla completa (sin header ni scroll)
  if (tab === "planta") {
    return (
      <Frame>
        <HomeScreen />
        <BottomNav />
      </Frame>
    );
  }

  return (
    <Frame>
      <Header />
      <main className="px-4 pb-32 pt-3">
        {tab === "jugar" && <PlayScreen />}
        {tab === "kit" && <KitScreen />}
        {tab === "tienda" && <ShopScreen />}
        {tab === "sabi" && <SabiScreen />}
      </main>
      <BottomNav />
    </Frame>
  );
}
