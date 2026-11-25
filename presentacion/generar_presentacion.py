# -*- coding: utf-8 -*-
"""
Genera Presentacion_CultivaT_Enactus.pptx (10 diapositivas, 8:00 min) en la raíz
del repo para la eliminatoria regional Enactus · Universidad Tecmilenio Campus
Culiacán. No muestra funciones de la app: eso se ve en la demo en vivo (4:10–7:35).

Uso (desde la raíz del repo):
    python -m pip install python-pptx Pillow
    node presentacion/generar_iconos.cjs      # solo si faltan los iconos
    python presentacion/generar_presentacion.py

Los recuadros punteados son imágenes de relleno: clic derecho →
"Cambiar imagen" para poner la foto real sin mover el diseño.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
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
PH_DIR = HERE / "assets" / "placeholders"
LOGO = ROOT / "public" / "logo.png"
QR = ROOT / "design" / "qr-cultivat.png"
OUT = ROOT / "Presentacion_CultivaT_Enactus.pptx"

# Paleta oficial
CREAM, FOREST, SPROUT, SUN, EARTH = "FFFBEB", "15803D", "22C55E", "F59E0B", "422006"
WHITE, MINT, SAND, MUTED = "FFFFFF", "DCFCE7", "FEF3C7", "8A6A4F"
SUN_DARK, SUN_LIGHT = "B45309", "FCD34D"
HEAD, BODY = "Arial Rounded MT Bold", "Calibri"
FONT_DIR = Path(r"C:\Windows\Fonts")

L, C, R = PP_ALIGN.LEFT, PP_ALIGN.CENTER, PP_ALIGN.RIGHT
TOP, MID = MSO_ANCHOR.TOP, MSO_ANCHOR.MIDDLE
RRECT, OVAL = MSO_SHAPE.ROUNDED_RECTANGLE, MSO_SHAPE.OVAL


def rgb(h):
    return RGBColor.from_string(h)


# ───────────────────────── utilidades de dibujo ─────────────────────────
def text(slide, x, y, w, h, paras, size=20, color=EARTH, font=BODY, bold=False, italic=False,
         align=L, anchor=TOP, line=None, name=None):
    """paras: str | [str | [(texto, {opciones})]]"""
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
    return box


def set_shadow(shp, on):
    spPr = shp._element.spPr
    for e in spPr.findall("{http://schemas.openxmlformats.org/drawingml/2006/main}effectLst"):
        spPr.remove(e)
    if on:
        xml = ('<a:effectLst %s><a:outerShdw blurRad="203200" dist="50800" dir="5400000" algn="t" '
               'rotWithShape="0"><a:srgbClr val="422006"><a:alpha val="13000"/></a:srgbClr>'
               '</a:outerShdw></a:effectLst>' % nsdecls("a"))
    else:
        xml = '<a:effectLst %s/>' % nsdecls("a")
    spPr.append(parse_xml(xml))


def shape(slide, kind, x, y, w, h, fill=None, line=None, lw=1.75, dash=False, radius=None,
          shadow=False, name=None):
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
    set_shadow(s, shadow)
    return s


def card(slide, x, y, w, h, fill=WHITE, radius=0.28, shadow=True, **kw):
    return shape(slide, RRECT, x, y, w, h, fill=fill, radius=radius, shadow=shadow, **kw)


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


def badge(slide, cx, cy, d, fill, ic=None, k=0.52):
    shape(slide, OVAL, cx - d / 2, cy - d / 2, d, d, fill=fill)
    if ic:
        icon(slide, ic, cx - d * k / 2, cy - d * k / 2, d * k)


def arrow(slide, x1, y1, x2, y2, color=SUN, w=3.5, head=True):
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


def header(slide, title, tagline=None, n=None):
    text(slide, 0.6, 0.42, 12.1, 0.75, title, size=34, color=FOREST, font=HEAD, anchor=MID, name="Título")
    if tagline:
        text(slide, 0.6, 1.2, 12.1, 0.5, tagline, size=20, color=EARTH, italic=True, name="Mensaje clave")
    if n:
        text(slide, 11.73, 7.0, 1.0, 0.3, str(n), size=11, color=MUTED, align=R, name="Número")


# ───────────────────── recuadros de foto (reemplazables) ─────────────────────
def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def placeholder(key, w, h, title, fill=SAND, border=FOREST, fg=EARTH, ic="ImagePlus-g"):
    S = 120
    W, H = int(w * S), int(h * S)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(min(0.25 * S, min(W, H) / 4))
    d.rounded_rectangle([0, 0, W - 1, H - 1], r, fill=hexrgb(fill) + (255,))
    lw, inset = 4, 10
    x0, y0, x1, y1 = inset, inset, W - 1 - inset, H - 1 - inset
    rr = max(6, r - inset)
    bc = hexrgb(border)
    dash, gap = 18, 12

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

    ts = int(max(18, min(32, min(W, H) * 0.075)))
    ft = ImageFont.truetype(str(FONT_DIR / "ARLRDBD.TTF"), ts)
    fs = ImageFont.truetype(str(FONT_DIR / "calibri.ttf"), int(ts * 0.75))
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

    if H < 1.4 * S:  # recuadro bajo: icono a la izquierda
        isz = int(H * 0.42)
        ic_img = Image.open(ICONS / f"{ic}.png").convert("RGBA").resize((isz, isz))
        px = int(0.22 * S)
        img.alpha_composite(ic_img, (px, (H - isz) // 2))
        tx = px + isz + 16
        lines = wrap(title, ft, W - tx - px)
        block = len(lines) * ts * 1.15 + ts * 0.9
        ty = (H - block) / 2
        for ln in lines:
            d.text((tx, ty), ln, font=ft, fill=hexrgb(fg))
            ty += ts * 1.15
        d.text((tx, ty + 2), sub, font=fs, fill=hexrgb(MUTED))
    else:
        isz = int(max(44, min(110, min(W, H) * 0.2)))
        ic_img = Image.open(ICONS / f"{ic}.png").convert("RGBA").resize((isz, isz))
        lines = wrap(title, ft, W * 0.82)
        block = isz + 18 + len(lines) * ts * 1.2 + 10 + ts * 0.9
        ty = (H - block) / 2
        img.alpha_composite(ic_img, ((W - isz) // 2, int(ty)))
        ty += isz + 18
        for ln in lines:
            d.text((W / 2, ty), ln, font=ft, fill=hexrgb(fg), anchor="ma")
            ty += ts * 1.2
        d.text((W / 2, ty + 10), sub, font=fs, fill=hexrgb(MUTED), anchor="ma")

    PH_DIR.mkdir(parents=True, exist_ok=True)
    path = PH_DIR / f"{key}.png"
    img.save(path)
    return path


def photo_slot(slide, key, x, y, w, h, title, **kw):
    path = placeholder(key, w, h, title, **kw)
    return picture(slide, path, x, y, w, h, name=f"Reemplazar: {title}", alt=f"Espacio para {title}")


# ───────────────────────────── gráficas ─────────────────────────────
def style_chart(chart, size=16):
    chart.has_legend = False
    chart.font.size = Pt(size)
    chart.font.name = BODY
    chart.font.color.rgb = rgb(EARTH)


def label_point(point, txt, size=20, color=EARTH, pos=None, bold=True):
    dl = point.data_label
    tf = dl.text_frame
    tf.text = txt  # "\n" = segunda línea más pequeña
    for i, p in enumerate(tf.paragraphs):
        for r in p.runs:
            r.font.size = Pt(size if i == 0 else size - 6)
            r.font.bold = bold
            r.font.name = BODY
            r.font.color.rgb = rgb(color)
    if pos is not None:
        dl.position = pos


# ════════════════════════════ PRESENTACIÓN ════════════════════════════
import shutil

shutil.rmtree(PH_DIR, ignore_errors=True)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
prs.core_properties.title = "CultivaT · Enactus Tecmilenio Campus Culiacán"
prs.core_properties.author = "Equipo CultivaT"


def new_slide(bg=CREAM):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb(bg)
    return s


# ── 1 · Portada (0:00 – 0:15 · Alejandra) ───────────────────────────────
s = new_slide()
shape(s, RRECT, 7.35, -0.6, 6.8, 8.7, fill=FOREST, radius=0.7, name="Panel verde")
lh = 4.3
lw_ = lh * 900 / 730
picture(s, LOGO, 3.8 - lw_ / 2, 0.55, lw_, lh, name="Logo CultivaT", alt="Logo oficial de CultivaT")
text(s, 0.6, 5.0, 6.4, 1.0, ["Cultivando conciencia,", "cosechando futuro"], size=28, color=FOREST,
     font=HEAD, align=C, name="Lema")
photo_slot(s, "emblema-enactus", 2.0, 6.25, 3.6, 0.85, "Emblema Enactus Tecmilenio Campus Culiacán",
           fill=WHITE, border=FOREST, ic="Award-g")
photo_slot(s, "foto-kit-portada", 8.1, 0.75, 4.6, 5.3, "Foto del kit físico CultivaT",
           fill=CREAM, border=SUN, ic="Package-g")
text(s, 8.1, 6.3, 4.6, 0.45, "Kit físico + plataforma digital", size=20, color=WHITE, bold=True, align=C)
notes(s, """
🎤 ALEJANDRA · 0:00 – 0:15 (15 s)

