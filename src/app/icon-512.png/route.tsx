import { ImageResponse } from "next/og";
import { LeafIcon } from "../_brand/LeafIcon";

// Ícono PNG 512×512 para instalar la app en Android (manifest)
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<LeafIcon size={512} />, { width: 512, height: 512 });
}
