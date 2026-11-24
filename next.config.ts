import type { NextConfig } from "next";

/**
 * GITHUB_PAGES=true  → exporta un sitio 100 % estático en /out (index.html incluido)
 *                       para publicarlo en GitHub Pages (lo usa .github/workflows/deploy.yml).
 * NEXT_BASE_PATH      → subruta del sitio, p. ej. "/CultivaT" en usuario.github.io/CultivaT
 *
 * Sin GITHUB_PAGES funciona como app normal (npm run dev / npm start / Vercel),
 * incluida la ruta /api/chat para conectar a Sabi con Gemini.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? (process.env.NEXT_BASE_PATH ?? "") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  ...(isPages
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: isPages ? "true" : "false",
  },
};

export default nextConfig;