"Buenos días, jurado. Somos el equipo Enactus de Tecmilenio Campus Culiacán y venimos a presentarles CultivaT: un proyecto que nace aquí, en el corazón agrícola de México, para cultivar conciencia y cosechar futuro."

▶ Tener el kit físico en la mano desde el primer segundo.
""")

# ── 2 · Identidad y doble sentido (0:15 – 0:35 · Alejandra) ─────────────
s = new_slide()
header(s, "Un nombre, dos sentidos", n=2)
for x, fill, bfill, ic, word, wcol, desc in [
    (0.6, MINT, FOREST, "Sprout-w", "Cultiva", FOREST, "Siembra una planta real"),
    (7.13, SAND, SUN, "Lightbulb-b", "Cultívate", SUN_DARK, "Crece en curiosidad y responsabilidad"),
]:
    card(s, x, 1.8, 5.6, 3.5, fill=fill, shadow=False, radius=0.32)
    badge(s, x + 1.15, 2.95, 1.3, bfill, ic)
    text(s, x + 0.5, 3.85, 4.8, 0.8, word, size=48, color=wcol, font=HEAD)
    text(s, x + 0.5, 4.62, 4.8, 0.5, desc, size=20, color=EARTH)
badge(s, 6.665, 3.55, 0.9, SUN)
text(s, 6.215, 3.1, 0.9, 0.9, "+", size=40, color=WHITE, font=HEAD, align=C, anchor=MID)
card(s, 0.6, 5.65, 12.13, 1.0, fill=WHITE, radius=0.3, name="Paleta")
for x, col, lab in [(1.0, FOREST, "Verde crecimiento"), (5.0, EARTH, "Café tierra"),
                    (9.0, SUN, "Amarillo sol sinaloense")]:
    badge(s, x + 0.3, 6.15, 0.6, col)
    text(s, x + 0.8, 5.85, 3.2, 0.6, lab, size=18, color=EARTH, bold=True, anchor=MID)
notes(s, """
🎤 ALEJANDRA · 0:15 – 0:35 (20 s)

