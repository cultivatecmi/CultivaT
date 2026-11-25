import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Se publica como /manifest.webmanifest (Next lo enlaza solo en el <head>).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CultivaT · Agrotech & Educación",
    short_name: "CultivaT",
    description: "Cuida tu planta virtual y tu kit de cultivo real.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    lang: "es-MX",
    background_color: "#FFFBEB",
    theme_color: "#15803D",
    icons: [
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icon.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
