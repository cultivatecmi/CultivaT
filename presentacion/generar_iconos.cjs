// Genera los iconos PNG (Lucide, los mismos de la app) que usa la presentación.
// Uso: node presentacion/generar_iconos.cjs
const fs = require("fs");
const path = require("path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icons = require("lucide-react");
const sharp = require("sharp");

const OUT = path.join(__dirname, "assets", "icons");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const NAMES = [
  "Sprout", "Lightbulb", "Users", "Smartphone", "Leaf", "Package", "School", "House",
  "Megaphone", "Coins", "GraduationCap", "Trees", "Recycle", "CloudSun", "Target",
  "Compass", "FlaskConical", "Cpu", "Wheat", "Droplets", "Shovel", "BookOpen", "QrCode",
  "ImagePlus", "Award", "Check", "X", "Microscope", "Calculator", "BookMarked", "Tractor",
  "Hourglass", "Wifi", "ArrowRight", "Sparkles", "Brain", "Monitor", "ChartColumn",
  "Puzzle", "MessagesSquare", "HeartHandshake", "Sun", "MapPin",
];
// w blanco · m esmeralda claro · e esmeralda · a ámbar · s cielo · l gris claro · d pizarra
const COLORS = { w: "#FFFFFF", m: "#34D399", e: "#10B981", a: "#F59E0B", s: "#38BDF8", l: "#CBD5E1", d: "#94A3B8" };

(async () => {
  for (const name of NAMES) {
    const Icon = icons[name];
    if (!Icon) {
      console.warn("falta icono:", name);
      continue;
    }
    for (const [k, color] of Object.entries(COLORS)) {
      const svg = renderToStaticMarkup(React.createElement(Icon, { size: 256, color, strokeWidth: 2 }));
      const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
      fs.writeFileSync(path.join(OUT, `${name}-${k}.png`), buf);
    }
  }
  console.log("iconos listos en", OUT);
})();
