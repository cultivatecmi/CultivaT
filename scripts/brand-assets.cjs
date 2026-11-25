// Uso: node scripts/brand-assets.cjs   (lee design/logo-original.png)
// Prepara los recursos de marca a partir del logo oficial (public/logo.png):
// - quita el fondo crema (transparente) y las marcas del generador (esquinas)
// - recorta al contenido -> public/logo.png (900 px, ligero) y design/logo-hd.png (alta resolución)
// - palabra "CultivaT" -> public/logo-wordmark.png (cabeceras)
// - isotipo (brote + flores + tierra) -> public/icon.png 512, apple-touch-icon, icon-192, favicon.ico
const fs = require("fs");
const path = require("path");
const PROJECT = process.argv[2] || path.join(__dirname, "..");
const sharp = require(path.join(PROJECT, "node_modules", "sharp"));
const PUB = path.join(PROJECT, "public");
const SRC = path.join(PROJECT, "design", "logo-original.png");

(async () => {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  // color de fondo: mediana de una zona vacía
  const sample = [];
  for (let y = 600; y < 700; y++) for (let x = 80; x < 180; x++) sample.push((y * W + x) * 3);
  const med = (k) => sample.map((i) => data[i + k]).sort((a, b) => a - b)[sample.length >> 1];
  const bg = [med(0), med(1), med(2)];

  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
      // marcas del generador en las esquinas: fuera
      const mark = (x >= 1080 && y >= 1400) || (x < 130 && y < 120);
      const d = mark ? 0 : Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
      const a = Math.max(0, Math.min(1, (d - 10) / 42));
      if (a > 0) {
        r = bg[0] + (r - bg[0]) / a;
        g = bg[1] + (g - bg[1]) / a;
        b = bg[2] + (b - bg[2]) / a;
      }
      out[i * 4] = Math.max(0, Math.min(255, Math.round(r)));
      out[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g)));
      out[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b)));
      out[i * 4 + 3] = Math.round(a * 255);
    }
  }

  const bbox = (x0, y0, x1, y1) => {
    let minX = x1, minY = y1, maxX = x0, maxY = y0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++)
        if (out[(y * W + x) * 4 + 3] > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    return { minX, minY, maxX, maxY };
  };
  const img = () => sharp(out, { raw: { width: W, height: H, channels: 4 } });
  const crop = (bb, pad) => {
    const left = Math.max(0, bb.minX - pad), top = Math.max(0, bb.minY - pad);
    return { left, top, width: Math.min(W, bb.maxX + pad) - left, height: Math.min(H, bb.maxY + pad) - top };
  };

  // logo completo
  const full = bbox(0, 0, W, H);
  const fullBox = crop(full, 20);
  // alta resolución para presentaciones e imprenta (no se publica en la web)
  fs.writeFileSync(path.join(PROJECT, "design", "logo-hd.png"), await img().extract(fullBox).png({ compressionLevel: 9 }).toBuffer());
  // versión ligera para la app
  fs.writeFileSync(
    path.join(PUB, "logo.png"),
    await img().extract(fullBox).resize({ width: 900 }).png({ palette: true, quality: 95, effort: 10, compressionLevel: 9 }).toBuffer()
  );

  // palabra "CultivaT" con el brote de la T (sin lema ni isotipo) para cabeceras
  {
    const keep = (x, y) => (y >= 925 && y < 1195) || (x >= 1100 && y >= 780 && y < 925);
    const wm = Buffer.from(out);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!keep(x, y)) wm[(y * W + x) * 4 + 3] = 0;
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (wm[(y * W + x) * 4 + 3] > 40) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
    const box = crop({ minX, minY, maxX, maxY }, 8);
    const buf = await sharp(wm, { raw: { width: W, height: H, channels: 4 } }).extract(box).resize({ height: 240 }).png({ palette: true, quality: 95, effort: 10, compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(path.join(PUB, "logo-wordmark.png"), buf);
    console.log("wordmark", box);
  }

  // isotipo: zona del brote (arriba del texto, columna central)
  const iso = bbox(480, 200, 1060, 925);
  const isoBox = crop(iso, 6);
  const isoPng = await img().extract(isoBox).png().toBuffer();

  const square = async (size, { radius = 0, scale = 0.8, bgColor = "#FFFBEB" } = {}) => {
    const inner = Math.round(size * scale);
    const mark = await sharp(isoPng).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${bgColor}"/></svg>`;
    return sharp(Buffer.from(bgSvg)).composite([{ input: mark, gravity: "center" }]).png().toBuffer();
  };

  fs.writeFileSync(path.join(PUB, "icon.png"), await square(512));
  fs.writeFileSync(path.join(PUB, "icon-192.png"), await square(192));
  fs.writeFileSync(path.join(PUB, "apple-touch-icon.png"), await square(180));

  // favicon.ico con PNG de 16, 32 y 48 (más grande el dibujo y esquinas redondeadas)
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map((s) => square(s, { radius: Math.round(s * 0.22), scale: 0.92 })));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, k) => {
    const e = 6 + 16 * k;
    header.writeUInt8(s, e);
    header.writeUInt8(s, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[k].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += pngs[k].length;
  });
  fs.writeFileSync(path.join(PUB, "favicon.ico"), Buffer.concat([header, ...pngs]));

  console.log("bg", bg, "logo", fullBox, "iso", isoBox);
})();