"Nuestro nombre tiene doble sentido. 'Cultiva' es la invitación a sembrar una planta real con tus propias manos. 'Cultívate' es crecer por dentro: en curiosidad y en responsabilidad. Por eso nuestros colores son el verde del crecimiento, el café de la tierra y el amarillo del sol sinaloense."

▶ Pasa la palabra a Maide.
""")

# ── 3 · El problema en Sinaloa (0:35 – 1:15 · Maide) ────────────────────
s = new_slide()
header(s, "El problema en Sinaloa", n=3)
for y, ic, num, lab in [(1.75, "Wheat-b", "1,485,405", "hectáreas agrícolas en Sinaloa"),
                        (4.3, "Users-b", "590,328", "trabajadores del campo")]:
    card(s, 0.6, y, 4.6, 2.3, fill=EARTH, shadow=False, radius=0.3)
    badge(s, 1.3, y + 0.62, 0.75, SUN, ic)
    text(s, 0.95, y + 1.05, 4.0, 0.75, num, size=44, color=SUN, font=HEAD, anchor=MID)
    text(s, 0.95, y + 1.78, 4.0, 0.4, lab, size=18, color=CREAM)

cd = CategoryChartData()
cd.categories = ["Productores agrícolas +65 años", "+2 h/día sin actividad física",
                 "Niños 6–11 usan internet"]
cd.add_series("Porcentaje", (27, 65, 79.7))
gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(5.6), Inches(1.75), Inches(7.13),
                        Inches(4.75), cd)
gf.name = "Gráfica INEGI (editable)"
ch = gf.chart
style_chart(ch, 18)
ch.has_title = False
plot = ch.plots[0]
plot.gap_width = 55
plot.vary_by_categories = False
va = ch.value_axis
va.minimum_scale, va.maximum_scale = 0, 128
va.has_major_gridlines = False
va.visible = False
ca = ch.category_axis
ca.major_tick_mark = XL_TICK_MARK.NONE
ca.format.line.fill.background()
ca.tick_labels.font.size = Pt(18)
ca.tick_labels.font.color.rgb = rgb(EARTH)
ser = plot.series[0]
for i, (col, lab) in enumerate([(SUN, "27 %"), (FOREST, ">65 %"), (FOREST, "79.7 %\n2.6 h/día")]):
    pt = ser.points[i]
    pt.format.fill.solid()
    pt.format.fill.fore_color.rgb = rgb(col)
    label_point(pt, lab, size=22, pos=XL_LABEL_POSITION.OUTSIDE_END)
text(s, 5.6, 6.6, 7.13, 0.3, "Fuente: INEGI · Censo Agropecuario 2022 · ENDUTIH 2024", size=11,
     color=MUTED, italic=True)
notes(s, """
🎤 MAIDE · 0:35 – 1:15 (40 s)

