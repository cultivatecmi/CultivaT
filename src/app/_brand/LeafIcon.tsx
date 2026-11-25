/**
 * Ícono de CultivaT ("hoja con la T") para generar PNG con next/og.
 * Es el mismo dibujo que src/app/icon.svg, sin texto (la T son dos barras).
 * `rounded`: esquinas redondeadas (iPhone las recorta solo, así que ahí va cuadrado).
 */
export function LeafIcon({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx={rounded ? 28 : 0} fill="#2E7D32" />
      <path d="M60 14 C 98 27 102 78 60 106 C 18 78 22 27 60 14 Z" fill="#8BC34A" />
      <path d="M60 22 C 62 50 62 76 60 100" stroke="#2E7D32" strokeWidth="3" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M64 24 C 77 31 83 43 84 57" stroke="#C5E1A5" strokeWidth="3" fill="none" opacity="0.7" strokeLinecap="round" />
      <rect x="36" y="44" width="48" height="12" rx="6" fill="#FFB300" />
      <rect x="54" y="44" width="12" height="46" rx="6" fill="#FFB300" />
    </svg>
  );
}
