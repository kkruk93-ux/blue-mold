"""Generates PWA / store icons (original art, Pillow only).
   python3 tools/make_icons.py   (run from repo root)"""
import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

PAPER = (238, 234, 223); INK = (42, 44, 48); BLUE = (23, 194, 227); GLOW = (150, 240, 248)

def paper(size):
    random.seed(7)
    im = Image.new("RGB", (size, size), PAPER)
    noise = Image.effect_noise((size, size), 18).convert("L")
    tint = Image.merge("RGB", [noise.point(lambda v: v * .06 + 228), noise.point(lambda v: v * .06 + 224), noise.point(lambda v: v * .06 + 212)])
    return Image.blend(im, tint, .6)

def pline(d, x1, y1, x2, y2, w, a, s):
    for _ in range(2):
        j = w * .8
        d.line([(x1 + random.uniform(-j, j), y1 + random.uniform(-j, j)), (x2 + random.uniform(-j, j), y2 + random.uniform(-j, j))],
               fill=INK + (int(255 * a),), width=max(1, int(w)))

def art(size, scale):
    """deck-plan glyph: hatched hull, one sealed door, glowing blue mold. scale = fraction of canvas used (safe zone)."""
    random.seed(3)
    base = paper(size).convert("RGBA")
    lay = Image.new("RGBA", (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    S = size * scale; o = (size - S) / 2; u = S / 10; w = max(1.5, size / 110)
    # hull box with hatched walls
    x0, y0, x1, y1 = o + u * .6, o + u * .6, o + S - u * .6, o + S - u * .6
    t = u * .9
    for (a, b, c, e) in [(x0, y0, x1, y0 + t), (x0, y1 - t, x1, y1), (x0, y0, x0 + t, y1), (x1 - t, y0, x1, y1), (x0, y0 + S * .42, x1, y0 + S * .42 + t * .8)]:
        k = a - (e - b)
        step = max(3, size / 64)
        while k < c:
            xa, ya, xb, yb = k, e, k + (e - b), b
            # clip to rect
            if xa < a: ya -= (a - xa); xa = a
            if xb > c: yb += (xb - c); xb = c
            if xa < xb: pline(d, xa, ya, xb, yb, w * .7, .55, size)
            k += step
        for (p, q, r, s) in [(a, b, c, b), (a, e, c, e), (a, b, a, e), (c, b, c, e)]:
            pline(d, p, q, r, s, w, .9, size)
    # door gap in the middle wall, sealed plate
    dy = y0 + S * .42; dx = o + S / 2 - u * .7
    d.rectangle([dx, dy - 2, dx + u * 1.4, dy + t * .8 + 2], fill=PAPER + (255,))
    d.rectangle([dx, dy - 2, dx + u * 1.4, dy + t * .8 + 2], outline=INK + (255,), width=max(2, int(w * 1.6)))
    for k in range(5):
        pline(d, dx + k * u * .3, dy + t * .8, dx + k * u * .3 + u * .3, dy, w * .7, .8, size)
    base = Image.alpha_composite(base, lay)
    # mold glow in the lower compartment
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    cx, cy = o + S * .5, o + S * .72
    random.seed(11)
    for i in range(14):
        r = S * random.uniform(.06, .13); px = cx + random.uniform(-S * .22, S * .22); py = cy + random.uniform(-S * .1, S * .1)
        g.ellipse([px - r, py - r, px + r, py + r], fill=BLUE + (230,))
    clip = Image.new("L", (size, size), 0); ImageDraw.Draw(clip).rectangle([x0 + t, y0 + S * .42 + t * .8, x1 - t, y1 - t], fill=255)
    clip = clip.filter(ImageFilter.GaussianBlur(size / 90))
    glow.putalpha(ImageChops.multiply(glow.getchannel("A"), clip))
    blur = glow.filter(ImageFilter.GaussianBlur(size / 30))
    blur.putalpha(ImageChops.multiply(blur.getchannel("A"), clip))
    core = glow.filter(ImageFilter.GaussianBlur(size / 120))
    base = Image.alpha_composite(base, blur); base = Image.alpha_composite(base, blur)
    hi = Image.new("RGBA", (size, size), GLOW + (0,)); hi.putalpha(core.getchannel("A").point(lambda v: int(v * .7)))
    base = Image.alpha_composite(base, hi)
    d = ImageDraw.Draw(base)
    random.seed(5)
    for i in range(30):
        px = cx + random.uniform(-S * .22, S * .22); py = cy + random.uniform(-S * .09, S * .09); r = size / 220 + 1
        d.ellipse([px - r, py - r, px + r, py + r], fill=(8, 60, 75, 160))
    return base.convert("RGB")

def save(im, path, size):
    im.resize((size, size), Image.LANCZOS).save(path, optimize=True)

G = "docs/game/icons/"
big = art(1024, .92); save(big, G + "icon-512.png", 512); save(big, G + "icon-192.png", 192); save(big, G + "apple-touch-icon.png", 180)
mask = art(1024, .66); save(mask, G + "maskable-512.png", 512); save(mask, G + "maskable-192.png", 192)
save(big, "store/icon-512.png", 512)

# app (ship) maskable icons: existing dark icon shrunk into the safe zone on its own background colour
src = Image.open("docs/ikony/ikona-512.png").convert("RGB")
for s in (192, 512):
    can = Image.new("RGB", (s, s), src.getpixel((0, 0)))
    inner = int(s * .78); im = src.resize((inner, inner), Image.LANCZOS)
    can.paste(im, ((s - inner) // 2, (s - inner) // 2)); can.save("docs/ikony/maskable-%d.png" % s, optimize=True)

# feature graphic 1024x500 (no alpha)
fg = paper(1024).crop((0, 0, 1024, 500)).convert("RGBA")
glyph = art(500, .9).convert("RGBA").resize((420, 420), Image.LANCZOS)
fg.paste(glyph, (580, 40))
from PIL import ImageFont
d = ImageDraw.Draw(fg)
def font(p, s):
    try: return ImageFont.truetype(p, s)
    except Exception: return ImageFont.load_default()
f1 = font("docs/game/fonts/EBGaramond-SemiBold.woff2", 92); f2 = font("docs/game/fonts/EBGaramond-Italic.woff2", 60); f3 = font("docs/game/fonts/IBMPlexMono-Medium-Latin1.woff2", 22)
t = Image.new("RGBA", fg.size, (0, 0, 0, 0)); td = ImageDraw.Draw(t); td.text((60, 120), "BLUE MOLD", font=f1, fill=BLUE + (255,))
fg = Image.alpha_composite(fg, t.filter(ImageFilter.GaussianBlur(8))); fg = Image.alpha_composite(fg, t)
d = ImageDraw.Draw(fg); d.text((64, 225), "Containment", font=f2, fill=INK); d.text((62, 320), "SEAL THE BULKHEADS. SAVE THE BRIDGE.", font=f3, fill=INK)
fg.convert("RGB").save("store/feature-graphic-1024x500.png", optimize=True)
print("icons written")
