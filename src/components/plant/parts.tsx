/** Piezas SVG compartidas por el personaje */

export const CX = 120;
export const INK = "#2D2A26";

export function Leaf({
  x, y, len, angle, fill, vein, wave,
}: { x: number; y: number; len: number; angle: number; fill: string; vein: string; wave?: boolean }) {
  const w = len * 0.42;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      {wave && (
        <animateTransform attributeName="transform" type="rotate" values="0;-16;0;10;0" dur="1.6s" repeatCount="indefinite" additive="sum" />
      )}
      <path d={`M0 0 Q ${len * 0.45} ${-w} ${len} 0 Q ${len * 0.45} ${w} 0 0 Z`} fill={fill} />
      <path d={`M3 0 L ${len * 0.82} 0`} stroke={vein} strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />
      <path d={`M${len * 0.2} ${-w * 0.35} Q ${len * 0.45} ${-w * 0.7} ${len * 0.75} ${-w * 0.3}`} stroke="#fff" strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.35} />
    </g>
  );
}

export function Drop({
  x, y, size = 1, color = "#29B6F6", fallDur,
}: { x: number; y: number; size?: number; color?: string; fallDur?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {fallDur && (
        <>
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 14" dur={fallDur} repeatCount="indefinite" additive="sum" />
          <animate attributeName="opacity" values="1;1;0" dur={fallDur} repeatCount="indefinite" />
        </>
      )}
      <path d="M0 -7 C 3 -2 5 1 5 3.5 A 5 5 0 0 1 -5 3.5 C -5 1 -3 -2 0 -7 Z" fill={color} />
      <circle cx={-1.6} cy={2.6} r={1.3} fill="#fff" opacity={0.8} />
    </g>
  );
}
