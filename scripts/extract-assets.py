"""
Extracts web-ready assets from the supplied Cantina Cana reference material.

Inputs (project root):
  mulledwine2.jpeg                closed packaging, four panels
  mulledwine.jpeg                 open box reference
  Recipe Book final 15x10.pdf     recipe booklet

Outputs (public/):
  textures/pack-*.webp            individual box panels (never the whole mockup on one face)
  textures/booklet-cover.webp     booklet front cover (also used on the 3D booklet)
  illustrations/*.png             ingredient line drawings from the booklet, on transparent
  recipe/booklet-*.webp           booklet page previews
  recipe/cantina-cana-mulled-wine-recipe-book.pdf

Requires: Pillow, numpy, pypdfium2  (py -3.13 scripts/extract-assets.py)
"""
from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
import pypdfium2 as pdfium
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
TEX = PUBLIC / "textures"
ILL = PUBLIC / "illustrations"
REC = PUBLIC / "recipe"
for d in (TEX, ILL, REC):
    d.mkdir(parents=True, exist_ok=True)

PDF_SRC = ROOT / "Recipe Book final 15x10.pdf"


def save_webp(img: Image.Image, path: Path, quality: int = 88) -> None:
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {path.stat().st_size // 1024} KB")


def remove_text(img: Image.Image, box: tuple[int, int, int, int], margin: int = 14) -> Image.Image:
    """Paint out printed text inside `box` by interpolating each row between the clean
    cardboard just left and right of the box, so crisp type can be re-set at runtime."""
    a = np.asarray(img).astype(np.float32)
    x0, y0, x1, y1 = box
    left = a[y0:y1, x0 - margin:x0].mean(axis=1)
    right = a[y0:y1, x1:x1 + margin].mean(axis=1)
    # smooth the sampled columns vertically to avoid streaks
    k = 9
    pad = k // 2
    kernel = np.ones(k, dtype=np.float32) / k
    for col in (left, right):
        for c in range(3):
            col[:, c] = np.convolve(np.pad(col[:, c], pad, mode="edge"), kernel, mode="valid")
    t = np.linspace(0.0, 1.0, x1 - x0, dtype=np.float32)[None, :, None]
    fill = left[:, None, :] * (1 - t) + right[:, None, :] * t
    rng = np.random.default_rng(7)
    fill += rng.normal(0.0, 1.6, fill.shape[:2] + (1,)).astype(np.float32)  # paper grain
    # feathered mask so the patch melts into the surrounding print
    h, w = y1 - y0, x1 - x0
    feather = 10
    my = np.clip(np.minimum(np.arange(h), np.arange(h)[::-1]) / feather, 0, 1)
    mx = np.clip(np.minimum(np.arange(w), np.arange(w)[::-1]) / feather, 0, 1)
    mask = (my[:, None] * mx[None, :])[..., None]
    a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - mask) + fill * mask
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def upscale(img: Image.Image, factor: float) -> Image.Image:
    size = (round(img.width * factor), round(img.height * factor))
    out = img.resize(size, Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=2.2, percent=45, threshold=2))


print("Packaging panels")
pack = Image.open(ROOT / "mulledwine2.jpeg").convert("RGB")
S = 1.5  # coordinates below were measured on a 1024 px wide preview


def pack_crop(box: tuple[float, float, float, float]) -> Image.Image:
    return pack.crop(tuple(round(v * S) for v in box))


# Front face (without the visible top flap).  Printed type is removed and re-set crisply at runtime.
front = pack_crop((528.5, 102.5, 778, 555.5))
front = remove_text(front, (22, 14, front.width - 16, 252), margin=10)
save_webp(upscale(front, 3), TEX / "pack-front.webp")

# Right side: vertical tagline is re-set at runtime as well.
right = pack_crop((822.5, 98, 922.5, 556))
right = remove_text(right, (58, 18, 112, 668))
save_webp(upscale(right, 3), TEX / "pack-right.webp")

# Left side ("Inside the box") and back keep their printed artwork as photographed.
save_webp(upscale(pack_crop((373.5, 100, 482.5, 556)), 3), TEX / "pack-left.webp")
save_webp(upscale(pack_crop((76, 104, 331.5, 552)), 3), TEX / "pack-back.webp")

