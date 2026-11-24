import { CX, type PlantGeo } from "./geometry";

/**
 * Accesorios de la tienda. Todo se posiciona con la geometría de la cabeza (g.R, g.hy)
 * para que quede igual en las 4 etapas. Regla: nada tapa los ojos
 * (los lentes tienen cristal translúcido y los sombreros quedan sobre la frente).
 */
export function PlantAccessory({ id, g }: { id: string | null; g: PlantGeo }) {
  const { R, hy, eyeDX, eyeY } = g;
  const T = g.top; // coronilla de la cabecita

  switch (id) {
    case "acc-lentes": {
      const w = R * 0.76;
      const h = R * 0.66;
      return (
        <g>
          <path d={`M ${CX - eyeDX + w / 2} ${eyeY - h * 0.12} Q ${CX} ${eyeY - h * 0.45} ${CX + eyeDX - w / 2} ${eyeY - h * 0.12}`} stroke="#1B1B1B" strokeWidth={3} fill="none" />
          <path d={`M ${CX - eyeDX - w / 2} ${eyeY - h * 0.2} L ${CX - R * 0.98} ${eyeY - h * 0.38}`} stroke="#1B1B1B" strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${CX + eyeDX + w / 2} ${eyeY - h * 0.2} L ${CX + R * 0.98} ${eyeY - h * 0.38}`} stroke="#1B1B1B" strokeWidth={3} strokeLinecap="round" />
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect x={CX + s * eyeDX - w / 2} y={eyeY - h / 2} width={w} height={h} rx={h * 0.42} fill="#263238" fillOpacity={0.45} stroke="#111" strokeWidth={2.6} />
              <path d={`M ${CX + s * eyeDX - w * 0.3} ${eyeY - h * 0.1} L ${CX + s * eyeDX - w * 0.08} ${eyeY - h * 0.3}`} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.75} />
            </g>
          ))}
        </g>
      );
    }

    case "acc-estrella": {
      const star = (x: number, y: number, ro: number, ri: number) =>
        Array.from({ length: 10 }, (_, i) => {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = i % 2 ? ri : ro;
          return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
        }).join(" ");
      return (
        <g>
          <path d={`M ${CX - eyeDX * 0.45} ${eyeY - R * 0.05} Q ${CX} ${eyeY - R * 0.2} ${CX + eyeDX * 0.45} ${eyeY - R * 0.05}`} stroke="#EC407A" strokeWidth={2.6} fill="none" />
          {[-1, 1].map((s) => (
            <polygon key={s} points={star(CX + s * eyeDX, eyeY, R * 0.5, R * 0.26)} fill="#F48FB1" fillOpacity={0.35} stroke="#EC407A" strokeWidth={2.6} strokeLinejoin="round" />
          ))}
          <path d={`M ${CX - eyeDX - R * 0.4} ${eyeY - R * 0.05} L ${CX - R * 0.98} ${eyeY - R * 0.18} M ${CX + eyeDX + R * 0.4} ${eyeY - R * 0.05} L ${CX + R * 0.98} ${eyeY - R * 0.18}`} stroke="#EC407A" strokeWidth={2.4} strokeLinecap="round" />
          <text x={CX + R * 0.95} y={eyeY - R * 0.45} fontSize={R * 0.28} textAnchor="middle">
            ✨
          </text>
        </g>
      );
    }

    case "acc-sombrero": {
      const by = hy - R * 0.7;
      return (
        <g>
          <ellipse cx={CX} cy={by + 3} rx={R * 1.42} ry={R * 0.22} fill="#000" opacity={0.12} />
          <ellipse cx={CX} cy={by} rx={R * 1.46} ry={R * 0.25} fill="#F4D58D" stroke="#B8893A" strokeWidth={2} />
          {[-1.05, -0.6, 0.6, 1.05].map((k) => (
            <path key={k} d={`M ${CX + k * R} ${by - R * 0.12} L ${CX + k * R * 1.18} ${by + R * 0.12}`} stroke="#C9A25E" strokeWidth={1.5} />
          ))}
          <path d={`M ${CX - R * 0.62} ${by} Q ${CX - R * 0.66} ${by - R * 0.66} ${CX} ${by - R * 0.7} Q ${CX + R * 0.66} ${by - R * 0.66} ${CX + R * 0.62} ${by} Z`} fill="#E9C46A" stroke="#B8893A" strokeWidth={2} />
          <path d={`M ${CX - R * 0.44} ${by - R * 0.34} Q ${CX} ${by - R * 0.44} ${CX + R * 0.44} ${by - R * 0.34}`} stroke="#C9A25E" strokeWidth={1.5} fill="none" />
          <path d={`M ${CX - R * 0.63} ${by - R * 0.09} Q ${CX} ${by - R * 0.18} ${CX + R * 0.63} ${by - R * 0.09}`} stroke="#8D6E63" strokeWidth={R * 0.11} fill="none" />
          <ellipse cx={CX - R * 0.28} cy={by - R * 0.48} rx={R * 0.13} ry={R * 0.06} fill="#fff" opacity={0.45} />
        </g>
      );
    }

    case "acc-gorra": {
      const edge = hy - R * 0.52;
      return (
        <g>
          <path d={`M ${CX + R * 0.25} ${edge} Q ${CX + R * 1.35} ${edge - R * 0.06} ${CX + R * 1.5} ${edge + R * 0.14} Q ${CX + R * 0.9} ${edge + R * 0.17} ${CX + R * 0.25} ${edge + R * 0.07} Z`} fill="#0288D1" />
          <path d={`M ${CX - R * 1.02} ${edge} Q ${CX - R * 1.06} ${T - R * 0.2} ${CX} ${T - R * 0.16} Q ${CX + R * 1.06} ${T - R * 0.2} ${CX + R * 1.02} ${edge} Q ${CX} ${edge - R * 0.16} ${CX - R * 1.02} ${edge} Z`} fill="#29B6F6" stroke="#0288D1" strokeWidth={2} />
          <path d={`M ${CX} ${T - R * 0.16} L ${CX} ${edge - R * 0.1}`} stroke="#0288D1" strokeWidth={1.6} opacity={0.6} />
          <ellipse cx={CX - R * 0.45} cy={T + R * 0.12} rx={R * 0.22} ry={R * 0.1} fill="#fff" opacity={0.35} transform={`rotate(-18 ${CX - R * 0.45} ${T + R * 0.12})`} />
          <circle cx={CX} cy={T - R * 0.14} r={3.2} fill="#0288D1" />
          <text x={CX - R * 0.42} y={edge - R * 0.12} fontSize={R * 0.3} fontWeight={800} fill="#fff" fontFamily="sans-serif" textAnchor="middle">
            7
          </text>
        </g>
      );
    }

    case "acc-audifonos": {
      return (
        <g>
          <path d={`M ${CX - R * 1.0} ${hy - R * 0.12} Q ${CX - R * 1.02} ${T - R * 0.42} ${CX} ${T - R * 0.4} Q ${CX + R * 1.02} ${T - R * 0.42} ${CX + R * 1.0} ${hy - R * 0.12}`} stroke="#7E57C2" strokeWidth={R * 0.16} fill="none" strokeLinecap="round" />
          <path d={`M ${CX - R * 0.6} ${T - R * 0.3} Q ${CX} ${T - R * 0.5} ${CX + R * 0.6} ${T - R * 0.3}`} stroke="#B39DDB" strokeWidth={R * 0.05} fill="none" strokeLinecap="round" />
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect x={CX + s * R * 1.02 - R * 0.17} y={hy - R * 0.32} width={R * 0.34} height={R * 0.56} rx={R * 0.14} fill="#212121" />
              <rect x={CX + s * R * 1.02 - R * 0.12} y={hy - R * 0.25} width={R * 0.24} height={R * 0.42} rx={R * 0.1} fill="none" stroke="#00E5FF" strokeWidth={2}>
                <animate attributeName="stroke" values="#00E5FF;#FF4081;#76FF03;#00E5FF" dur="2s" repeatCount="indefinite" />
              </rect>
            </g>
          ))}
          <path d={`M ${CX + R * 0.95} ${hy + R * 0.2} Q ${CX + R * 0.85} ${g.mouthY + R * 0.05} ${CX + R * 0.42} ${g.mouthY}`} stroke="#212121" strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <circle cx={CX + R * 0.4} cy={g.mouthY} r={R * 0.07} fill="#424242" />
        </g>
      );
    }

    case "acc-corona": {
      const by = T + R * 0.3;
      const w = R * 0.62;
      const h = R * 0.62;
      const pts = [
        [CX - w, by],
        [CX - w, by - h * 0.55],
        [CX - w * 0.55, by - h * 0.2],
        [CX - w * 0.3, by - h * 0.85],
        [CX, by - h * 0.35],
        [CX + w * 0.3, by - h * 0.85],
        [CX + w * 0.55, by - h * 0.2],
        [CX + w, by - h * 0.55],
        [CX + w, by],
      ]
        .map((p) => p.join(","))
        .join(" ");
      return (
        <g>
          <polygon points={pts} fill="#FFC107" stroke="#E65100" strokeWidth={2} strokeLinejoin="round" />
          <rect x={CX - w} y={by - R * 0.18} width={w * 2} height={R * 0.2} rx={3} fill="#FFB300" stroke="#E65100" strokeWidth={1.6} />
          {[CX - w * 0.55, CX, CX + w * 0.55].map((x, i) => (
            <circle key={x} cx={x} cy={by - R * 0.08} r={R * 0.07} fill={["#E53935", "#1E88E5", "#43A047"][i]} />
          ))}
          {[CX - w * 0.3, CX + w * 0.3].map((x) => (
            <circle key={x} cx={x} cy={by - h * 0.85} r={R * 0.06} fill="#fff" stroke="#E65100" strokeWidth={1} />
          ))}
          <path d={`M ${CX - w * 0.8} ${by - h * 0.45} L ${CX - w * 0.65} ${by - h * 0.25}`} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        </g>
      );
    }

    case "acc-mono": {
      const bx = CX + R * 0.62;
      const by = T + R * 0.2;
      const s = R * 0.36;
      return (
        <g transform={`rotate(18 ${bx} ${by})`}>
          <path d={`M ${bx} ${by} L ${bx - s} ${by - s * 0.65} L ${bx - s} ${by + s * 0.65} Z`} fill="#EC407A" stroke="#EC407A" strokeWidth={4} strokeLinejoin="round" />
          <path d={`M ${bx} ${by} L ${bx + s} ${by - s * 0.65} L ${bx + s} ${by + s * 0.65} Z`} fill="#EC407A" stroke="#EC407A" strokeWidth={4} strokeLinejoin="round" />
          <path d={`M ${bx - s * 0.8} ${by - s * 0.3} L ${bx - s * 0.35} ${by - s * 0.15}`} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
          <circle cx={bx} cy={by} r={s * 0.3} fill="#AD1457" />
        </g>
      );
    }

    case "acc-bandana": {
      const y = hy - R * 0.6;
      const kx = CX + R * 0.9;
      return (
        <g>
          <path d={`M ${CX - R * 0.92} ${y + R * 0.05} Q ${CX} ${y - R * 0.12} ${CX + R * 0.92} ${y + R * 0.05}`} stroke="#E53935" strokeWidth={R * 0.22} fill="none" strokeLinecap="round" />
          {[-0.7, -0.35, 0, 0.35, 0.7].map((k) => (
            <circle key={k} cx={CX + k * R} cy={y - R * 0.04 + Math.abs(k) * R * 0.08} r={R * 0.035} fill="#fff" />
          ))}
          <path d={`M ${kx} ${y} q ${R * 0.35} ${R * 0.05} ${R * 0.45} ${R * 0.4} q ${-R * 0.25} ${-R * 0.05} ${-R * 0.42} ${-R * 0.25} Z`} fill="#C62828" />
          <path d={`M ${kx} ${y} q ${R * 0.42} ${-R * 0.12} ${R * 0.58} ${R * 0.12} q ${-R * 0.3} ${R * 0.02} ${-R * 0.55} ${-R * 0.02} Z`} fill="#E53935" />
          <circle cx={kx} cy={y + R * 0.02} r={R * 0.1} fill="#B71C1C" />
        </g>
      );
    }

    case "acc-flor": {
      const fx = CX - R * 0.55;
      const fy = T + R * 0.18;
      const pr = R * 0.2;
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={fx} cy={fy - pr * 0.95} rx={pr * 0.62} ry={pr} transform={`rotate(${a} ${fx} ${fy})`} fill="#F06292" stroke="#D81B60" strokeWidth={1.2} />
          ))}
          <circle cx={fx} cy={fy} r={pr * 0.55} fill="#FFD54F" stroke="#F9A825" strokeWidth={1.2} />
          <circle cx={fx - pr * 0.15} cy={fy - pr * 0.15} r={pr * 0.18} fill="#fff" opacity={0.7} />
          <path d={`M ${fx + pr * 0.9} ${fy + pr * 0.3} q ${pr * 0.7} ${-pr * 0.1} ${pr * 0.9} ${pr * 0.6}`} stroke="#43A047" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    }

    case "acc-bigote": {
      const y = g.mouthY - R * 0.16;
      const w = R * 0.42;
      return (
        <g>
          <path
            d={`M ${CX} ${y - R * 0.02} C ${CX - w * 0.35} ${y - R * 0.16} ${CX - w * 0.9} ${y - R * 0.1} ${CX - w} ${y + R * 0.04} C ${CX - w * 1.15} ${y + R * 0.14} ${CX - w * 1.4} ${y + R * 0.02} ${CX - w * 1.35} ${y - R * 0.1} C ${CX - w * 1.3} ${y + R * 0.18} ${CX - w * 0.5} ${y + R * 0.16} ${CX} ${y + R * 0.07} C ${CX + w * 0.5} ${y + R * 0.16} ${CX + w * 1.3} ${y + R * 0.18} ${CX + w * 1.35} ${y - R * 0.1} C ${CX + w * 1.4} ${y + R * 0.02} ${CX + w * 1.15} ${y + R * 0.14} ${CX + w} ${y + R * 0.04} C ${CX + w * 0.9} ${y - R * 0.1} ${CX + w * 0.35} ${y - R * 0.16} ${CX} ${y - R * 0.02} Z`}
            fill="#4E342E"
          />
          <path d={`M ${CX - w * 0.7} ${y - R * 0.04} Q ${CX - w * 0.4} ${y - R * 0.09} ${CX - w * 0.15} ${y - R * 0.03}`} stroke="#8D6E63" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </g>
      );
    }

    default:
      return null;
  }
}