"Sinaloa es el granero de México: un millón 485 mil hectáreas agrícolas y 590 mil 328 personas que trabajan en el campo, según el INEGI.

Pero hay dos realidades que nos preocupan. Primero, el campo está envejeciendo: en México, 27 de cada 100 productores agrícolas ya tienen más de 65 años. ¿Quién va a tomar su lugar?

Segundo, nuestros niños están en otro mundo: el 79.7 % de los niños de 6 a 11 años usa internet, en promedio 2.6 horas al día, y más del 65 % pasa más de dos horas diarias frente a pantallas, sin la actividad física recomendada.

Tenemos un campo que envejece… y una infancia atrapada en pantallas."

▶ Señalar primero las tarjetas cafés (campo) y luego la gráfica (pantallas).
""")

# ── 4 · Oportunidad y validación (1:15 – 1:40 · Maide) ──────────────────
s = new_slide()
header(s, "Oportunidad y validación", n=4)
nodes = [(2.6, FOREST, "Smartphone-w", "Pantalla", "canal natural"),
         (6.67, SUN, "Heart-b", "Vínculo emocional", "con la naturaleza"),
         (10.73, FOREST, "Leaf-w", "Conductas ecológicas", "que perduran")]
for cx, fill, ic, t1, t2 in nodes:
    badge(s, cx, 2.6, 1.55, fill, ic)
    text(s, cx - 1.9, 3.6, 3.8, 0.5, t1, size=22, color=FOREST, font=HEAD, align=C)
    text(s, cx - 1.9, 4.1, 3.8, 0.4, t2, size=18, color=EARTH, align=C)
arrow(s, 3.63, 2.6, 5.64, 2.6, SUN, 4.5)
arrow(s, 7.70, 2.6, 9.70, 2.6, SUN, 4.5)
shape(s, RRECT, 1.4, 4.85, 10.53, 1.95, fill=SAND, line=SUN, lw=2.25, dash=True, radius=0.3,
      name="Testimonio (completar)")
badge(s, 2.3, 5.825, 1.0, SUN, "Quote-b")
text(s, 3.2, 5.0, 8.4, 1.65,
     [[("[COMPLETAR: Pegar aquí testimonio corto de mamá o maestra de Culiacán]", {"italic": True})],
      [("— Nombre, mamá / maestra · Culiacán", {"size": 16, "color": MUTED, "italic": False})]],
     size=22, anchor=MID, name="Texto del testimonio")
notes(s, """
🎤 MAIDE · 1:15 – 1:40 (25 s)

