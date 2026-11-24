import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CultivaT",
    short_name: "CultivaT",
    description: "Cuida tu planta virtual y tu kit de cultivo real.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDF7",
    theme_color: "#4CAF50",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
