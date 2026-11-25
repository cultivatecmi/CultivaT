"use client";

import { memo } from "react";
import { BackgroundScene, GROUND_COLORS } from "@/components/plant/BackgroundScene";
import type { Climate } from "@/lib/weather";
import { cn } from "@/lib/utils";

const SKIES: Record<Climate, string> = {
  soleado: "linear-gradient(180deg, #4FC3F7 0%, #9FE0FF 42%, #FFF4D6 100%)",
  nublado: "linear-gradient(180deg, #8FB3C9 0%, #BCD5E2 45%, #EEF2EA 100%)",
  calor: "linear-gradient(180deg, #FF7043 0%, #FFA05C 38%, #FFE0B2 100%)",
  lluvia: "linear-gradient(180deg, #607D8B 0%, #93A9B5 45%, #D5E0E6 100%)",
};

const CLOUDS = [
  { top: "9%", scale: 1, dur: 55, delay: -10 },
  { top: "18%", scale: 0.7, dur: 70, delay: -42 },
  { top: "27%", scale: 0.85, dur: 48, delay: -25 },
  { top: "5%", scale: 0.55, dur: 80, delay: -65 },
  { top: "33%", scale: 0.6, dur: 62, delay: -5 },
];

const RAIN = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 37) % 100,
  dur: 0.55 + ((i * 13) % 7) * 0.06,
  delay: -((i * 0.17) % 1.2),
  len: 14 + ((i * 7) % 10),
}));

interface Props {
  background: string;
  climate: Climate;
  /** distancia (CSS) desde abajo donde debe quedar la línea del piso */
  floorBottom: string;
}

function CloudShape({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 120 56" className="h-[56px] w-[120px]" aria-hidden>
      <g fill={dark ? "#B0BEC5" : "#fff"} opacity={dark ? 0.95 : 0.92}>
        <ellipse cx="60" cy="34" rx="44" ry="18" />
        <ellipse cx="36" cy="36" rx="24" ry="14" />
        <ellipse cx="84" cy="36" rx="26" ry="14" />
        <ellipse cx="62" cy="20" rx="24" ry="17" />
      </g>
      <ellipse cx="60" cy="46" rx="40" ry="6" fill={dark ? "#78909C" : "#E3F2FD"} opacity="0.6" />
    </svg>
  );
}

function SunShape({ intense }: { intense: boolean }) {
  return (
    <div className={cn("absolute right-[6%] top-[13%] transition-transform duration-[2000ms]", intense ? "scale-[1.45]" : "scale-100")} aria-hidden>
      <svg viewBox="0 0 120 120" className="sun-rays h-[110px] w-[110px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d="M60 4 L66 24 L54 24 Z" fill={intense ? "#FF7043" : "#FFD54F"} transform={`rotate(${i * 30} 60 60)`} />
        ))}
      </svg>
      <div
        className={cn("absolute inset-[22%] rounded-full", intense ? "anim-sun" : "")}
        style={{
          background: intense
            ? "radial-gradient(circle at 35% 35%, #FFF59D, #FFB300 55%, #FF7043)"
            : "radial-gradient(circle at 35% 35%, #FFFDE7, #FFD54F 55%, #FFB300)",
          boxShadow: intense ? "0 0 60px 24px rgba(255,112,67,.55)" : "0 0 40px 14px rgba(255,213,79,.55)",
        }}
      />
    </div>
  );
}

function GardenBackdropBase({ background, climate, floorBottom }: Props) {
  const ground = GROUND_COLORS[background] ?? GROUND_COLORS["bg-patio"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* cielos superpuestos para transición suave */}
      {(Object.keys(SKIES) as Climate[]).map((c) => (
        <div key={c} className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out" style={{ background: SKIES[c], opacity: climate === c ? 1 : 0 }} />
      ))}

      <div className={cn("transition-opacity duration-[2000ms]", climate === "lluvia" ? "opacity-0" : climate === "nublado" ? "opacity-60" : "opacity-100")}>
        <SunShape intense={climate === "calor"} />
      </div>

      {/* nublado: nubes suaves que tapan el sol */}
      <div className="absolute right-[1%] top-[12%] transition-opacity duration-[2000ms]" style={{ opacity: climate === "nublado" ? 1 : 0 }}>
        <div className="cloud-bob relative">
          <div className="scale-[1.25]">
            <CloudShape dark={false} />
          </div>
          <div className="absolute -left-14 top-7 scale-90">
            <CloudShape dark={false} />
          </div>
        </div>
      </div>

      {/* nubes: siempre montadas, aparecen/oscurecen con transición suave */}
      {CLOUDS.map((c, i) => {
        const visible = climate === "lluvia" || climate === "nublado" ? true : climate === "calor" ? i < 2 : i < 4;
        return (
          <div key={i} className="cloud-drift absolute left-0" style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
            <div className="relative transition-opacity duration-[2000ms]" style={{ transform: `scale(${c.scale})`, opacity: visible ? 1 : 0 }}>
              <CloudShape dark={false} />
              <div className="absolute inset-0 transition-opacity duration-[2000ms]" style={{ opacity: climate === "lluvia" ? 1 : 0 }}>
                <CloudShape dark />
              </div>
            </div>
          </div>
        );
      })}

      {/* modo oscuro: el jardín se ve de noche con estrellitas */}
      <div className="night-overlay absolute inset-x-0 top-0 h-[45%]">
        {[[8, 6], [22, 14], [35, 4], [48, 11], [62, 7], [77, 15], [90, 5], [15, 24], [55, 22], [84, 27]].map(([x, y], i) => (
          <span key={i} className="absolute h-1 w-1 rounded-full bg-white anim-heat" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>

      {/* escenario comprado en la tienda (piso, barda, sierra, invernadero) */}
      <div className="absolute inset-x-0 aspect-[400/320]" style={{ bottom: floorBottom }}>
        <BackgroundScene id={background} skyless className="h-full w-full" />
      </div>
      <div className="absolute inset-x-0 bottom-0" style={{ height: `calc(${floorBottom} + 2px)`, background: ground }} />

      <div className="absolute inset-0 transition-opacity duration-[2000ms]" style={{ opacity: climate === "calor" ? 1 : 0 }}>
        <div className="heat-haze absolute inset-0" style={{ background: "radial-gradient(circle at 85% 12%, rgba(255,112,67,.55), transparent 60%)" }} />
      </div>
      <div className="absolute inset-0 transition-opacity duration-[2000ms]" style={{ opacity: climate === "lluvia" ? 1 : 0 }}>
        <div className="absolute inset-0 bg-slate-700/10" />
        {climate === "lluvia" &&
          RAIN.map((d, i) => (
            <span
              key={i}
              className="rain-drop absolute top-0 w-[2px] rounded-full bg-white/70"
              style={{ left: `${d.left}%`, height: d.len, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}
            />
          ))}
      </div>
      {/* tinte nocturno del modo oscuro */}
      <div className="night-overlay absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,16,48,.55), rgba(8,16,40,.3) 60%, rgba(0,0,0,.25))" }} />
    </div>
  );
}

export const GardenBackdrop = memo(GardenBackdropBase);