"Pero ahí está la oportunidad. La pantalla ya es el canal natural de los niños: en lugar de pelear contra ella, la usamos para crear un vínculo emocional con la naturaleza. Y ese vínculo se convierte en conductas ecológicas que perduran.

Así nos lo confirmó [NOMBRE], [mamá / maestra] de Culiacán: '[LEER TESTIMONIO]'."

▶ Pasa la palabra a Yareli.
""")

# ── 5 · La solución: el kit físico (1:40 – 2:25 · Yareli) ───────────────
s = new_slide()
header(s, "La solución: el kit físico",
       "Experiencia híbrida para hogar y escuela: la pantalla como puente hacia la tierra.", n=5)
photo_slot(s, "foto-kit", 4.67, 1.95, 4.0, 4.85, "Foto o render del kit físico",
           fill=SAND, border=FOREST, ic="Package-g")
labels = [("Recycle-w", "Maceta biodegradable"), ("Shovel-w", "Tierra preparada"),
          ("Sprout-w", "Fertilizante orgánico"), ("Droplets-w", "Envase regadera"),
          ("Wheat-w", "Semillas"), ("QrCode-w", "Guía ilustrada y tarjeta QR")]
for i, (ic, lab) in enumerate(labels):
    left = i < 3
    x = 0.6 if left else 9.13
    y = 2.05 + (i % 3) * 1.62
    card(s, x, y, 3.6, 1.25, radius=0.28)
    badge(s, x + 0.62, y + 0.625, 0.8, FOREST if left else SUN_DARK, ic)
    text(s, x + 1.2, y, 2.25, 1.25, lab, size=19, color=EARTH, bold=True, anchor=MID)
    if left:
        arrow(s, 4.2, y + 0.625, 4.67, y + 0.625, SUN, 2.5, head=False)
    else:
        arrow(s, 8.67, y + 0.625, 9.13, y + 0.625, SUN, 2.5, head=False)
notes(s, """
🎤 YARELI · 1:40 – 2:25 (45 s)

"Nuestra solución empieza con algo que se puede tocar: el Kit CultivaT.

Trae una maceta biodegradable, tierra preparada, fertilizante orgánico, un envase que funciona como regadera, semillas y una guía ilustrada con una tarjeta QR.

Con él, cada niño siembra y cuida una planta real, en casa o en el salón. Y la tarjeta QR lo conecta con nuestra plataforma digital, que Sergio les mostrará en unos minutos.

Es una experiencia híbrida para el hogar y la escuela, donde la pantalla deja de ser un obstáculo y se convierte en el puente hacia la tierra."

▶ Levantar el kit y mostrar cada elemento mientras se menciona.
""")

# ── 6 · Respaldo pedagógico y programa formativo (2:25 – 2:55 · Yareli) ─
s = new_slide()
header(s, "Respaldo pedagógico y programa formativo", n=6)
cw = (12.13 - 2 * 0.3) / 3
top = [("Users-w", FOREST, "6 a 14 años", "Grupos: 6–8 · 9–10 · 11–14"),
       ("FlaskConical-w", SUN_DARK, "ABP + ABJ + Piaget", "Proyectos · Juegos · Experimentación"),
       ("Target-w", EARTH, "6 competencias clave",
        "Pensamiento crítico · Investigación · STEM · Digital · Responsabilidad · Conciencia ambiental")]
for i, (ic, bfill, t1, t2) in enumerate(top):
    x = 0.6 + i * (cw + 0.3)
    card(s, x, 1.75, cw, 2.35, radius=0.28)
    badge(s, x + 0.7, 2.45, 0.85, bfill, ic)
    text(s, x + 1.3, 2.05, cw - 1.45, 0.8, t1, size=22, color=FOREST, font=HEAD, anchor=MID)
    text(s, x + 0.35, 3.05, cw - 0.6, 0.95, t2, size=16, color=EARTH)
text(s, 0.6, 4.35, 6.0, 0.4, "Programa formativo · 4 módulos", size=18, color=FOREST, font=HEAD)
mods = [("Compass-g", "Exploradores", SAND, EARTH), ("FlaskConical-g", "Pequeños Científicos", MINT, EARTH),
        ("Cpu-b", "Creadores STEM", SPROUT, EARTH), ("Users-w", "Aprendemos y Compartimos", FOREST, WHITE)]
mw = (12.13 - 3 * 0.45) / 4
for i, (ic, name, fill, tcol) in enumerate(mods):
    x = 0.6 + i * (mw + 0.45)
    card(s, x, 4.85, mw, 1.95, fill=fill, shadow=False, radius=0.25, name=f"Módulo {i + 1}")
    badge(s, x + 0.5, 5.33, 0.58, WHITE)
    text(s, x + 0.21, 5.04, 0.58, 0.58, str(i + 1), size=20, color=EARTH, font=HEAD, align=C, anchor=MID)
    icon(s, ic, x + mw - 0.75, 5.08, 0.5)
    text(s, x + 0.25, 5.8, mw - 0.4, 0.85, name, size=20, color=tcol, font=HEAD, anchor=MID)
    if i < 3:
        arrow(s, x + mw + 0.07, 5.825, x + mw + 0.38, 5.825, SUN, 3)
notes(s, """
🎤 YARELI (o apoyo) · 2:25 – 2:55 (30 s)

