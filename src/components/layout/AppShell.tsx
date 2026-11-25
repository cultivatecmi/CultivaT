"use client";

import { useEffect, useState } from "react";
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
import { TourController } from "@/components/tour/TourController";
import { useTourEvent } from "@/components/tour/useTourEvent";
import { Splash } from "@/components/brand/Splash";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh max-w-[430px] border-x border-stone-200 bg-crema shadow-2xl">
      {children}
      <Toasts />
    </div>
  );
}

export function AppShell() {
  const { hydrated } = useGame();
  // el tour de presentación vuelve a mostrar la pantalla de carga
  const [splashRun, setSplashRun] = useState(0);
  useTourEvent("splash", () => setSplashRun((n) => n + 1));
  return (
    <>
      <AppContent />
      <Splash key={splashRun} ready={hydrated} />
      <TourController />
    </>
  );
}

function AppContent() {
  const { hydrated, session, state, tab } = useGame();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, session]);

  if (!hydrated) {
    return (
      <Frame>
        <div className="min-h-screen" />
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
