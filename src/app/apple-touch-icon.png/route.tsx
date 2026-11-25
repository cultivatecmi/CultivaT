import { ImageResponse } from "next/og";
import { LeafIcon } from "../_brand/LeafIcon";

// Ícono para "Agregar a pantalla de inicio" en iPhone/iPad (PNG 180×180, iOS redondea las esquinas)
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<LeafIcon size={180} rounded={false} />, { width: 180, height: 180 });
}