"Y no es solo un kit: es un programa formativo. Está pensado para niños de 6 a 14 años, en tres grupos de edad, y combina el Aprendizaje Basado en Proyectos, el Aprendizaje Basado en Juegos y la experimentación de Piaget.

Desarrolla seis competencias clave: pensamiento crítico, investigación, STEM, competencia digital, responsabilidad y conciencia ambiental.

Y avanza en cuatro módulos: Exploradores, Pequeños Científicos, Creadores STEM, y Aprendemos y Compartimos."

▶ Pasa la palabra a Alejandra.
""")

# ── 7 · Modelo de negocio y ventaja competitiva (2:55 – 3:30 · Alejandra)
s = new_slide()
header(s, "Modelo de negocio y ventaja competitiva", n=7)
card(s, 0.6, 2.35, 2.15, 2.1, fill=FOREST, shadow=False, radius=0.28, name="CultivaT")
icon(s, "Sprout-w", 1.35, 2.55, 0.65)
text(s, 0.6, 3.3, 2.15, 0.5, "CultivaT", size=22, color=WHITE, font=HEAD, align=C)
text(s, 0.6, 3.8, 2.15, 0.4, "Kit + programa", size=16, color=MINT, align=C)
for y, bfill, ic, t1, t2 in [(1.75, FOREST, "School-w", "B2B · Escuelas", "Nivel básico · fuente principal"),
                             (3.6, SUN, "House-b", "B2C · Familias", "Kit para aprender en casa")]:
    card(s, 3.35, y, 4.4, 1.55, radius=0.28)
    badge(s, 4.1, y + 0.775, 0.95, bfill, ic)
    text(s, 4.8, y + 0.2, 2.85, 0.55, t1, size=22, color=FOREST, font=HEAD, anchor=MID)
    text(s, 4.8, y + 0.78, 2.85, 0.6, t2, size=16, color=EARTH)
arrow(s, 2.75, 3.0, 3.35, 2.525, SUN, 3)
arrow(s, 2.75, 3.8, 3.35, 4.375, SUN, 3)
text(s, 8.2, 1.75, 4.53, 0.45, "Estructura piloto", size=18, color=FOREST, font=HEAD)
tshape = s.shapes.add_table(4, 2, Inches(8.2), Inches(2.3), Inches(4.53), Inches(2.2))
tshape.name = "Tabla de costos (editar)"
tbl = tshape.table
tbl.columns[0].width = Inches(2.55)
tbl.columns[1].width = Inches(1.98)
tbl.horz_banding = False
rows = [("Concepto", "Monto"), ("Costo unitario kit", "[EDITAR]"),
        ("Precio venta B2B", "[EDITAR]"), ("Margen estimado", "[EDITAR]")]
for ri, row in enumerate(rows):
    tbl.rows[ri].height = Inches(0.55)
    for ci, val in enumerate(row):
        cell = tbl.cell(ri, ci)
        cell.fill.solid()
        cell.fill.fore_color.rgb = rgb(FOREST if ri == 0 else (WHITE if ri % 2 else SAND))
        cell.vertical_anchor = MID
        cell.margin_left = cell.margin_right = Inches(0.14)
        cell.margin_top = cell.margin_bottom = Inches(0.03)
        p = cell.text_frame.paragraphs[0]
        p.alignment = L if ci == 0 else C
        r = p.add_run()
        r.text = val
        r.font.size = Pt(18)
        r.font.name = BODY
        r.font.bold = ri == 0 or ci == 1
        r.font.color.rgb = rgb(WHITE if ri == 0 else (SUN_DARK if ci == 1 else EARTH))
text(s, 8.2, 4.6, 4.53, 0.35, "MXN por kit · actualizar tras cotización", size=12, color=MUTED, italic=True)
card(s, 0.6, 5.65, 12.13, 1.2, fill=FOREST, shadow=False, radius=0.28, name="Ventaja competitiva")
badge(s, 1.25, 6.25, 0.8, SUN, "Award-b")
text(s, 1.9, 5.72, 10.55, 1.06,
     [[("Ventaja competitiva: ", {"bold": True, "color": SUN_LIGHT}),
       ("frente a kits tradicionales que se abandonan o apps aisladas, CultivaT une biología real, "
        "entorno local y seguimiento escolar.", {})]],
     size=19, color=WHITE, anchor=MID)
notes(s, """
🎤 ALEJANDRA · 2:55 – 3:30 (35 s)