print("Open-box lid interior")
openbox = Image.open(ROOT / "mulledwine.jpeg").convert("RGB")
S2 = openbox.width / 768
lid = openbox.crop(tuple(round(v * S2) for v in (52, 62, 286, 918)))
lid = lid.resize((760, 1380), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
save_webp(lid, TEX / "pack-lid-inside.webp", 84)

print("Booklet")
pdf = pdfium.PdfDocument(str(PDF_SRC))
SCALE = 6.0
PREVIEW = 1024 / 425.2  # preview scale used when measuring the boxes below
pages = [pdf[i].render(scale=SCALE).to_pil().convert("RGB") for i in range(len(pdf))]
K = SCALE / PREVIEW


def page_crop(page: int, box: tuple[float, float, float, float]) -> Image.Image:
    return pages[page].crop(tuple(round(v * K) for v in box))


cover = page_crop(6, (0, 0, 512, 683))
save_webp(cover.resize((768, round(768 * cover.height / cover.width)), Image.LANCZOS), TEX / "booklet-cover.webp", 86)
spread = pages[4]
save_webp(spread.resize((1500, round(1500 * spread.height / spread.width)), Image.LANCZOS), REC / "booklet-instructions.webp", 82)
cover_spread = pages[6]
save_webp(cover_spread.resize((1500, round(1500 * cover_spread.height / cover_spread.width)), Image.LANCZOS), REC / "booklet-cover-spread.webp", 82)

def draw_cinnamon_illustration() -> None:
    """Tied Ceylon quills in the booklet's burgundy line, matching the other ingredients."""
    import math

    from PIL import ImageDraw

    ink = (122, 40, 52, 255)
    scale = 4
    image = Image.new("RGBA", (520 * scale, 380 * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    weight = 7 * scale

    def stroke(points: list[tuple[float, float]], width: int = weight) -> None:
        draw.line([(round(x), round(y)) for x, y in points], fill=ink, width=width, joint="curve")
        radius = width / 2
        for x, y in (points[0], points[-1]):
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=ink)

    def into(local: tuple[float, float], origin: tuple[float, float], angle: float) -> tuple[float, float]:
        c, s = math.cos(angle), math.sin(angle)
        return (origin[0] + local[0] * c - local[1] * s, origin[1] + local[0] * s + local[1] * c)

    def quill(origin: tuple[float, float], angle: float, length: float, radius: float, roll: float) -> None:
        steps = 36

        def arc(cx: float, a0: float, a1: float) -> list[tuple[float, float]]:
            return [into((cx + math.cos(a0 + (a1 - a0) * i / steps) * radius, math.sin(a0 + (a1 - a0) * i / steps) * radius), origin, angle) for i in range(steps + 1)]

        outline = (
            arc(0, math.pi / 2, math.pi * 1.5)
            + [into((length, -radius), origin, angle)]
            + arc(length, -math.pi / 2, math.pi / 2)
            + [into((0, radius), origin, angle)]
        )
        stroke(outline, weight)
        for frac in (0.38, -0.28):
            stroke(
                [into((radius * 0.15, frac * radius), origin, angle), into((length - radius * 0.2, frac * radius), origin, angle)],
                max(3 * scale, weight // 3),
            )
        spiral: list[tuple[float, float]] = []
        turns = 1.65
        for i in range(70):
            t = i / 69
            a = roll + t * turns * math.tau
            rad = radius * (0.08 + 0.72 * t)
            spiral.append(into((math.cos(a) * rad, math.sin(a) * rad), origin, angle))
        stroke(spiral, max(4 * scale, weight // 2))

    angle = -0.62
    radius = 46 * scale
    length = 300 * scale
    gap = radius * 2.05
    px, py = -math.sin(angle) * gap, math.cos(angle) * gap
    base = (150 * scale, 250 * scale)
    quill(base, angle, length, radius, -math.pi / 2)
    quill((base[0] + px, base[1] + py), angle, length * 0.96, radius * 0.94, 0.4)

    # jute bow across the pair, same ink as the booklet drawings
    along = (math.cos(angle), math.sin(angle))
    across = (-math.sin(angle), math.cos(angle))
    mid = (
        base[0] + px * 0.5 + along[0] * length * 0.48,
        base[1] + py * 0.5 + along[1] * length * 0.48,
    )
    bow = max(4 * scale, weight // 2)
    reach = radius * 2.35
    stroke(
        [
            (mid[0] - across[0] * reach, mid[1] - across[1] * reach),
            (mid[0] + across[0] * reach, mid[1] + across[1] * reach),
        ],
        bow,
    )
    loop_r = 22 * scale
    for side in (1, -1):
        loop = []
        for i in range(28):
            a = (i / 27) * math.pi
            lx = mid[0] + along[0] * math.sin(a) * loop_r * 0.55 + across[0] * side * (8 * scale + math.sin(a) * loop_r)
            ly = mid[1] + along[1] * math.sin(a) * loop_r * 0.55 + across[1] * side * (8 * scale + math.sin(a) * loop_r)
            loop.append((lx, ly))
        stroke(loop, bow)
        tail = [
            mid,
            (mid[0] + along[0] * side * reach * 0.45 + across[0] * side * 4 * scale, mid[1] + along[1] * side * reach * 0.45 + across[1] * side * 4 * scale),
            (mid[0] + along[0] * side * reach * 0.9, mid[1] + along[1] * side * reach * 0.9 + 10 * scale),
        ]
        stroke(tail, bow)

    alpha = image.getchannel("A")
    bbox = alpha.point(lambda v: 255 if v > 12 else 0).getbbox()
    if not bbox:
        raise RuntimeError("cinnamon illustration drew nothing")
    pad = 12 * scale
    crop = image.crop((max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, image.width), min(bbox[3] + pad, image.height)))
    longest = max(crop.size)
    crop = crop.resize((round(crop.width * 420 / longest), round(crop.height * 420 / longest)), Image.Resampling.LANCZOS)
    # hard ink, matching the booklet extractions
    import numpy as np

    pixels = np.array(crop)
    pixels[:, :, 0] = 122
    pixels[:, :, 1] = 40
    pixels[:, :, 2] = 52
    pixels[:, :, 3] = np.where(pixels[:, :, 3] > 96, 255, 0)
    crop = Image.fromarray(pixels, "RGBA")
    out = ILL / "cinnamon.png"
    crop.save(out, optimize=True)
    print(f"  {out.relative_to(ROOT)}  {crop.size[0]}x{crop.size[1]}  {out.stat().st_size // 1024} KB")


print("Ingredient illustrations")
ILLUSTRATIONS = {
    "wine": (0, (190, 348, 305, 578)),
    "orange": (1, (160, 415, 335, 572)),
    "star-anise": (1, (690, 410, 850, 570)),
    "cardamom": (2, (180, 400, 320, 560)),
    "cloves": (2, (660, 394, 856, 582)),
    "aperitif": (3, (200, 358, 290, 572)),
    "corkscrew": (3, (742, 356, 812, 526)),
}
INK = np.array([122, 40, 52], dtype=np.float32)  # brand wine tone for the line work
for name, (page, box) in ILLUSTRATIONS.items():
    crop = np.asarray(page_crop(page, box)).astype(np.float32)
    bg = np.median(crop.reshape(-1, 3), axis=0)
    dist = np.clip((bg - crop) / np.maximum(bg - np.percentile(crop.reshape(-1, 3), 1.5, axis=0), 1), 0, 1)
    alpha = np.clip(dist.max(axis=2) * 1.08, 0, 1)
    alpha[alpha < 0.06] = 0
    ys, xs = np.nonzero(alpha > 0.2)
    pad = 10
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, alpha.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, alpha.shape[1])
    alpha = alpha[y0:y1, x0:x1]
    rgba = np.zeros(alpha.shape + (4,), dtype=np.uint8)
    rgba[..., :3] = INK.astype(np.uint8)
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    scale = 420 / max(img.size)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    out = ILL / f"{name}.png"
    img.save(out, optimize=True)
    print(f"  {out.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {out.stat().st_size // 1024} KB")
draw_cinnamon_illustration()

print("Recipe PDF")
dest = REC / "cantina-cana-mulled-wine-recipe-book.pdf"
shutil.copyfile(PDF_SRC, dest)
print(f"  {dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} KB")
