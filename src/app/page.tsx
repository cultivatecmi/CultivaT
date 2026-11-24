import { GameProvider } from "@/components/GameProvider";
import { AppShell } from "@/components/layout/AppShell";

export default function Page() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}
