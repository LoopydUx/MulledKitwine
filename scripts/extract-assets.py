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

print("Ingredient illustrations")
ILLUSTRATIONS = {
    "wine": (0, (190, 348, 305, 578)),
    "cinnamon": (0, (685, 451, 865, 568)),
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

print("Recipe PDF")
dest = REC / "cantina-cana-mulled-wine-recipe-book.pdf"
shutil.copyfile(PDF_SRC, dest)
print(f"  {dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} KB")