"¿Cómo lo hacemos sostenible? Con un modelo híbrido. Nuestra fuente principal es B2B: vendemos el kit y el programa a escuelas de nivel básico. Y en B2C llegamos a las familias que quieren el kit en casa.

En nuestro piloto, cada kit cuesta [MENCIONAR costo], lo vendemos a las escuelas en [MENCIONAR precio] y nos deja un margen de [MENCIONAR margen].

¿Nuestra ventaja? Los kits tradicionales se abandonan y las apps aíslan. CultivaT une biología real, entorno local y seguimiento escolar."

▶ Antes de la competencia: llenar la tabla con la cotización real. Pasa la palabra a Majo.
""")

# ── 8 · Impacto social y ambiental (3:30 – 4:10 · Majo) ─────────────────
s = new_slide()
header(s, "Impacto social y ambiental",
       "Revalorar el trabajo de nuestros agricultores y formar conciencia ambiental desde la infancia.", n=8)
ods = [(4, "C5192D", "GraduationCap-w", "Educación de calidad", "Ciencia práctica desde primaria"),
       (15, "56C02B", "Trees-w", "Vida de ecosistemas terrestres", "Cuidar un ser vivo real"),
       (12, "BF8B2E", "Recycle-w", "Producción y consumo responsables", "Maceta biodegradable"),
       (13, "3F7E44", "CloudSun-w", "Acción por el clima", "Conciencia climática local")]
cw = (12.13 - 3 * 0.3) / 4
for i, (num, col, ic, name, how) in enumerate(ods):
    x = 0.6 + i * (cw + 0.3)
    card(s, x, 1.95, cw, 4.85, radius=0.3, name=f"ODS {num}")
    badge(s, x + cw / 2, 3.0, 1.3, col, ic)
    text(s, x, 3.85, cw, 0.55, f"ODS {num}", size=30, color=EARTH, font=HEAD, align=C)
    text(s, x + 0.2, 4.45, cw - 0.4, 0.85, name, size=18, color=EARTH, align=C)
    card(s, x + 0.25, 5.65, cw - 0.5, 0.8, fill=SAND, shadow=False, radius=0.2)
    text(s, x + 0.35, 5.65, cw - 0.7, 0.8, how, size=16, color=EARTH, bold=True, align=C, anchor=MID)
notes(s, """
🎤 MAJO · 3:30 – 4:10 (40 s)

"Nuestro impacto se alinea con cuatro Objetivos de Desarrollo Sostenible.

