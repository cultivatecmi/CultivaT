"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { useGameState } from "@/components/GameProvider";
import { CoinIcon } from "@/components/ui/GameIcons";
import { PlantScene } from "@/components/plant/PlantScene";
import { PlantCharacter } from "@/components/plant/PlantCharacter";
import { BackgroundScene } from "@/components/plant/BackgroundScene";
import { TapButton } from "@/components/ui/TapButton";
import { computeMood, LADYBUG_PRICE } from "@/lib/game";
import { LadybugSvg, formatLeft, useLadybugLeft } from "@/components/home/Ladybug";
import { CATEGORY_LABELS, SHOP_ITEMS, type ShopItem } from "@/lib/shop";
import { getStage } from "@/lib/stages";
import type { Equipped, ItemCategory } from "@/lib/types";
import { InlineCoin } from "@/components/ui/CoinText";
import { cn } from "@/lib/utils";

const CATS: ItemCategory[] = ["pot", "accessory", "background"];

function withItem(eq: Equipped, item: ShopItem): Equipped {
  if (item.category === "accessory") return { ...eq, accessory: item.id };
  return { ...eq, [item.category]: item.id };
}

/** acercamiento por etapa: la plantita chica se ve más de cerca para que luzca el accesorio */
const THUMB_ZOOM = [1.7, 1.35, 1.12, 1];

function ItemThumb({ item, stage, current }: { item: ShopItem; stage: number; current: Equipped }) {
  if (item.category === "background") {
    return <BackgroundScene id={item.id} className="h-full w-full" />;
  }
  // se muestra la planta en SU etapa actual, con su maceta (o el accesorio que ya trae)
  const eq: Equipped = item.category === "pot" ? { ...current, pot: item.id } : { ...current, accessory: item.id };
  return (
    <div className="h-full w-full" style={{ transform: `scale(${THUMB_ZOOM[stage] ?? 1})`, transformOrigin: "50% 92%" }}>
      <PlantCharacter mood="feliz" stage={stage} pot={eq.pot} accessory={eq.accessory} className="h-full w-full p-1" />
    </div>
  );
}

export function ShopScreen() {
  const { state, now, buyItem, equipItem, buyLadybug } = useGameState();
  const ladyLeft = useLadybugLeft(state.ladybugUntil ?? 0);
  const [cat, setCat] = useState<ItemCategory>("pot");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const stage = getStage(state.xp).index;
  const mood = computeMood(state, now);

  const previewItem = previewId ? SHOP_ITEMS.find((i) => i.id === previewId) ?? null : null;
  const shownEquipped = previewItem ? withItem(state.equipped, previewItem) : state.equipped;

  const isEquipped = (item: ShopItem) =>
    item.category === "accessory" ? state.equipped.accessory === item.id : state.equipped[item.category] === item.id;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Tienda y Estilo 🛍️</h2>
          <p className="text-sm text-stone-500">Toca un artículo para probártelo.</p>
        </div>
        <div className="rounded-2xl bg-sol px-3 py-1.5 font-display text-lg font-semibold text-white shadow flex items-center gap-1"><CoinIcon size={20} /> {state.coins}</div>
      </div>

      <PlantScene className="h-[230px]" plantWidth="min(60%, 196px)" mood={mood === "marchita" ? "marchita" : "feliz"} stage={stage} equipped={shownEquipped}>
        {previewItem && !state.owned.includes(previewItem.id) && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 font-display text-sm font-semibold shadow">👀 Probando: {previewItem.name}</span>
        )}
      </PlantScene>

      {/* ayudante temporal: control biológico */}
      <section className="flex items-center gap-3 rounded-3xl border-2 border-[#E53935]/30 bg-[#FFEBEE] p-3 shadow-sm" aria-label="Ayudante temporal">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white shadow-inner">
          <LadybugSvg className={cn("h-12 w-12", ladyLeft > 0 && "anim-float")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-bold uppercase tracking-wide text-[#C62828]">Ayudante temporal</p>
          <h3 className="font-display text-base font-semibold leading-tight text-[#3E2C23]">🐞 Catarina Guardiana (3 min)</h3>
          <p className="text-xs leading-snug text-stone-600">Se come automáticamente a los pulgones sin usar químicos.</p>
        </div>
        {ladyLeft > 0 ? (
          <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center font-display text-sm font-bold text-[#C62828] shadow-sm">
            Activa
            <br />🐞 {formatLeft(ladyLeft)}
          </span>
        ) : (
          <TapButton tone="sol" size="sm" className="shrink-0" onClick={() => buyLadybug()}>
            {LADYBUG_PRICE} <InlineCoin />
          </TapButton>
        )}
      </section>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCat(c);
              setPreviewId(null);
            }}
            className={cn("rounded-xl py-2 font-display text-[15px] font-semibold transition-all", cat === c ? "bg-white text-tinta shadow" : "text-stone-500")}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SHOP_ITEMS.filter((i) => i.category === cat).map((item) => {
          const owned = state.owned.includes(item.id);
          const equipped = isEquipped(item);
          const affordable = state.coins >= item.price;
          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-3xl border-2 bg-white transition-all",
                equipped ? "border-hoja shadow-md shadow-hoja/20" : previewId === item.id ? "border-cielo" : "border-stone-200"
              )}
            >
              <button type="button" onClick={() => setPreviewId(item.id)} className="relative h-28 overflow-hidden bg-crema">
                <ItemThumb item={item} stage={stage} current={state.equipped} />
                {equipped && (
                  <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-hoja text-white shadow">
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-1 p-3 pt-2">
                <p className="font-display font-semibold leading-tight">
                  {item.emoji} {item.name}
                </p>
                <p className="flex-1 text-xs leading-snug text-stone-500">{item.description}</p>
                {owned ? (
                  <TapButton
                    tone={equipped ? "blanco" : "hoja"}
                    size="sm"
                    className="mt-1 w-full"
                    onClick={() => {
                      equipItem(item.id);
                      setPreviewId(null);
                    }}
                    disabled={equipped && item.category !== "accessory"}
                  >
                    {equipped ? (item.category === "accessory" ? "Quitar" : "¡Puesto!") : "Equipar"}
                  </TapButton>
                ) : (
                  <TapButton
                    tone={affordable ? "sol" : "blanco"}
                    size="sm"
                    className="mt-1 w-full"
                    onClick={() => {
                      if (buyItem(item.id)) setPreviewId(null);
                    }}
                  >
                    {affordable ? <>Comprar · {item.price} <InlineCoin /></> : (
                      <>
                        <Lock size={14} /> {item.price} <InlineCoin />
                      </>
                    )}
                  </TapButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="rounded-2xl bg-sol-light p-3 text-center text-sm text-stone-600">
        💡 Gana monedas cuidando tu planta, jugando <b>Atrapa la Lluvia</b>, respondiendo la <b>Trivia</b> y subiendo la foto semanal de tu kit.
      </p>
    </div>
  );
}
