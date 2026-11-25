import type { Mood } from "@/lib/types";
import { CX, Drop, INK } from "./parts";

export type FaceKind = Mood | "risa" | "comiendo" | "incomoda";

interface Props {
  face: FaceKind;
  r: number;
  rx: number;
  cy: number;
  eyeDX: number;
  eyeY: number;
  eyeRx: number;
  eyeRy: number;
  mouthY: number;
  /** los lentes de sol tapan los ojos */
  hideEyes: boolean;
  /** color del cuerpo (para los párpados) */
  lid: string;
  /** posición de las mejillas (por defecto junto a los ojos) */
  cheek?: { dx: number; y: number };
}

/**
 * Ojos "vivos": cada ojo es un <g class="plant-eye"> (se aplasta al parpadear)
 * y la pupila es un <g data-pupil data-m="..."> que HomeScreen mueve para seguir el dedo.
 */
function OpenEye({ x, y, rx, ry, lookUp = 0 }: { x: number; y: number; rx: number; ry: number; lookUp?: number }) {
  return (
    <g className="plant-eye">
      <ellipse cx={x} cy={y} rx={rx * 1.42} ry={ry * 1.3} fill="#fff" stroke={INK} strokeOpacity={0.3} strokeWidth={1.3} />
      <g data-pupil="" data-m={(rx * 0.5).toFixed(2)}>
        <ellipse cx={x} cy={y + ry * 0.08 - lookUp * ry * 0.45} rx={rx * 0.86} ry={ry * 0.9} fill={INK} />
        <circle cx={x + rx * 0.3} cy={y - ry * 0.3 - lookUp * ry * 0.45} r={rx * 0.32} fill="#fff" />
        <circle cx={x - rx * 0.28} cy={y + ry * 0.38 - lookUp * ry * 0.45} r={rx * 0.14} fill="#fff" opacity={0.85} />
      </g>
    </g>
  );
}

function HappyArcs({ eyes, eyeY, eyeRx, eyeRy, sw }: { eyes: number[]; eyeY: number; eyeRx: number; eyeRy: number; sw: number }) {
  return (
    <>
      {eyes.map((x) => (
        <path key={x} d={`M ${x - eyeRx * 1.25} ${eyeY + eyeRy * 0.3} Q ${x} ${eyeY - eyeRy * 1.2} ${x + eyeRx * 1.25} ${eyeY + eyeRy * 0.3}`} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" />
      ))}
    </>
  );
}