ODS 4, Educación de calidad: aprendizaje práctico de ciencia desde la primaria.
ODS 15, Vida de ecosistemas terrestres: cada niño cuida un ser vivo real y entiende el suelo y lo que lo mantiene sano.
ODS 12, Producción y consumo responsables: nuestra maceta es biodegradable.
Y ODS 13, Acción por el clima: los niños entienden cómo el clima de su ciudad afecta lo que cultivamos.

Queremos revalorar el trabajo de nuestros agricultores y formar conciencia ambiental desde la infancia. Y para que lo vean en acción, les presento a Sergio."

▶ Cambiar a la diapositiva 9 al ceder la palabra.
""")

# ── 9 · Transición a la demo en vivo (4:10 – 7:35 · Sergio) ─────────────
s = new_slide()
text(s, 0.6, 0.55, 12.13, 0.8, "Conoce CultivaT en acción", size=36, color=FOREST, font=HEAD, align=C,
     anchor=MID, name="Título")
text(s, 0.6, 1.38, 12.13, 0.5, "Escanea el código QR para explorar la plataforma.", size=20, color=EARTH,
     italic=True, align=C)
card(s, 4.47, 2.1, 4.4, 4.3, radius=0.35, name="Recuadro QR")
picture(s, QR, 4.72, 2.3, 3.9, 3.9, name="Código QR", alt="Código QR a https://cultivatecmi.github.io/CultivaT/")
text(s, 0.6, 6.6, 12.13, 0.45, "https://cultivatecmi.github.io/CultivaT/", size=20, color=EARTH, bold=True,
     align=C, name="Liga")
notes(s, """
🎤 SERGIO · 4:10 – 7:35 (3 min 25 s) · DEMOSTRACIÓN EN VIVO

Marcas de tiempo:
• 4:10 – 4:25 · Entrada: "Escaneen el código para explorar la plataforma mientras se las muestro." Dejar el QR en pantalla unos segundos.
• 4:25 – 7:15 · Demostración en vivo desde la app o el video.
• 7:15 – 7:35 · Remate: conectar lo que vieron con el kit físico y con el impacto en los niños.
• 7:35 · Volver a PowerPoint → diapositiva 10 (cierre).

Opcional: el Modo Presentación de la app (?demo=true o 5 toques en el logo) dura exactamente 3:00; si se inicia a las 4:25, termina a las 7:25.
Plan B sin internet: tener el video de la demo descargado en la laptop.
""")

# ── 10 · Cierre (7:35 – 8:00 · Sergio) ──────────────────────────────────
s = new_slide(FOREST)
card(s, 3.67, 0.5, 6.0, 4.6, fill=CREAM, shadow=False, radius=0.45, name="Logo")
lh = 4.1
lw_ = lh * 900 / 730
picture(s, LOGO, 6.67 - lw_ / 2, 0.75, lw_, lh, name="Logo CultivaT", alt="Logo oficial de CultivaT")
text(s, 1.6, 5.35, 10.13, 0.7, "Cultivando conciencia, cosechando futuro", size=30, color=WHITE, font=HEAD,
     align=C, anchor=MID, name="Eslogan")
text(s, 1.6, 6.1, 10.13, 0.5, "¡Gracias!", size=22, color=SUN_LIGHT, bold=True, align=C)
card(s, 11.48, 5.83, 1.25, 1.25, fill=WHITE, shadow=False, radius=0.18, name="QR discreto")
picture(s, QR, 11.555, 5.905, 1.1, 1.1, name="Código QR", alt="Código QR a https://cultivatecmi.github.io/CultivaT/")
notes(s, """
🎤 SERGIO · 7:35 – 8:00 (25 s) · CIERRE

Frase sugerida:
"En Culiacán sembramos para alimentar a México. Hoy queremos sembrar algo más: niños que conozcan, quieran y cuiden el campo. Somos Alejandra, Maide, Yareli, Majo y Sergio, y esto es CultivaT: cultivando conciencia, cosechando futuro. ¡Muchas gracias!"

• 8:00 · Terminar exacto y quedarse en esta diapositiva.
• 8:00 – 12:00 · Preguntas del jurado (4 min): el QR queda visible en la esquina.
""")

prs.save(str(OUT))
print("Listo:", OUT)
