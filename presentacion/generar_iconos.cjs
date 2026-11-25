// Genera los iconos PNG (Lucide, los mismos de la app) que usa la presentación.
// Uso: node presentacion/generar_iconos.cjs
const fs = require("fs");
const path = require("path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icons = require("lucide-react");
const sharp = require("sharp");

const OUT = path.join(__dirname, "assets", "icons");
fs.mkdirSync(OUT, { recursive: true });

const NAMES = [
  "Sprout", "Lightbulb", "Tractor", "Users", "Smartphone", "Heart", "Leaf", "Quote",
  "Package", "School", "House", "Handshake", "Megaphone", "Share2", "GraduationCap",
  "Trees", "Recycle", "CloudSun", "ThermometerSun", "Bug", "Gamepad2", "ScanLine",
  "MessageCircle", "QrCode", "Lock", "Clock", "Compass", "FlaskConical", "Cpu",
  "Timer", "TrendingUp", "ImagePlus", "Camera", "Coins", "Droplets", "Sun", "Hourglass",
  "Shovel", "BookOpen", "Sparkles", "Flower2", "Wheat", "ClipboardList", "Award",
  "MapPin", "ArrowRight", "Presentation", "Rocket", "ShieldCheck", "Target",
];
const COLORS = { w: "#FFFFFF", g: "#15803D", b: "#422006", a: "#F59E0B" };

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
