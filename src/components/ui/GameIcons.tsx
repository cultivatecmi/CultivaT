/** Íconos dibujados del juego (se ven igual en cualquier celular, sin depender de emojis) */

interface IconProps {
  size?: number;
  className?: string;
}

/** Regadera */
export function WateringCanIcon({ size = 32, className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="wc-body" x1="0" x2="1">
          <stop offset="0" stopColor="#81D4FA" />
          <stop offset="0.5" stopColor="#29B6F6" />
          <stop offset="1" stopColor="#0277BD" />
        </linearGradient>
      </defs>
      {/* asa */}
      <path d="M30 24 C 30 10, 52 10, 52 26" stroke="#0277BD" strokeWidth={5} fill="none" strokeLinecap="round" />
      {/* pico */}
      <path d="M24 36 L 8 20 L 12 16 L 27 31 Z" fill="#0288D1" />
      <ellipse cx="9" cy="17" rx="7" ry="3.6" transform="rotate(-45 9 17)" fill="#01579B" />
      <circle cx="7.5" cy="16" r="0.9" fill="#B3E5FC" />
      <circle cx="10" cy="18.5" r="0.9" fill="#B3E5FC" />
      <circle cx="8" cy="19" r="0.9" fill="#B3E5FC" />
      {/* cuerpo */}
      <path d="M22 26 H 54 L 51 54 Q 50.5 57 47.5 57 H 28.5 Q 25.5 57 25 54 Z" fill="url(#wc-body)" stroke="#01579B" strokeWidth={1.5} />
      <rect x="20" y="23" width="36" height="6" rx="3" fill="#0288D1" />
      <path d="M29 33 L 30 51" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.45} />
      <path d="M36 40 q 4 -5 8 0 q -4 4 -8 0" fill="#C8E6C9" opacity={0.9} />
    </svg>
  );
}

/** Moneda dorada */
export function CoinIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id="coin-g" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#FFF59D" />
          <stop offset="0.5" stopColor="#FFC107" />
          <stop offset="1" stopColor="#E65100" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="21.5" r="17" fill="#BF6A00" />
      <circle cx="20" cy="19.5" r="17" fill="url(#coin-g)" stroke="#E65100" strokeWidth={1.5} />
      <circle cx="20" cy="19.5" r="12.5" fill="none" stroke="#FFE082" strokeWidth={1.6} opacity={0.9} />
      <text x="20" y="26" textAnchor="middle" fontSize="18" fontWeight={900} fontFamily="sans-serif" fill="#B26A00">
        $
      </text>
      <path d="M9 13 Q 13 7 20 6" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.75} />
    </svg>
  );
}

/** Saco de abono */
export function FertilizerIcon({ size = 32, className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="sack-g" x1="0" x2="1">
          <stop offset="0" stopColor="#E6C48F" />
          <stop offset="0.55" stopColor="#C9A06A" />
          <stop offset="1" stopColor="#8D6E4A" />
        </linearGradient>
      </defs>
      {/* tierrita que se asoma */}
      <ellipse cx="32" cy="14" rx="10" ry="4" fill="#5D4037" />
      {/* saco */}
      <path d="M18 16 Q 32 20 46 16 Q 54 38 50 54 Q 49 59 44 59 H 20 Q 15 59 14 54 Q 10 38 18 16 Z" fill="url(#sack-g)" stroke="#6D4C41" strokeWidth={1.6} />
      {/* amarre */}
      <path d="M17 18 Q 32 23 47 18" stroke="#6D4C41" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M30 20 l -5 -8 M34 20 l 5 -8" stroke="#8D6E63" strokeWidth={2.2} strokeLinecap="round" />
      {/* etiqueta */}
      <rect x="19" y="30" width="26" height="20" rx="4" fill="#FFFDF7" stroke="#6D4C41" strokeWidth={1} />
      <path d="M32 46 C 32 40 32 38 32 36" stroke="#2E7D32" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M32 38 C 26 36 25 32 26 31 C 30 31 32 34 32 38 Z" fill="#43A047" />
      <path d="M32 39 C 38 37 39 33 38 32 C 34 32 32 35 32 39 Z" fill="#66BB6A" />
      <text x="32" y="49.5" textAnchor="middle" fontSize="5.2" fontWeight={800} fontFamily="sans-serif" fill="#5D4037">
        ABONO
      </text>
      <path d="M21 24 L 21 50" stroke="#fff" strokeWidth={2} opacity={0.35} strokeLinecap="round" />
    </svg>
  );
}
