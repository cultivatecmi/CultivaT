# -*- coding: utf-8 -*-
"""
Genera Presentacion_CultivaT_Enactus.pptx (11 diapositivas, tema oscuro) en la raíz
del repo para Enactus · Universidad Tecmilenio Campus Culiacán.
No incluye capturas ni funciones de la app: eso se muestra en la demo en vivo.

Uso (desde la raíz del repo):
    python -m pip install python-pptx Pillow
    node presentacion/generar_iconos.cjs      # solo si faltan los iconos
    python presentacion/generar_presentacion.py

Los recuadros punteados son imágenes de relleno: clic derecho →
"Cambiar imagen" para poner el render del kit o el emblema sin mover el diseño.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_TICK_MARK
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ICONS = HERE / "assets" / "icons"
GEN = HERE / "assets" / "generado"
LOGO = ROOT / "public" / "logo.png"
QR = ROOT / "design" / "qr-cultivat.png"
OUT = ROOT / "Presentacion_CultivaT_Enactus.pptx"

# ── Sistema de diseño (dark mode) ──
BG, CARD, BORDER = "090F1A", "111B2E", "1E2D4A"
EMERALD, EMERALD_HI, AMBER, SKY = "10B981", "34D399", "F59E0B", "38BDF8"
WHITE, BODY_C, MUTED = "F8FAFC", "CBD5E1", "94A3B8"
BROWN = "A47148"  # café tierra visible sobre fondo oscuro
TINT = {"e": "113B3F", "a": "3F3527", "s": "193B56", "d": "2B364A"}  # 20 % del acento sobre CARD
ICON_ON_TINT = {"e": "m", "a": "a", "s": "s", "d": "l"}
ACCENT = {"e": EMERALD_HI, "a": AMBER, "s": SKY, "d": MUTED}
HEAD, BODY = "Segoe UI Semibold", "Segoe UI"
FONT_DIR = Path(r"C:\Windows\Fonts")
TOTAL = 11

L, C, R = PP_ALIGN.LEFT, PP_ALIGN.CENTER, PP_ALIGN.RIGHT
TOP, MID, BOT = MSO_ANCHOR.TOP, MSO_ANCHOR.MIDDLE, MSO_ANCHOR.BOTTOM
RRECT, OVAL = MSO_SHAPE.ROUNDED_RECTANGLE, MSO_SHAPE.OVAL


def rgb(h):
    return RGBColor.from_string(h)


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ───────────────────────── utilidades ─────────────────────────
def text(slide, x, y, w, h, paras, size=16, color=BODY_C, font=BODY, bold=False, italic=False,
         align=L, anchor=TOP, spc=None, line=None, name=None):
    """paras: str | [str | [(texto, {opciones})]] — opciones: size, color, font, bold, italic, spc"""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        box.name = name
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if isinstance(paras, str):
        paras = [paras]
    for i, p in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = align
        if line:
            para.line_spacing = line
        runs = p if isinstance(p, list) else [(p, {})]
        for t, o in runs:
            r = para.add_run()
            r.text = t
            f = r.font
            f.size = Pt(o.get("size", size))
            f.name = o.get("font", font)
            f.bold = o.get("bold", bold)
            f.italic = o.get("italic", italic)
            f.color.rgb = rgb(o.get("color", color))
            s = o.get("spc", spc)
            if s:
                r._r.get_or_add_rPr().set("spc", str(int(s * 100)))
    return box


def no_effects(shp):
    spPr = shp._element.spPr
    for e in spPr.findall("{http://schemas.openxmlformats.org/drawingml/2006/main}effectLst"):
        spPr.remove(e)
    spPr.append(parse_xml('<a:effectLst %s/>' % nsdecls("a")))


def shape(slide, kind, x, y, w, h, fill=None, line=None, lw=0.75, dash=False, radius=None, name=None):
    s = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        s.name = name
    if radius is not None and kind == RRECT:
        s.adjustments[0] = min(0.5, radius / min(w, h))
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = rgb(fill)
    else:
        s.fill.background()
    if line:
        s.line.color.rgb = rgb(line)
        s.line.width = Pt(lw)
        if dash:
            s.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    else:
        s.line.fill.background()
    no_effects(s)
    return s


def card(slide, x, y, w, h, fill=CARD, line=BORDER, lw=0.75, radius=0.13, name=None):
    return shape(slide, RRECT, x, y, w, h, fill=fill, line=line, lw=lw, radius=radius, name=name)


def picture(slide, path, x, y, w=None, h=None, name=None, alt=None):
    p = slide.shapes.add_picture(str(path), Inches(x), Inches(y),
                                 Inches(w) if w else None, Inches(h) if h else None)
    if name:
        p.name = name
    if alt:
        p._element.nvPicPr.cNvPr.set("descr", alt)
    return p


def icon(slide, name, x, y, size):
    return picture(slide, ICONS / f"{name}.png", x, y, size, size)


def tile(slide, x, y, size, accent, ic, fill=None, icon_key=None):
    """Mosaico de icono estilo Linear: cuadro redondeado tintado + icono del acento."""
    card(slide, x, y, size, size, fill=fill or TINT[accent], line=None, radius=size * 0.26)
    k = icon_key or ICON_ON_TINT.get(accent, "w")
    icon(slide, f"{ic}-{k}", x + size * 0.24, y + size * 0.24, size * 0.52)


def pill(slide, x, y, w, h, label, color, fill, line=None, size=10, spc=1.5):
    card(slide, x, y, w, h, fill=fill, line=line, radius=h / 2)
    text(slide, x, y, w, h, label, size=size, color=color, bold=True, align=C, anchor=MID, spc=spc)


def line(slide, x1, y1, x2, y2, color=BORDER, w=1.0, head=False):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    c.line.color.rgb = rgb(color)
    c.line.width = Pt(w)
    if head:
        ln = c.line._get_or_add_ln()
        tail = OxmlElement("a:tailEnd")
        tail.set("type", "triangle")
        tail.set("w", "med")
        tail.set("len", "med")
        ln.append(tail)
    return c


def notes(slide, s):
    slide.notes_slide.notes_text_frame.text = s.strip()


def eyebrow(slide, x, y, label, color=EMERALD_HI, w=8):
    text(slide, x, y, w, 0.3, label, size=11, color=color, bold=True, spc=2.5)


def header(slide, n, kicker, title, sub=None, source=None):
    picture(slide, GLOW_CORNER, 8.6, -3.2, 7.5, 7.5, name="Brillo")
    eyebrow(slide, 0.75, 0.52, f"{n:02d} — {kicker}")
    text(slide, 0.75, 0.82, 11.8, 0.75, title, size=32, color=WHITE, font=HEAD, anchor=MID, name="Título")
    if sub:
        text(slide, 0.75, 1.52, 11.8, 0.4, sub, size=16, color=BODY_C, name="Subtítulo")
    text(slide, 11.33, 7.03, 1.25, 0.25, f"{n + 1:02d} / {TOTAL}", size=10, color=MUTED, align=R, spc=1)
    text(slide, 0.75, 7.03, 10.0, 0.25, source or "CultivaT · Enactus Tecmilenio Culiacán", size=10,
         color=MUTED, italic=bool(source))


# ─────────────────── imágenes generadas (brillos, retícula, recuadros) ───────────────────
def glow(path, color, max_alpha, size=900, power=2.2):
    g = Image.radial_gradient("L")  # 0 al centro; el borde del círculo inscrito vale ~181
    edge = g.getpixel((0, 128))
    a = g.point(lambda v: int(max_alpha * max(0.0, 1 - v / edge) ** power)).resize((size, size), Image.BICUBIC)
    img = Image.new("RGBA", (size, size), hexrgb(color) + (0,))
    img.putalpha(a)
    img.save(path)
    return path


def grid(path, W=1920, H=1080, step=64):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    col = hexrgb(BORDER) + (150,)
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=col, width=1)
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=col, width=1)
    mask = Image.radial_gradient("L").point(lambda v: int(255 * max(0, 1 - v / 181) ** 1.4)).resize((W, H), Image.BICUBIC)
    img.putalpha(ImageChops.multiply(img.getchannel("A"), mask))
    img.save(path)
    return path


def placeholder(key, w, h, title, ic="ImagePlus-m"):
    S = 144
    W, H = int(w * S), int(h * S)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(min(0.13 * S, min(W, H) / 4))
    d.rounded_rectangle([0, 0, W - 1, H - 1], r, fill=hexrgb(CARD) + (255,))
    lw, inset = 3, 8
    x0, y0, x1, y1 = inset, inset, W - 1 - inset, H - 1 - inset
    rr = max(6, r - inset)
    bc = hexrgb(EMERALD) + (200,)
    dash, gap = 16, 12

    def hdash(yy, xa, xb):
        xx = xa
        while xx < xb:
            d.line([(xx, yy), (min(xx + dash, xb), yy)], fill=bc, width=lw)
            xx += dash + gap

    def vdash(xx, ya, yb):
        yy = ya
        while yy < yb:
            d.line([(xx, yy), (xx, min(yy + dash, yb))], fill=bc, width=lw)
            yy += dash + gap

    hdash(y0, x0 + rr, x1 - rr)
    hdash(y1, x0 + rr, x1 - rr)
    vdash(x0, y0 + rr, y1 - rr)
    vdash(x1, y0 + rr, y1 - rr)
    for bx, by, a0, a1 in [(x0, y0, 180, 270), (x1 - 2 * rr, y0, 270, 360),
                           (x1 - 2 * rr, y1 - 2 * rr, 0, 90), (x0, y1 - 2 * rr, 90, 180)]:
        d.arc([bx, by, bx + 2 * rr, by + 2 * rr], a0, a1, fill=bc, width=lw)

    ts = int(max(20, min(36, min(W, H) * 0.06)))
    ft = ImageFont.truetype(str(FONT_DIR / "seguisb.ttf"), ts)
    fs = ImageFont.truetype(str(FONT_DIR / "segoeui.ttf"), int(ts * 0.72))
    sub = "Clic derecho → Cambiar imagen"

    def wrap(txt, font, maxw):
        lines, cur = [], ""
        for wd in txt.split():
            t = (cur + " " + wd).strip()
            if d.textlength(t, font=font) <= maxw or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = wd
        lines.append(cur)
        return lines

    if H < 1.3 * S:
        isz = int(H * 0.4)
        ic_img = Image.open(ICONS / f"{ic}.png").convert("RGBA").resize((isz, isz))
        px = int(0.22 * S)
        img.alpha_composite(ic_img, (px, (H - isz) // 2))
        tx = px + isz + 18
        lines = wrap(title, ft, W - tx - px)
        block = len(lines) * ts * 1.2 + ts * 0.95
        ty = (H - block) / 2
        for ln in lines:
            d.text((tx, ty), ln, font=ft, fill=hexrgb(WHITE))
            ty += ts * 1.2
        d.text((tx, ty + 2), sub, font=fs, fill=hexrgb(MUTED))
    else:
        isz = int(max(48, min(120, min(W, H) * 0.16)))
        ic_img = Image.open(ICONS / f"{ic}.png").convert("RGBA").resize((isz, isz))
        lines = wrap(title, ft, W * 0.8)
        block = isz + 22 + len(lines) * ts * 1.25 + 12 + ts
        ty = (H - block) / 2
        img.alpha_composite(ic_img, ((W - isz) // 2, int(ty)))
        ty += isz + 22
        for ln in lines:
            d.text((W / 2, ty), ln, font=ft, fill=hexrgb(WHITE), anchor="ma")
            ty += ts * 1.25
        d.text((W / 2, ty + 12), sub, font=fs, fill=hexrgb(MUTED), anchor="ma")
    path = GEN / f"{key}.png"
    img.save(path)
    return path


def photo_slot(slide, key, x, y, w, h, title, ic="ImagePlus-m"):
    path = placeholder(key, w, h, title, ic)
    return picture(slide, path, x, y, w, h, name=f"Reemplazar: {title}", alt=f"Espacio para {title}")


def label_point(point, txt, size=20, color=WHITE, pos=None):
    dl = point.data_label
    tf = dl.text_frame
    tf.text = txt
    for p in tf.paragraphs:
        for r in p.runs:
            r.font.size = Pt(size)
            r.font.bold = True
            r.font.name = BODY
            r.font.color.rgb = rgb(color)
    if pos is not None:
        dl.position = pos


# ════════════════════════════ PRESENTACIÓN ════════════════════════════
shutil.rmtree(GEN, ignore_errors=True)
GEN.mkdir(parents=True, exist_ok=True)
GLOW_CORNER = glow(GEN / "brillo-esquina.png", EMERALD, 70)
GLOW_EMERALD = glow(GEN / "brillo-esmeralda.png", EMERALD, 120)
GLOW_AMBER = glow(GEN / "brillo-ambar.png", AMBER, 70)
GRID = grid(GEN / "reticula.png")

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
prs.core_properties.title = "CultivaT · Enactus Tecmilenio Campus Culiacán"
prs.core_properties.author = "Equipo CultivaT"


def new_slide():
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb(BG)
    return s


# ── 1 · Portada ──────────────────────────────────────────────────────────
s = new_slide()
picture(s, GRID, 0, 0, 13.333, 7.5, name="Retícula")
picture(s, GLOW_EMERALD, -1.2, -0.9, 7.6, 7.6, name="Brillo logo")
picture(s, GLOW_AMBER, 8.2, 1.6, 6.0, 6.0, name="Brillo kit")
pill(s, 0.75, 0.6, 5.75, 0.38, "ENACTUS TECMILENIO CULIACÁN · EMPRENDIMIENTO SOCIAL", EMERALD_HI,
     "0B2A26", line="155E4B", size=10, spc=1.5)
lh = 2.95
picture(s, LOGO, 0.75, 1.25, lh * 900 / 730, lh, name="Logo CultivaT", alt="Logo oficial de CultivaT")
text(s, 0.75, 4.35, 6.6, 1.2, ["Cultivando conciencia,", "cosechando futuro."], size=36, color=WHITE,
     font=HEAD, line=0.95, name="Lema")
text(s, 0.75, 5.7, 6.2, 1.0,
     "Experiencia educativa híbrida (phygital) que une la siembra real con una plataforma gamificada "
     "para reconectar a la niñez de Sinaloa con la tierra.", size=16, color=BODY_C, name="Subtítulo")
photo_slot(s, "render-kit-portada", 7.65, 0.95, 4.93, 4.95, "Render del kit físico CultivaT", "Package-m")
photo_slot(s, "emblema-enactus", 7.65, 6.12, 4.93, 0.8, "Emblema Enactus Tecmilenio Culiacán", "Award-m")
notes(s, """
🎤 ALEJANDRA · 0:00 – 0:15
"Buenos días. Somos el equipo Enactus de Tecmilenio Campus Culiacán y les presentamos CultivaT: cultivando conciencia, cosechando futuro."
▶ Kit físico en la mano desde el inicio.
""")

# ── 2 · Identidad y concepto ─────────────────────────────────────────────
s = new_slide()
header(s, 1, "IDENTIDAD Y CONCEPTO",
       "¿Cuándo fue la última vez que un niño sembró algo con sus propias manos?")
for x, acc, ic, kick, ttl, body in [
    (0.75, "e", "Sprout", "CULTIVA", "Acción tangible",
     "Sembrar, cuidar y cosechar una planta real en casa o en la escuela."),
    (6.78, "a", "Lightbulb", "CULTÍVATE", "Desarrollo integral",
     "Curiosidad científica, disciplina, responsabilidad y orgullo por el campo sinaloense."),
]:
    card(s, x, 2.05, 5.8, 3.15)
    tile(s, x + 0.45, 2.45, 0.8, acc, ic)
    eyebrow(s, x + 1.5, 2.55, kick, ACCENT[acc], w=4)
    text(s, x + 1.5, 2.82, 4.0, 0.5, ttl, size=24, color=WHITE, font=HEAD)
    text(s, x + 0.45, 3.75, 4.9, 1.1, body, size=18, color=BODY_C, line=1.1)
text(s, 0.75, 5.55, 6.0, 0.3, "SIGNIFICADO DE MARCA", size=11, color=MUTED, bold=True, spc=2.5)
for i, (col, name, mean) in enumerate([(EMERALD, "Verde", "crecimiento"), (BROWN, "Café", "tierra fértil"),
                                       (AMBER, "Ámbar", "el sol de Sinaloa")]):
    x = 0.75 + i * 4.03
    card(s, x, 5.95, 3.8, 0.8)
    shape(s, OVAL, x + 0.3, 6.13, 0.44, 0.44, fill=col)
    text(s, x + 0.95, 5.95, 2.8, 0.8, [[(name + "  ", {"color": WHITE, "font": HEAD}), (mean, {})]],
         size=16, anchor=MID)
notes(s, """
🎤 ALEJANDRA · 0:15 – 0:35
"¿Cuándo fue la última vez que un niño sembró algo con sus propias manos? Nuestro nombre tiene dos sentidos: Cultiva, la acción de sembrar y cuidar una planta real; y Cultívate, crecer en curiosidad, disciplina y orgullo por nuestro campo. Verde de crecimiento, café de tierra fértil y ámbar del sol de Sinaloa."
""")

# ── 3 · El problema ──────────────────────────────────────────────────────
s = new_slide()
header(s, 2, "EL PROBLEMA", "Potencia agrícola, doble brecha",
       source="Fuentes: INEGI, Censo Agropecuario 2022 · INEGI, ENDUTIH 2024")
eyebrow(s, 0.75, 1.72, "BRECHA GENERACIONAL · CAMPO", AMBER)
for i, (ic, num, unit, lab) in enumerate([("Wheat", "1,485,405", " ha", "de uso agrícola en Sinaloa"),
                                          ("Tractor", "590,328", "", "trabajadores agropecuarios en Sinaloa"),
                                          ("Hourglass", "27 %", "", "de los productores en México tiene +65 años")]):
    y = 2.12 + i * 1.57
    card(s, 0.75, y, 5.5, 1.4)
    tile(s, 1.05, y + 0.37, 0.66, "a", ic)
    text(s, 1.98, y + 0.12, 4.1, 0.7, [[(num, {}), (unit, {"size": 22, "color": BODY_C})]], size=40,
         color=AMBER, font=HEAD, anchor=MID)
    text(s, 1.98, y + 0.84, 4.1, 0.4, lab, size=14, color=BODY_C)
eyebrow(s, 6.6, 1.72, "BRECHA DIGITAL · NIÑEZ", SKY)
card(s, 6.6, 2.12, 5.98, 4.54, name="Tarjeta pantallas")
tile(s, 6.95, 2.47, 0.66, "s", "Wifi")
text(s, 7.85, 2.37, 4.5, 0.7, [[("2.6 h", {}), ("/día", {"size": 22, "color": BODY_C})]], size=40, color=SKY,
     font=HEAD, anchor=MID)
text(s, 7.85, 3.07, 4.5, 0.35, "promedio de uso de internet (6–11 años)", size=14, color=BODY_C)
cd = CategoryChartData()
cd.categories = ["Pasa >2 h/día frente a pantallas", "Usa internet (6–11 años)"]
cd.add_series("Niñez", (65, 79.7))
gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(6.85), Inches(3.6), Inches(5.5), Inches(2.9), cd)
gf.name = "Gráfica ENDUTIH (editable)"
ch = gf.chart
ch.has_legend = False
ch.has_title = False
ch.font.size = Pt(14)
ch.font.name = BODY
ch.font.color.rgb = rgb(BODY_C)
plot = ch.plots[0]
plot.gap_width = 70
va = ch.value_axis
va.minimum_scale, va.maximum_scale = 0, 120
va.has_major_gridlines = False
va.visible = False
ca = ch.category_axis
ca.major_tick_mark = XL_TICK_MARK.NONE
ca.format.line.color.rgb = rgb(BORDER)
ca.tick_labels.font.size = Pt(14)
ca.tick_labels.font.color.rgb = rgb(BODY_C)
ser = plot.series[0]
for i, (col, lab) in enumerate([("1E6FA0", ">65 %"), (SKY, "79.7 %")]):
    pt = ser.points[i]
    pt.format.fill.solid()
    pt.format.fill.fore_color.rgb = rgb(col)
    label_point(pt, lab, size=20, pos=XL_LABEL_POSITION.OUTSIDE_END)
notes(s, """
🎤 MAIDE · 0:35 – 1:15
"Sinaloa es potencia agrícola: un millón 485 mil hectáreas y 590 mil trabajadores del campo. Pero enfrentamos una doble brecha. Generacional: 27 de cada 100 productores en México tienen más de 65 años. Y digital: el 79.7 % de los niños de 6 a 11 años usa internet, en promedio 2.6 horas al día, y más del 65 % pasa más de dos horas frente a pantallas sin cumplir la actividad física recomendada."
""")

# ── 4 · La oportunidad ───────────────────────────────────────────────────
s = new_slide()
header(s, 3, "LA OPORTUNIDAD", "No prohibir la pantalla: convertirla en puente")
steps = [("d", "Smartphone", "PUNTO DE PARTIDA", "Pantalla pasiva", "Sedentarismo y desconexión"),
         ("e", "Sprout", "EL PUENTE", "CultivaT", "Gamificación + tierra real"),
         ("a", "Leaf", "EL RESULTADO", "Hábito ecológico", "Y vocación agro-STEM")]
cw = 3.55
gap = (11.83 - 3 * cw) / 2
for i, (acc, ic, kick, ttl, sub) in enumerate(steps):
    x = 0.75 + i * (cw + gap)
    hero = acc == "e"
    if hero:
        picture(s, GLOW_EMERALD, x - 0.9, 1.15, cw + 1.8, cw + 1.8, name="Brillo puente")
    card(s, x, 1.95, cw, 2.75, line=EMERALD if hero else BORDER, lw=1.5 if hero else 0.75)
    tile(s, x + 0.4, 2.35, 0.75, acc, ic)
    eyebrow(s, x + 0.4, 3.32, kick, ACCENT[acc], w=cw - 0.6)
    text(s, x + 0.4, 3.6, cw - 0.6, 0.5, ttl, size=22, color=WHITE, font=HEAD)
    text(s, x + 0.4, 4.1, cw - 0.6, 0.4, sub, size=15, color=BODY_C)
    if i < 2:
        line(s, x + cw + 0.12, 3.32, x + cw + gap - 0.12, 3.32, EMERALD_HI, 2, head=True)
card(s, 0.75, 5.05, 11.83, 1.7, name="Evidencia")
tile(s, 1.1, 5.5, 0.8, "s", "Microscope")
eyebrow(s, 2.2, 5.33, "RESPALDO CIENTÍFICO", SKY)
text(s, 2.2, 5.63, 10.0, 0.95,
     "El vínculo emocional y directo con la naturaleza predice mejor las conductas ecológicas en la "
     "infancia que la memorización teórica.", size=18, color=WHITE, line=1.05)
notes(s, """
🎤 MAIDE · 1:15 – 1:40
"La solución no es prohibir la pantalla, sino convertirla en un puente. La investigación muestra que el vínculo emocional y directo con la naturaleza predice mejor las conductas ecológicas en la infancia que memorizar teoría. CultivaT lleva a los niños de la pantalla pasiva a un hábito ecológico real."
▶ Tener a la mano la referencia de la revisión científica por si el jurado la pide.
""")

# ── 5 · Kit físico ───────────────────────────────────────────────────────
s = new_slide()
header(s, 4, "LA SOLUCIÓN FÍSICA", "Kit CultivaT: accesible y seguro")
photo_slot(s, "render-kit", 0.75, 1.85, 5.6, 4.9, "Render o foto del kit físico", "Package-m")
for x, y, w, lab in [(1.05, 2.15, 1.9, "BIODEGRADABLE"), (3.95, 2.15, 2.1, "LISTO PARA SEMBRAR"),
                     (1.05, 6.12, 1.75, "QR INCLUIDO")]:
    pill(s, x, y, w, 0.36, lab, EMERALD_HI, "0B2A26", line="155E4B", size=9, spc=1.2)
rows = [("e", "Recycle", "Maceta biodegradable", "Ecológica, ligera y segura para niños"),
        ("a", "Shovel", "Sustrato + biofertilizante", "Tierra preparada, lista para sembrar"),
        ("s", "Droplets", "Semillas + regadera infantil", "Semillas seleccionadas y envase regadera"),
        ("e", "QrCode", "Guía ilustrada + tarjeta QR", "Paso a paso y vinculación inmediata")]
for i, (acc, ic, ttl, sub) in enumerate(rows):
    y = 1.85 + i * 1.25
    card(s, 6.7, y, 5.88, 1.1)
    tile(s, 6.98, y + 0.22, 0.66, acc, ic)
    text(s, 7.9, y + 0.17, 4.5, 0.42, ttl, size=18, color=WHITE, font=HEAD)
    text(s, 7.9, y + 0.6, 4.5, 0.35, sub, size=14, color=BODY_C)
notes(s, """
🎤 YARELI · 1:40 – 2:05
"Nuestra solución empieza con algo que se puede tocar: el Kit CultivaT. Trae una maceta biodegradable, sustrato preparado con biofertilizante, semillas seleccionadas, un envase regadera infantil y una guía ilustrada con tarjeta QR que lo vincula de inmediato con la plataforma."
▶ Levantar el kit y mostrar cada pieza.
""")

# ── 6 · El reto educativo ────────────────────────────────────────────────
s = new_slide()
header(s, 5, "EL RETO EDUCATIVO", "Más que un kit: aprender haciendo",
       source="Fuentes: OCDE (2023), PISA 2022 · Gobierno de Sinaloa, Panorama escolar 2022-2023")
kpis = [("a", "ChartColumn", "66 %", "de estudiantes en México debajo del nivel 2 de matemáticas (PISA 2022)"),
        ("s", "Calculator", "395", "puntos de México en matemáticas, debajo del promedio OCDE"),
        ("e", "Monitor", "45.5 %", "de planteles en Sinaloa con computadoras para uso pedagógico")]
kw = (11.83 - 2 * 0.25) / 3
for i, (acc, ic, num, lab) in enumerate(kpis):
    x = 0.75 + i * (kw + 0.25)
    card(s, x, 1.85, kw, 2.75)
    tile(s, x + 0.35, 2.2, 0.66, acc, ic)
    text(s, x + 0.35, 3.0, kw - 0.6, 0.8, num, size=48, color=ACCENT[acc], font=HEAD, anchor=MID)
    text(s, x + 0.35, 3.82, kw - 0.6, 0.7, lab, size=14, color=BODY_C)
picture(s, GLOW_EMERALD, 3.2, 3.6, 7.0, 4.2, name="Brillo objetivo")
card(s, 0.75, 4.9, 11.83, 1.85, line=EMERALD, lw=1.25, name="Objetivo general")
tile(s, 1.1, 5.4, 0.85, "e", "Target")
eyebrow(s, 2.3, 5.18, "OBJETIVO GENERAL")
text(s, 2.3, 5.5, 9.9, 1.05,
     "Fortalecer el pensamiento científico, crítico y la responsabilidad de niñas y niños uniendo "
     "tecnología, experimentación y contacto con la naturaleza.", size=19, color=WHITE, line=1.05)
notes(s, """
🎤 YARELI · 2:05 – 2:25
"Pero CultivaT es más que un kit. En PISA 2022, cerca del 66 % de los estudiantes en México quedó debajo del nivel básico en matemáticas, y en Sinaloa menos de la mitad de los planteles tiene computadoras para uso pedagógico. Nuestro objetivo es fortalecer el pensamiento científico y la responsabilidad aprendiendo haciendo: tecnología, experimentación y naturaleza."
▶ Son datos de contexto, no una medición del impacto de CultivaT.
""")

# ── 7 · Arquitectura pedagógica ──────────────────────────────────────────
s = new_slide()
header(s, 6, "ARQUITECTURA PEDAGÓGICA", "Programa curricular de 4 módulos")
top = [("e", "Users", "6 a 14 años", "Primaria y secundaria · 6–8 · 9–10 · 11–14"),
       ("a", "Puzzle", "3 metodologías activas", "Proyectos (ABP) · Juegos · Experimentación (Piaget)")]
for i, (acc, ic, ttl, sub) in enumerate(top):
    x = 0.75 + i * 6.03
    card(s, x, 1.8, 5.8, 1.15)
    tile(s, x + 0.3, 2.05, 0.66, acc, ic)
    text(s, x + 1.2, 1.92, 4.45, 0.45, ttl, size=19, color=WHITE, font=HEAD)
    text(s, x + 1.2, 2.38, 4.45, 0.4, sub, size=14, color=BODY_C)
mods = [("M1", "Exploradores de la naturaleza", "Observación y ciclo de vida", "Compass"),
        ("M2", "Pequeños científicos", "Hipótesis, experimentación y bitácora", "FlaskConical"),
        ("M3", "Creadores de soluciones", "Medición, tecnología e ingeniería", "Cpu"),
        ("M4", "Aprendemos y compartimos", "Proyecto final y conciencia ambiental", "MessagesSquare")]
mw = (11.83 - 3 * 0.2) / 4
line(s, 0.75 + mw / 2, 3.36, 0.75 + 3 * (mw + 0.2) + mw / 2, 3.36, "155E4B", 2)
for i, (code, name, sub, ic) in enumerate(mods):
    x = 0.75 + i * (mw + 0.2)
    shape(s, OVAL, x + mw / 2 - 0.11, 3.25, 0.22, 0.22, fill=EMERALD_HI)
    card(s, x, 3.62, mw, 1.88)
    text(s, x + 0.3, 3.8, 1.0, 0.35, code, size=14, color=EMERALD_HI, bold=True, spc=1.5)
    icon(s, f"{ic}-m", x + mw - 0.68, 3.8, 0.38)
    text(s, x + 0.3, 4.2, mw - 0.55, 0.65, name, size=16, color=WHITE, font=HEAD, line=0.95)
    text(s, x + 0.3, 4.88, mw - 0.55, 0.55, sub, size=13, color=BODY_C)
text(s, 0.75, 5.8, 2.2, 0.85, [[("6", {"size": 34, "color": AMBER, "font": HEAD})],
                               [("competencias", {"size": 14, "color": BODY_C})]], anchor=MID)
comps = ["Pensamiento crítico", "Investigación científica", "STEM", "Competencia digital",
         "Autonomía y constancia", "Conciencia ambiental"]
pw = (11.83 - 2.2 - 2 * 0.15) / 3
for i, c in enumerate(comps):
    x = 2.95 + (i % 3) * (pw + 0.15)
    y = 5.78 + (i // 3) * 0.5
    card(s, x, y, pw, 0.4, radius=0.2)
    text(s, x, y, pw, 0.4, c, size=13, color=WHITE, align=C, anchor=MID)
notes(s, """
🎤 YARELI · 2:25 – 2:55
"Detrás del kit hay un programa curricular para niñas y niños de 6 a 14 años, adaptado por edades, con tres metodologías activas: proyectos, juegos y experimentación, según la etapa de operaciones concretas de Piaget. Avanza en cuatro módulos: Exploradores de la naturaleza, Pequeños científicos, Creadores de soluciones y Aprendemos y compartimos. Y desarrolla seis competencias, del pensamiento crítico a la conciencia ambiental."
""")

# ── 8 · Modelo de negocio ────────────────────────────────────────────────
s = new_slide()
header(s, 7, "MODELO DE NEGOCIO", "B2B como motor, B2C como complemento")
picture(s, GLOW_EMERALD, -0.6, 0.6, 5.0, 4.2, name="Brillo B2B")
for y, h, acc, ic, badge, bcol, bfill, bline, ttl, body, hero in [
    (1.85, 2.6, "e", "School", "MODELO PRINCIPAL", EMERALD_HI, "0B2A26", "155E4B", "B2B · Escuelas de nivel básico",
     "Venta institucional de kits + acceso a la plataforma para laboratorios de ciencias, proyectos "
     "escolares y programas STEM.", True),
    (4.65, 2.1, "a", "House", "COMPLEMENTARIO", AMBER, "2A2112", "5C4516", "B2C · Familias",
     "Venta directa de kits para aprendizaje práctico en el hogar.", False)]:
    card(s, 0.75, y, 6.0, h, line=EMERALD if hero else BORDER, lw=1.5 if hero else 0.75)
    tile(s, 1.1, y + 0.35, 0.75, acc, ic)
    pill(s, 4.55, y + 0.38, 1.9, 0.34, badge, bcol, bfill, line=bline, size=9, spc=1.2)
    text(s, 1.1, y + 1.22, 5.3, 0.45, ttl, size=20, color=WHITE, font=HEAD)
    text(s, 1.1, y + 1.68, 5.3, 0.8, body, size=14, color=BODY_C)
eyebrow(s, 7.1, 1.85, "MOTOR COMERCIAL", SKY)
motor = [("s", "Megaphone", "Canales", "Contacto directo, alianzas educativas, presentaciones y redes"),
         ("a", "Coins", "Ingresos", "Venta directa de kits y paquetes escolares"),
         ("e", "Package", "Estructura de costos", "Insumos, empaque biodegradable, armado, distribución y app")]
for i, (acc, ic, ttl, body) in enumerate(motor):
    y = 2.25 + i * 1.42
    card(s, 7.1, y, 5.48, 1.27)
    tile(s, 7.38, y + 0.3, 0.66, acc, ic)
    text(s, 8.3, y + 0.17, 4.1, 0.4, ttl, size=17, color=WHITE, font=HEAD)
    text(s, 8.3, y + 0.56, 4.1, 0.6, body, size=14, color=BODY_C)
text(s, 7.1, 6.5, 5.48, 0.3, "Precios validados con cotizaciones y pruebas piloto.", size=12, color=MUTED,
     italic=True)
notes(s, """
🎤 ALEJANDRA · 2:55 – 3:15
"Nuestro motor es B2B: vendemos kits y acceso a la plataforma a escuelas de nivel básico para sus laboratorios, proyectos y programas STEM. Como complemento, en B2C vendemos el kit a familias. Llegamos por contacto directo, alianzas educativas, presentaciones y redes; y nuestros costos —insumos, empaque, armado, distribución y app— los validamos con cotizaciones y pruebas piloto."
""")

# ── 9 · Ventaja competitiva ──────────────────────────────────────────────
s = new_slide()
header(s, 8, "VENTAJA COMPETITIVA", "¿Por qué CultivaT?")
crit = ["Contacto real con la tierra", "Seguimiento digital", "Currículo STEM de 4 módulos",
        "Identidad agro-sinaloense", "Seguimiento escolar"]
cols = [("Kits de germinación", "Solo físico", [1, 0, 0, 0, 0], False),
        ("Apps de jardinería", "Solo pantalla", [0, 1, 0, 0, 0], False),
        ("CultivaT", "Ecosistema phygital", [1, 1, 1, 1, 1], True)]
cx0, colw, cgap = 4.55, 2.55, 0.2
picture(s, GLOW_EMERALD, cx0 + 2 * (colw + cgap) - 1.2, 1.0, colw + 2.4, 6.0, name="Brillo CultivaT")
for j, (ttl, sub, marks, hero) in enumerate(cols):
    x = cx0 + j * (colw + cgap)
    card(s, x, 1.8, colw, 4.95, line=EMERALD if hero else BORDER, lw=1.5 if hero else 0.75)
    text(s, x, 2.0, colw, 0.4, ttl, size=17 if not hero else 20, color=WHITE if not hero else EMERALD_HI,
         font=HEAD, align=C)
    text(s, x, 2.42, colw, 0.3, sub, size=12, color=MUTED, align=C)
    for i, ok in enumerate(marks):
        y = 3.2 + i * 0.7
        d = 0.42
        shape(s, OVAL, x + colw / 2 - d / 2, y + 0.06, d, d, fill=TINT["e"] if ok else TINT["d"])
        icon(s, ("Check-m" if ok else "X-d"), x + colw / 2 - 0.13, y + 0.14, 0.26)
text(s, 0.75, 2.0, 3.6, 0.3, "CRITERIO", size=11, color=MUTED, bold=True, spc=2.5)
text(s, 0.75, 2.32, 3.5, 0.75, "Tierra real + pantalla + aula", size=18, color=WHITE, font=HEAD)
for i, c in enumerate(crit):
    y = 3.2 + i * 0.7
    text(s, 0.75, y, 3.6, 0.55, c, size=15, color=BODY_C, anchor=MID)
    if i:
        line(s, 0.75, y - 0.08, 4.35, y - 0.08, BORDER, 0.75)
notes(s, """
🎤 ALEJANDRA · 3:15 – 3:30
"Los kits tradicionales de germinación son solo físicos y se abandonan; las apps de jardinería son solo pantalla. CultivaT es el ecosistema que une tierra real, seguimiento digital, un currículo STEM de cuatro módulos, identidad agro-sinaloense y seguimiento escolar."
""")

# ── 10 · Impacto y ODS ───────────────────────────────────────────────────
s = new_slide()
header(s, 9, "IMPACTO SOCIAL Y AMBIENTAL", "Revalorar el campo, sembrar vocaciones",
       sub="Acercar a las nuevas generaciones de Sinaloa al trabajo agrícola y a las carreras agro-STEM.")
ods = [("4", "4.7", "C5192D", "GraduationCap", "Educación de calidad",
        "Aprendizaje práctico de biología, agricultura y sostenibilidad."),
       ("15", "15.5", "56C02B", "Trees", "Vida de ecosistemas terrestres",
        "Protección de la biodiversidad y respeto por los seres vivos."),
       ("12", "12.5", "BF8B2E", "Recycle", "Producción y consumo responsables",
        "Maceta biodegradable y reducción de residuos."),
       ("13", "13.3", "3F7E44", "CloudSun", "Acción por el clima",
        "Educación climática aplicada con hábitos cotidianos.")]
ow = (11.83 - 3 * 0.2) / 4
for i, (num, meta, col, ic, name, desc) in enumerate(ods):
    x = 0.75 + i * (ow + 0.2)
    card(s, x, 2.3, ow, 4.45, line=col, lw=1.5, name=f"ODS {num}")
    tile(s, x + 0.35, 2.65, 0.8, "e", ic, fill=col, icon_key="w")
    text(s, x + 0.35, 3.65, ow - 0.6, 0.6, f"ODS {num}", size=28, color=WHITE, font=HEAD)
    text(s, x + 0.35, 4.25, ow - 0.6, 0.3, f"META {meta}", size=11, color=MUTED, bold=True, spc=2)
    text(s, x + 0.35, 4.62, ow - 0.6, 0.95, name, size=16, color=WHITE, font=HEAD, line=0.95)
    text(s, x + 0.35, 5.62, ow - 0.6, 1.0, desc, size=14, color=BODY_C)
notes(s, """
🎤 MAJO · 3:30 – 4:10
"Nuestro impacto social es revalorar el trabajo agrícola de Sinaloa y acercar a las nuevas generaciones a las carreras agro-STEM. Y nos alineamos con cuatro ODS: el 4, educación de calidad, con aprendizaje práctico; el 15, vida de ecosistemas terrestres, con respeto por los seres vivos; el 12, producción y consumo responsables, con nuestra maceta biodegradable; y el 13, acción por el clima, con hábitos cotidianos. Y para verlo en acción, les presento a Sergio."
""")

# ── 11 · Demo en vivo y cierre ───────────────────────────────────────────
s = new_slide()
picture(s, GRID, 0, 0, 13.333, 7.5, name="Retícula")
picture(s, GLOW_EMERALD, 6.9, -0.2, 7.6, 7.6, name="Brillo QR")
lh = 1.6
picture(s, LOGO, 0.75, 0.65, lh * 900 / 730, lh, name="Logo CultivaT", alt="Logo oficial de CultivaT")
eyebrow(s, 0.75, 2.6, f"{TOTAL - 1:02d} — DEMO EN VIVO")
text(s, 0.75, 2.92, 7.0, 0.85, "Conoce CultivaT en acción", size=40, color=WHITE, font=HEAD, anchor=MID)
text(s, 0.75, 3.8, 7.0, 0.4, "Escanea el código QR para explorar la plataforma.", size=18, color=BODY_C)
card(s, 0.75, 4.45, 5.4, 0.55, fill="0E2236", line="1D4A6B", radius=0.27)
text(s, 0.75, 4.45, 5.4, 0.55, "cultivatecmi.github.io/CultivaT", size=16, color=SKY, bold=True, align=C,
     anchor=MID, name="Enlace")
text(s, 0.75, 5.55, 7.0, 0.55, "Cultivando conciencia, cosechando futuro", size=24, color=AMBER, font=HEAD)
text(s, 0.75, 6.12, 7.0, 0.35, "Enactus Tecmilenio Campus Culiacán", size=14, color=MUTED, spc=1)
card(s, 8.15, 1.2, 4.43, 4.95, fill="FFFFFF", line="A7F3D0", lw=1.5, radius=0.2, name="Tarjeta QR")
picture(s, QR, 8.37, 1.42, 4.0, 4.0, name="Código QR", alt="Código QR a https://cultivatecmi.github.io/CultivaT/")
text(s, 8.15, 5.5, 4.43, 0.4, "ESCANÉAME", size=12, color="0F766E", bold=True, align=C, spc=3)
text(s, 11.33, 7.03, 1.25, 0.25, f"{TOTAL:02d} / {TOTAL}", size=10, color=MUTED, align=R, spc=1)
notes(s, """
🎤 SERGIO · 4:10 – 8:00 · DEMO EN VIVO Y CIERRE
• 4:10 – 4:25 · "Escaneen el código para explorar la plataforma mientras se las muestro."
• 4:25 – 7:20 · Demostración en vivo desde la app o el video.
• 7:20 – 8:00 · Cierre: "Somos Alejandra, Maide, Yareli, Majo y Sergio, y esto es CultivaT: cultivando conciencia, cosechando futuro. ¡Gracias!"
• 8:00 – 12:00 · Preguntas del jurado: dejar esta diapositiva con el QR visible.
Plan B sin internet: video de la demo descargado o el Modo Presentación (?demo=true).
""")

out = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT  # ruta opcional, p. ej. si el .pptx está abierto
prs.save(str(out))
print("Listo:", out)
