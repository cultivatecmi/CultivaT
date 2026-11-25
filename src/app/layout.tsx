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

export const metadata: Metadata = {
  title: "CultivaT · Cuida tu planta, cultiva tu futuro",
  description:
    "Mascota-planta virtual que acompaña a tu kit de cultivo real. Aprende a cuidar la naturaleza y descubre el campo de Sinaloa.",
  applicationName: "CultivaT",
  appleWebApp: { capable: true, title: "CultivaT", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4CAF50",
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