export function PlantFace({ face, r, rx, cy, eyeDX, eyeY, eyeRx, eyeRy, mouthY, hideEyes, lid, cheek }: Props) {
  const cheekDX = cheek?.dx ?? r * 0.62;
  const cheekY = cheek?.y ?? cy + r * 0.17;
  const eyes = [-1, 1].map((s) => CX + s * eyeDX);
  const sw = Math.max(2.6, r * 0.065);
  let eyeEls: React.ReactNode = null;
  let mouth: React.ReactNode = null;
  let extra: React.ReactNode = null;

  switch (face) {
    case "risa":
      eyeEls = <HappyArcs eyes={eyes} eyeY={eyeY} eyeRx={eyeRx} eyeRy={eyeRy} sw={sw} />;
      mouth = (
        <g>
          <path d={`M ${CX - r * 0.32} ${mouthY - r * 0.08} Q ${CX} ${mouthY + r * 0.45} ${CX + r * 0.32} ${mouthY - r * 0.08} Z`} fill="#6D2E1F" />
          <ellipse cx={CX} cy={mouthY + r * 0.15} rx={r * 0.13} ry={r * 0.07} fill="#FF8A80" />
        </g>
      );
      break;

    case "comiendo":
      eyeEls = <HappyArcs eyes={eyes} eyeY={eyeY} eyeRx={eyeRx} eyeRy={eyeRy} sw={sw} />;
      mouth = (
        <g>
          <ellipse cx={CX} cy={mouthY + r * 0.04} rx={r * 0.16} ry={r * 0.12} fill="#6D2E1F">
            <animate attributeName="ry" values={`${r * 0.13};${r * 0.03};${r * 0.13}`} dur="0.28s" repeatCount="indefinite" />
          </ellipse>
          {/* cachetes inflados mientras mastica */}
          {[-1, 1].map((s) => (
            <ellipse key={s} cx={CX + s * cheekDX * 0.9} cy={mouthY - r * 0.02} rx={r * 0.17} ry={r * 0.12} fill="#FF8A80" opacity={0.55}>
              <animate attributeName="rx" values={`${r * 0.15};${r * 0.2};${r * 0.15}`} dur="0.28s" repeatCount="indefinite" />
            </ellipse>
          ))}
        </g>
      );
      extra = (
        <text x={CX + rx + 4} y={cy - r * 0.55} fontSize={13} fontWeight={700} fill="#6D4C41" fontFamily="sans-serif">
          ñam
          <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />
        </text>
      );
      break;

    case "sedienta":
      eyeEls = eyes.map((x) => (
        <g key={x}>
          <OpenEye x={x} y={eyeY} rx={eyeRx} ry={eyeRy} />
          {/* párpados caídos */}
          <path d={`M ${x - eyeRx * 1.6} ${eyeY - eyeRy * 1.45} H ${x + eyeRx * 1.6} V ${eyeY - eyeRy * 0.05} Q ${x} ${eyeY + eyeRy * 0.25} ${x - eyeRx * 1.6} ${eyeY - eyeRy * 0.05} Z`} fill={lid} />
          <path d={`M ${x - eyeRx * 1.45} ${eyeY - eyeRy * 0.05} Q ${x} ${eyeY + eyeRy * 0.25} ${x + eyeRx * 1.45} ${eyeY - eyeRy * 0.05}`} stroke={INK} strokeWidth={sw * 0.75} fill="none" strokeLinecap="round" />
        </g>
      ));
      mouth = (
        <g>
          <ellipse cx={CX} cy={mouthY} rx={r * 0.12} ry={r * 0.08} fill="#6D2E1F" />
          <path d={`M ${CX - r * 0.07} ${mouthY + r * 0.03} L ${CX - r * 0.07} ${mouthY + r * 0.16} Q ${CX} ${mouthY + r * 0.26} ${CX + r * 0.07} ${mouthY + r * 0.16} L ${CX + r * 0.07} ${mouthY + r * 0.03} Z`} fill="#FF8A80" />
        </g>
      );
      extra = (
        <g>
          <circle cx={CX + rx + 14} cy={cy - r * 0.85} r={13} fill="#fff" stroke="#B3E5FC" strokeWidth={2} />
          <circle cx={CX + rx + 2} cy={cy - r * 0.55} r={3} fill="#fff" stroke="#B3E5FC" strokeWidth={1.5} />
          <Drop x={CX + rx + 14} y={cy - r * 0.85} size={1.2} />
        </g>
      );
      break;

    case "acalorada":
      eyeEls = eyes.map((x, i) => {
        const d = i === 0 ? 1 : -1;
        return (
          <path key={x} d={`M ${x - d * eyeRx} ${eyeY - eyeRy * 0.7} L ${x + d * eyeRx * 0.8} ${eyeY} L ${x - d * eyeRx} ${eyeY + eyeRy * 0.7}`} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      });
      mouth = (
        <g>
          <ellipse cx={CX} cy={mouthY} rx={r * 0.15} ry={r * 0.11} fill="#6D2E1F">
            <animate attributeName="ry" values={`${r * 0.11};${r * 0.07};${r * 0.11}`} dur="0.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx={CX} cy={mouthY + r * 0.06} rx={r * 0.08} ry={r * 0.04} fill="#FF8A80" />
        </g>
      );
      extra = (
        <g>
          <Drop x={CX + rx * 0.72} y={cy - r * 0.5} size={1} color="#81D4FA" fallDur="1.1s" />
          <Drop x={CX - rx * 0.78} y={cy - r * 0.35} size={0.85} color="#81D4FA" fallDur="1.4s" />
          <Drop x={CX + rx * 0.35} y={cy - r * 0.8} size={0.75} color="#81D4FA" fallDur="0.9s" />
        </g>
      );
      break;

    case "hambrienta":
      eyeEls = eyes.map((x) => <OpenEye key={x} x={x} y={eyeY} rx={eyeRx} ry={eyeRy} lookUp={1} />);
      mouth = (
        <g>
          <ellipse cx={CX} cy={mouthY + r * 0.02} rx={r * 0.13} ry={r * 0.15} fill="#6D2E1F" />
          <Drop x={CX + r * 0.15} y={mouthY + r * 0.2} size={0.6} color="#E1F5FE" fallDur="1.6s" />
        </g>
      );
      extra = (
        <text x={CX + rx + 6} y={cy + r * 0.2} fontSize={11} fontWeight={700} fill="#6D4C41" opacity={0.75} fontFamily="sans-serif">
          grrr
          <animate attributeName="opacity" values="0.2;0.85;0.2" dur="1.2s" repeatCount="indefinite" />
        </text>
      );
      break;

    // un pulgón le chupa la savia: cejas preocupadas, boca ondulada y gotita de sudor
    case "incomoda":
      eyeEls = eyes.map((x, i) => {
        const d = i === 0 ? 1 : -1;
        return (
          <g key={x}>
            <OpenEye x={x} y={eyeY} rx={eyeRx} ry={eyeRy} />
            <path
              d={`M ${x - d * eyeRx * 1.4} ${eyeY - eyeRy * 1.55} L ${x + d * eyeRx * 0.9} ${eyeY - eyeRy * 2.05}`}
              stroke={INK}
              strokeWidth={sw * 0.85}
              strokeLinecap="round"
            />
          </g>
        );
      });
      mouth = (
        <path
          d={`M ${CX - r * 0.24} ${mouthY + r * 0.06} q ${r * 0.06} ${-r * 0.1} ${r * 0.12} 0 t ${r * 0.12} 0 t ${r * 0.12} 0 t ${r * 0.12} 0`}
          stroke={INK}
          strokeWidth={sw * 0.85}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
      extra = <Drop x={CX + rx * 0.7} y={cy - r * 0.55} size={0.8} color="#81D4FA" fallDur="1.3s" />;
      break;

    case "marchita":
      eyeEls = eyes.map((x, i) => (
        <path key={x} d={`M ${x - eyeRx * 1.2} ${eyeY + (i === 0 ? -2 : 2)} Q ${x} ${eyeY + eyeRy} ${x + eyeRx * 1.2} ${eyeY + (i === 0 ? 2 : -2)}`} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" />
      ));
      mouth = (
        <path d={`M ${CX - r * 0.2} ${mouthY + r * 0.1} Q ${CX} ${mouthY - r * 0.12} ${CX + r * 0.2} ${mouthY + r * 0.1}`} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" />
      );
      extra = <Drop x={eyes[0] - eyeRx * 0.6} y={eyeY + eyeRy * 1.4} size={0.7} color="#81D4FA" fallDur="2s" />;
      break;

    default: // feliz
      eyeEls = eyes.map((x) => <OpenEye key={x} x={x} y={eyeY} rx={eyeRx} ry={eyeRy} />);
      mouth = (
        <g>
          <path d={`M ${CX - r * 0.25} ${mouthY - r * 0.05} Q ${CX} ${mouthY + r * 0.3} ${CX + r * 0.25} ${mouthY - r * 0.05} Z`} fill="#6D2E1F" />
          <ellipse cx={CX} cy={mouthY + r * 0.09} rx={r * 0.09} ry={r * 0.045} fill="#FF8A80" />
        </g>
      );
  }

  const blush =
    face === "acalorada" ? { fill: "#FF7043", op: 0.7, k: 1.4 } : face === "marchita" || face === "sedienta" || face === "incomoda" ? null : { fill: "#FF8A80", op: 0.55, k: 1 };

  return (
    <g>
      {blush &&
        face !== "comiendo" &&
        [-1, 1].map((s) => (
          <ellipse key={s} cx={CX + s * cheekDX} cy={cheekY} rx={r * 0.14 * blush.k} ry={r * 0.09 * blush.k} fill={blush.fill} opacity={blush.op} />
        ))}
      {!hideEyes && eyeEls}
      {mouth}
      {extra}
    </g>
  );
}
