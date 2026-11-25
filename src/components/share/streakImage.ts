/**
 * Arma la imagen para compartir la racha (1080×1350, formato para WhatsApp e Instagram):
 * escenario + planta (con sus accesorios) + tarjeta con la racha.
 * Los SVG se toman ya dibujados en pantalla y se pasan a un <canvas>.
 */

const W = 1080;
const H = 1350;
const SCENE_H = 864; // el escenario mide 400×320 → 1080×864

function svgToImage(svg: SVGSVGElement, width: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  const height = vb && vb.width ? (width * vb.height) / vb.width : width;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(Math.round(height)));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg"));
    };
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface StreakImageData {
  streak: number;
  plantName: string;
  stageLabel: string;
  link: string;
  sceneSvg: SVGSVGElement | null;
  plantSvg: SVGSVGElement | null;
}

export async function buildStreakImage(d: StreakImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const family = getComputedStyle(document.body).getPropertyValue("--font-fredoka").trim() || "sans-serif";
  try {
    await document.fonts.load(`700 80px ${family}`);
  } catch {
    /* sigue con la fuente del sistema */
  }
  const font = (size: number, weight = 700) => `${weight} ${size}px ${family}, sans-serif`;

  // fondo general
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#9FE0FF");
  bg.addColorStop(1, "#FFF4D6");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // escenario de la tienda
  if (d.sceneSvg) {
    try {
      ctx.drawImage(await svgToImage(d.sceneSvg, W), 0, 0, W, SCENE_H);
    } catch {
      /* sin escenario */
    }
  }

  // planta (con maceta y accesorios)
  if (d.plantSvg) {
    try {
      const pw = 800;
      const img = await svgToImage(d.plantSvg, pw);
      const ph = (pw * img.height) / img.width;
      ctx.drawImage(img, (W - pw) / 2, 860 - ph, pw, ph);
    } catch {
      /* sin planta */
    }
  }

  // logo
  ctx.fillStyle = "rgba(255,255,255,.92)";
  roundRect(ctx, 40, 40, 330, 96, 48);
  ctx.fill();
  ctx.font = font(58);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#4CAF50";
  ctx.fillText("Cultiva", 78, 90);
  const cw = ctx.measureText("Cultiva").width;
  ctx.fillStyle = "#FFB300";
  ctx.fillText("T", 78 + cw, 90);
  ctx.font = font(46, 400);
  ctx.fillText("🌱", 78 + cw + ctx.measureText("T").width + 12, 88);

  // tarjeta inferior
  ctx.shadowColor = "rgba(0,0,0,.18)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#FFFDF7";
  roundRect(ctx, 50, 830, W - 100, 470, 56);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.textAlign = "center";
  ctx.fillStyle = "#FF7043";
  ctx.font = font(170);
  ctx.fillText(`🔥 ${d.streak}`, W / 2, 965);
  ctx.fillStyle = "#3E2C23";
  ctx.font = font(64);
  ctx.fillText(d.streak === 1 ? "día de racha" : "días de racha", W / 2, 1080);
  ctx.font = font(44, 500);
  ctx.fillStyle = "#6D4C41";
  ctx.fillText(`cuidando a ${d.plantName} · ${d.stageLabel}`, W / 2, 1155);

  ctx.fillStyle = "#E8F5E9";
  roundRect(ctx, 150, 1205, W - 300, 66, 33);
  ctx.fill();
  ctx.fillStyle = "#2E7D32";
  ctx.font = font(34, 600);
  ctx.fillText(d.link.replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, 1239);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}
