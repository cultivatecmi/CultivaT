import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

// Fredoka y Nunito (Google Fonts) incluidas en el proyecto vía @fontsource-variable:
// así la compilación no depende de descargar fuentes de Google (fallaba en GitHub Actions).
const fredoka = localFont({
  src: "../../node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
});

const nunito = localFont({
  src: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "CultivaT · Cuida tu planta, cultiva tu futuro",
  description:
    "Mascota-planta virtual que acompaña a tu kit de cultivo real. Aprende a cuidar la naturaleza y descubre el campo de Sinaloa.",
  applicationName: "CultivaT",
  appleWebApp: { capable: true, title: "CultivaT", statusBarStyle: "default" },
  // Íconos sacados del logo oficial (public/logo.png) con scripts/brand-assets.cjs
  icons: {
    icon: [
      { url: `${BASE}/favicon.ico`, sizes: "16x16 32x32 48x48" },
      { url: `${BASE}/icon.png`, type: "image/png", sizes: "512x512" },
      { url: `${BASE}/icon-192.png`, type: "image/png", sizes: "192x192" },
    ],
    shortcut: [{ url: `${BASE}/favicon.ico` }],
    apple: [{ url: `${BASE}/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#15803D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${fredoka.variable} ${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
