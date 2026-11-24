"use client";

import { PlantCharacter } from "@/components/plant/PlantCharacter";
import { SHOP_ITEMS } from "@/lib/shop";
import type { Mood } from "@/lib/types";

// Página TEMPORAL solo para revisión visual (se borra después)
export default function Galeria() {
  const moods: Mood[] = ["sedienta", "acalorada", "hambrienta", "marchita"];
  const accs = SHOP_ITEMS.filter((i) => i.category === "accessory");
  const cell = { background: "#E3F2FD", fontSize: 10, fontFamily: "sans-serif" } as const;
  return (
    <div style={{ background: "#fff", padding: 6 }}>
      <div id="stages" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
        {[0, 1, 2, 3].map((s) => (
          <div key={s} style={cell}>
            <PlantCharacter mood="feliz" stage={s} pot="pot-barro" accessory={null} />
            etapa {s + 1}
          </div>
        ))}
        {moods.map((m, i) => (
          <div key={m} style={cell}>
            <PlantCharacter mood={m} stage={i % 2 ? 3 : 2} pot="pot-barro" accessory={null} dirt={m === "hambrienta" ? 2 : 0} />
            {m}
          </div>
        ))}
      </div>
      {[0, 1, 2, 3].map((s) => (
        <div key={s} id={`acc${s}`} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginTop: 6 }}>
          {accs.map((a) => (
            <div key={a.id} style={{ ...cell, background: "#FFF8E1" }}>
              <PlantCharacter mood="feliz" stage={s} pot="pot-barro" accessory={a.id} />
              {a.id.replace("acc-", "")} e{s + 1}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
