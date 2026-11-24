/** Macetas equipables (coordenadas del viewBox 240×262 de PlantCharacter) */

const BODY = "M 66 198 L 174 198 L 162 250 Q 161 255 156 255 L 84 255 Q 79 255 78 250 Z";

/** Sombreado lateral que da volumen (luz desde la izquierda) */
function Shade({ d, uid }: { d: string; uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`potshade-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#potshade-${uid})`} />
    </>
  );
}

function Rim({ fill, shine = 0.3 }: { fill: string; shine?: number }) {
  return (
    <>
      <rect x={58} y={182} width={124} height={20} rx={7} fill={fill} />
      <rect x={64} y={185} width={56} height={4} rx={2} fill="#FFFDF7" opacity={shine} />
      <rect x={58} y={197} width={124} height={5} rx={2.5} fill="#000" opacity={0.1} />
    </>
  );
}

export function Pot({ id, uid }: { id: string; uid: string }) {
  switch (id) {
    case "pot-talavera":
      return (
        <g>
          <path d={BODY} fill="#FAFAFA" stroke="#1565C0" strokeWidth={2.5} />
          <path d="M72 212 L 84 206 L 96 212 L 108 206 L 120 212 L 132 206 L 144 212 L 156 206 L 168 212" stroke="#1E88E5" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
          {[92, 120, 148].map((x) => (
            <g key={x}>
              <circle cx={x} cy={231} r={9} fill="#BBDEFB" stroke="#1565C0" strokeWidth={2} />
              <circle cx={x} cy={231} r={3.5} fill="#FFB300" />
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={x + 6 * Math.cos((a * Math.PI) / 180)} cy={231 + 6 * Math.sin((a * Math.PI) / 180)} r={1.6} fill="#1565C0" />
              ))}
            </g>
          ))}
          <Shade d={BODY} uid={uid} />
          <rect x={58} y={182} width={124} height={20} rx={7} fill="#1565C0" />
          <rect x={62} y={184} width={116} height={5} rx={2.5} fill="#fff" opacity={0.25} />
          {[68, 84, 100, 116, 132, 148, 164].map((x) => (
            <circle key={x} cx={x + 4} cy={193} r={2.4} fill="#FFFDF7" />
          ))}
        </g>
      );

    case "pot-madera":
      return (
        <g>
          <path d={BODY} fill="#C08A55" />
          {[84, 102, 120, 138, 156].map((x) => (
            <path key={x} d={`M ${x} 198 L ${120 + (x - 120) * 0.8} 255`} stroke="#8B5A2B" strokeWidth={2} opacity={0.7} />
          ))}
          {[[92, 212], [128, 238], [148, 216], [108, 244]].map(([x, y]) => (
            <path key={`${x}${y}`} d={`M ${x - 5} ${y} q 5 -4 10 0 q -5 4 -10 0`} stroke="#8B5A2B" strokeWidth={1.4} fill="none" opacity={0.6} />
          ))}
          <path d="M 71 224 L 169 224 L 167 232 L 73 232 Z" fill="#5D4037" />
          {[80, 120, 160].map((x) => (
            <circle key={x} cx={x} cy={228} r={1.8} fill="#BCAAA4" />
          ))}
          <Shade d={BODY} uid={uid} />
          <Rim fill="#9C6B3C" shine={0.25} />
          {[70, 100, 140, 170].map((x) => (
            <path key={x} d={`M ${x} 182 L ${x} 202`} stroke="#7A5230" strokeWidth={1.5} opacity={0.6} />
          ))}
        </g>
      );

    case "pot-arcoiris":
      return (
        <g>
          <defs>
            <clipPath id={`rainbow-${uid}`}>
              <path d={BODY} />
            </clipPath>
          </defs>
          <g clipPath={`url(#rainbow-${uid})`}>
            {["#EF5350", "#FFA726", "#FFEE58", "#66BB6A", "#42A5F5", "#AB47BC"].map((c, i) => (
              <rect key={c} x={60} y={198 + i * 10} width={120} height={i === 5 ? 20 : 10} fill={c} />
            ))}
          </g>
          <Shade d={BODY} uid={uid} />
          <Rim fill="#FFFDF7" shine={0.6} />
          {["#EF5350", "#FFA726", "#FFEE58", "#66BB6A", "#42A5F5", "#AB47BC"].map((c, i) => (
            <circle key={c} cx={72 + i * 19} cy={192} r={3.2} fill={c} />
          ))}
        </g>
      );

    case "pot-fresa": {
      const body = "M 66 196 L 174 196 Q 178 236 146 252 Q 120 262 94 252 Q 62 236 66 196 Z";
      return (
        <g>
          <defs>
            <radialGradient id={`berry-${uid}`} cx="0.35" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#FF8A80" />
              <stop offset="0.5" stopColor="#E53935" />
              <stop offset="1" stopColor="#B71C1C" />
            </radialGradient>
          </defs>
          <path d={body} fill={`url(#berry-${uid})`} />
          {[
            [86, 210], [104, 206], [122, 210], [140, 206], [158, 210],
            [94, 224], [112, 222], [130, 224], [148, 222],
            [102, 238], [120, 240], [138, 238], [112, 250], [128, 250],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M ${x} ${y - 2.5} q 2 2.5 0 5 q -2 -2.5 0 -5`} fill="#FFEB3B" />
          ))}
          <path d="M 56 194 L 66 182 L 76 192 L 88 180 L 98 192 L 110 180 L 120 191 L 130 180 L 142 192 L 152 180 L 164 192 L 174 182 L 184 194 Q 120 206 56 194 Z" fill="#43A047" stroke="#2E7D32" strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M 70 190 Q 120 198 170 190" stroke="#81C784" strokeWidth={2} fill="none" opacity={0.7} />
        </g>
      );
    }

    case "pot-robot": {
      const body = "M 70 196 H 170 V 248 Q 170 255 163 255 H 77 Q 70 255 70 248 Z";
      return (
        <g>
          <defs>
            <linearGradient id={`metal-${uid}`} x1="0" x2="1">
              <stop offset="0" stopColor="#90A4AE" />
              <stop offset="0.35" stopColor="#ECEFF1" />
              <stop offset="0.7" stopColor="#B0BEC5" />
              <stop offset="1" stopColor="#78909C" />
            </linearGradient>
          </defs>
          <rect x={62} y={212} width={10} height={20} rx={3} fill="#546E7A" />
          <rect x={168} y={212} width={10} height={20} rx={3} fill="#546E7A" />
          <path d={body} fill={`url(#metal-${uid})`} stroke="#546E7A" strokeWidth={2} />
          <rect x={88} y={207} width={64} height={32} rx={7} fill="#0D47A1" stroke="#263238" strokeWidth={2} />
          <rect x={101} y={215} width={7} height={7} rx={1.5} fill="#18FFFF">
            <animate attributeName="height" values="7;1;7;7" keyTimes="0;0.05;0.1;1" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x={132} y={215} width={7} height={7} rx={1.5} fill="#18FFFF">
            <animate attributeName="height" values="7;1;7;7" keyTimes="0;0.05;0.1;1" dur="3s" repeatCount="indefinite" />
          </rect>
          <path d="M 106 229 Q 120 236 134 229" stroke="#18FFFF" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {[[76, 202], [164, 202], [76, 248], [164, 248]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={2.2} fill="#546E7A" />
          ))}
          <rect x={58} y={182} width={124} height={18} rx={5} fill="#37474F" />
          <rect x={62} y={184} width={116} height={3} rx={1.5} fill="#78909C" />
          {[
            [78, "#FF1744"],
            [92, "#76FF03"],
            [148, "#FFEA00"],
            [162, "#00E5FF"],
          ].map(([x, c], i) => (
            <circle key={x as number} cx={x as number} cy={192} r={3} fill={c as string}>
              <animate attributeName="opacity" values="1;0.25;1" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      );
    }

    case "pot-volcan": {
      const body = "M 62 198 L 178 198 L 166 255 L 74 255 Z";
      return (
        <g>
          <defs>
            <linearGradient id={`rock-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6D4C41" />
              <stop offset="1" stopColor="#3E2723" />
            </linearGradient>
            <linearGradient id={`lava-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFEB3B" />
              <stop offset="0.5" stopColor="#FF9800" />
              <stop offset="1" stopColor="#E64A19" />
            </linearGradient>
          </defs>
          <path d={body} fill={`url(#rock-${uid})`} />
          {[[84, 240], [150, 236], [100, 250], [140, 252], [120, 246]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={3} fill="#3E2723" opacity={0.6} />
          ))}
          <path
            d="M 64 198 L 176 198 L 172 210 Q 168 222 163 210 L 158 204 Q 152 230 146 206 L 136 204 Q 130 218 124 205 L 112 204 Q 106 236 99 206 L 90 205 Q 84 220 78 206 L 68 204 Z"
            fill={`url(#lava-${uid})`}
          >
            <animate attributeName="opacity" values="1;0.8;1" dur="1.6s" repeatCount="indefinite" />
          </path>
          <Shade d={body} uid={uid} />
          <rect x={58} y={182} width={124} height={20} rx={7} fill="#4E342E" />
          <rect x={60} y={186} width={120} height={6} rx={3} fill="#FF7043">
            <animate attributeName="fill" values="#FF7043;#FFB300;#FF7043" dur="1.2s" repeatCount="indefinite" />
          </rect>
        </g>
      );
    }

    case "pot-dorada":
      return (
        <g>
          <defs>
            <linearGradient id={`gold-${uid}`} x1="0" x2="1">
              <stop offset="0" stopColor="#FFF59D" />
              <stop offset="0.35" stopColor="#FFCA28" />
              <stop offset="0.75" stopColor="#FFA000" />
              <stop offset="1" stopColor="#E65100" />
            </linearGradient>
          </defs>
          <path d={BODY} fill={`url(#gold-${uid})`} stroke="#E65100" strokeWidth={1.5} />
          <path d="M 120 214 L 125 225 L 137 226 L 128 234 L 131 246 L 120 239 L 109 246 L 112 234 L 103 226 L 115 225 Z" fill="#FFF8E1" stroke="#E65100" strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M 84 206 L 90 250" stroke="#fff" strokeWidth={4} opacity={0.45} strokeLinecap="round" />
          {[[150, 212], [92, 236], [158, 242]].map(([x, y], i) => (
            <path key={`${x}${y}`} d={`M ${x} ${y - 5} L ${x + 1.5} ${y - 1.5} L ${x + 5} ${y} L ${x + 1.5} ${y + 1.5} L ${x} ${y + 5} L ${x - 1.5} ${y + 1.5} L ${x - 5} ${y} L ${x - 1.5} ${y - 1.5} Z`} fill="#fff">
              <animate attributeName="opacity" values="0;1;0" dur="1.8s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
            </path>
          ))}
          <Rim fill="#FFB300" shine={0.55} />
        </g>
      );

    default:
      return (
        <g>
          <path d={BODY} fill="#8D6E63" />
          <path d="M 70 204 L 170 204 L 168 212 L 72 212 Z" fill="#6D4C41" opacity={0.45} />
          <Shade d={BODY} uid={uid} />
          <Rim fill="#A1887F" />
        </g>
      );
  }
}
