import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CultivaT",
    short_name: "CultivaT",
    description: "Cuida tu planta virtual y tu kit de cultivo real.",
    start_url: `${base}/`,
    display: "standalone",
    background_color: "#FFFDF7",
    theme_color: "#2E7D32",
    icons: [
      { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
