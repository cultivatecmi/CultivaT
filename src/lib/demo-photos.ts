/**
 * Genera "fotos" ilustradas (SVG) del kit físico para el Modo Demo,
 * mostrando cómo crece la planta semana a semana.
 */
export function demoPhotoDataUrl(week: number): string {
  const h = [0, 8, 28, 52, 78, 96][Math.min(week, 5)];
  const leafPairs = Math.max(0, Math.min(4, week - 1));
  const leaves: string[] = [];
  for (let i = 0; i < leafPairs; i++) {
    const y = 196 - (h * (i + 1)) / (leafPairs + 0.6);
    const s = 14 + i * 2;
    leaves.push(
      `<path d="M200 ${y} q ${-s} ${-s * 0.9} ${-s * 2} ${-s * 0.2} q ${s} ${s * 0.6} ${s * 2} ${s * 0.2}z" fill="#4CAF50"/>`,
      `<path d="M200 ${y - 6} q ${s} ${-s * 0.9} ${s * 2} ${-s * 0.2} q ${-s} ${s * 0.6} ${-s * 2} ${s * 0.2}z" fill="#66BB6A"/>`
    );
  }
  const sprout =
    week <= 1
      ? `<ellipse cx="200" cy="194" rx="7" ry="4" fill="#A1887F"/><path d="M200 194 q 2 -8 6 -10" stroke="#7CB342" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : `<path d="M200 198 Q 203 ${198 - h / 2} 200 ${198 - h}" stroke="#558B2F" stroke-width="4" fill="none" stroke-linecap="round"/>${leaves.join("")}
         <path d="M200 ${198 - h} q -12 -12 -2 -22 q 10 10 2 22z" fill="#81C784"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3E0"/><stop offset="1" stop-color="#FFE0B2"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#w)"/>
  <rect x="300" y="20" width="70" height="90" rx="6" fill="#B3E5FC" stroke="#fff" stroke-width="6"/>
  <rect y="220" width="400" height="80" fill="#A1887F"/>
  <rect y="220" width="400" height="8" fill="#8D6E63"/>
  <path d="M0 250 H400 M0 278 H400" stroke="#8D6E63" stroke-width="2" opacity=".5"/>
  <ellipse cx="200" cy="262" rx="70" ry="8" fill="#000" opacity=".15"/>
  ${sprout}
  <path d="M140 200 H260 L248 258 H152 Z" fill="#8D6E63"/>
  <rect x="132" y="190" width="136" height="18" rx="5" fill="#A1887F"/>
  <ellipse cx="200" cy="192" rx="62" ry="5" fill="#4E342E"/>
  <text x="200" y="240" font-family="sans-serif" font-size="15" font-weight="bold" fill="#FFFDF7" text-anchor="middle">CultivaT</text>
  <rect x="14" y="14" width="96" height="30" rx="15" fill="#fff" opacity=".85"/>
  <text x="62" y="35" font-family="sans-serif" font-size="15" font-weight="bold" fill="#5D4037" text-anchor="middle">Semana ${week}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
