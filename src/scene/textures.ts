import { CanvasTexture, ClampToEdgeWrapping, Color, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { assets, packaging } from '../config/product';
import { seeded } from './choreography';

export interface SceneTextures {
  packFront: Texture;
  packRight: Texture;
  packLeft: Texture;
  packBack: Texture;
  lidInside: Texture;
  bookletCover: Texture;
  bottleLabel: Texture;
  orange: Texture;
  cinnamon: Texture;
  sieve: Texture;
  steam: Texture;
  glow: Texture;
  /** cardboard tone sampled from the photographed packaging */
  cardboard: Color;
}

const GOLD = '#dcbb8a';
const DISPLAY = '"Cormorant Garamond", "Times New Roman", serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  return [c, ctx];
}

function toTexture(c: HTMLCanvasElement, anisotropy: number): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  return t;
}

/** Draws letter-spaced text centred on x, scaled to an exact width. */
function fitSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, width: number, weight: number, tracking: number, italic = false): void {
  const probe = 100;
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${probe}px ${DISPLAY}`;
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const natural = widths.reduce((a, b) => a + b, 0) + tracking * probe * (chars.length - 1);
  const size = (probe * width) / natural;
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let x = cx - width / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, cy);
    x += (widths[i] * size) / probe + tracking * size;
  });
}

function goldInk(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = GOLD;
  ctx.shadowColor = 'rgba(30, 6, 10, 0.45)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
}

function packFront(img: HTMLImageElement): HTMLCanvasElement {
  const [c, ctx] = canvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  const { width: w, height: h } = c;
  goldInk(ctx);
  fitSpaced(ctx, packaging.wordmark, w / 2, h * 0.088, w * 0.61, 500, 0.2);
  fitSpaced(ctx, packaging.productName, w / 2, h * 0.257, w * 0.8, 500, 0.045);
  fitSpaced(ctx, packaging.tagline, w / 2, h * 0.312, w * 0.51, 500, 0.085);
  return c;
}

function packRight(img: HTMLImageElement): HTMLCanvasElement {
  const [c, ctx] = canvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  const { width: w, height: h } = c;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.406);
  ctx.rotate(-Math.PI / 2);
  goldInk(ctx);
  fitSpaced(ctx, packaging.sideLine, 0, 0, h * 0.58, 500, 0.075);
  ctx.restore();
  return c;
}

/** Satin ribbon label, as on the bottle in the open-box reference. */
function bottleLabel(): HTMLCanvasElement {
  const [c, ctx] = canvas(1024, 420);
  const w = c.width;
  const top = (x: number) => 78 + Math.sin((x / w) * Math.PI * 2 + 0.6) * 34 + Math.sin((x / w) * Math.PI * 4) * 8;
  const bottom = (x: number) => 348 + Math.sin((x / w) * Math.PI * 2 + 1.5) * 30;
  ctx.beginPath();
  ctx.moveTo(0, top(0));
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, top(x));
  for (let x = w; x >= 0; x -= 8) ctx.lineTo(x, bottom(x));
  ctx.closePath();
  const base = ctx.createLinearGradient(0, 60, 0, 380);
  base.addColorStop(0, '#7c2636');
  base.addColorStop(0.45, '#5e1826');
  base.addColorStop(1, '#49101b');
  ctx.fillStyle = base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // satin sheen
  for (let i = 0; i < 5; i++) {
    const g = ctx.createLinearGradient(0, 40 + i * 70, w, 120 + i * 62);
    g.addColorStop(0, 'rgba(255, 190, 190, 0)');
    g.addColorStop(0.35 + i * 0.07, `rgba(255, 200, 196, ${0.1 - i * 0.012})`);
    g.addColorStop(0.7, 'rgba(255, 190, 190, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 30 + i * 62, w, 46);
  }
  ctx.restore();
  ctx.fillStyle = GOLD;
  fitSpaced(ctx, packaging.wordmark, w / 2, 178, 520, 500, 0.18);
  ctx.fillRect(w / 2 - 34, 226, 68, 2);
  fitSpaced(ctx, packaging.wineLabel, w / 2, 274, 300, 500, 0.06, true);
  return c;
}

function orangeSlice(): HTMLCanvasElement {
  const [c, ctx] = canvas(512, 512);
  const r = 256;
  ctx.translate(r, r);
  ctx.fillStyle = '#9c4a10';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  const rind = ctx.createRadialGradient(0, 0, r * 0.84, 0, 0, r);
  rind.addColorStop(0, '#e9b56a');
  rind.addColorStop(0.45, '#d98a2c');
  rind.addColorStop(1, '#a9520f');
  ctx.fillStyle = rind;
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.fill();
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.035;
    const a1 = ((i + 1) / n) * Math.PI * 2 - 0.035;
    const flesh = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.84);
    flesh.addColorStop(0, '#f0a63a');
    flesh.addColorStop(0.6, '#e2841d');
    flesh.addColorStop(1, '#c4600f');
    ctx.fillStyle = flesh;
    ctx.beginPath();
    ctx.moveTo(Math.cos((a0 + a1) / 2) * r * 0.1, Math.sin((a0 + a1) / 2) * r * 0.1);
    ctx.arc(0, 0, r * 0.82, a0, a1);
    ctx.closePath();
    ctx.fill();
    // juice vesicles
    ctx.strokeStyle = 'rgba(255, 214, 140, 0.34)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const a = a0 + ((k + 0.5) / 7) * (a1 - a0);
      const jitter = seeded(i * 13 + k) * 0.12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * (0.22 + jitter), Math.sin(a) * r * (0.22 + jitter));
      ctx.lineTo(Math.cos(a) * r * (0.74 - jitter * 0.5), Math.sin(a) * r * (0.74 - jitter * 0.5));
      ctx.stroke();
    }
  }
  // dried, caramelised edge and centre
  const toast = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
  toast.addColorStop(0, 'rgba(110, 40, 0, 0)');
  toast.addColorStop(1, 'rgba(96, 34, 4, 0.42)');
  ctx.fillStyle = toast;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3d9a4';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function cinnamonBark(): HTMLCanvasElement {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#b27a47';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i++) {
    const y = seeded(i) * 256;
    const tone = seeded(i + 40);
    ctx.fillStyle = tone > 0.5 ? `rgba(92, 50, 22, ${0.1 + tone * 0.16})` : `rgba(226, 176, 120, ${0.08 + tone * 0.18})`;
    ctx.fillRect(seeded(i + 90) * 80 - 40, y, 180 + seeded(i + 7) * 120, 1 + seeded(i + 3) * 2.5);
  }
  return c;
}

function sieveMesh(): HTMLCanvasElement {
  const [c, ctx] = canvas(64, 64);
  ctx.fillStyle = 'rgb(34, 34, 34)';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgb(255, 255, 255)';
  for (let i = 0; i < 64; i += 16) {
    ctx.fillRect(i, 0, 5, 64);
    ctx.fillRect(0, i, 64, 5);
  }
  return c;
}

function steamWisp(): HTMLCanvasElement {
  const [c, ctx] = canvas(128, 256);
  for (let i = 0; i < 9; i++) {
    const x = 64 + Math.sin(i * 1.7) * 20;
    const y = 30 + i * 24;
    const r = 26 + seeded(i + 5) * 18;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}

function hobGlow(): HTMLCanvasElement {
  const [c, ctx] = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 96, 24, 0)');
  g.addColorStop(0.3, 'rgba(255, 84, 20, 0.5)');
  g.addColorStop(0.52, 'rgba(255, 110, 36, 1)');
  g.addColorStop(0.68, 'rgba(255, 70, 16, 0.4)');
  g.addColorStop(1, 'rgba(255, 60, 10, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

function sampleColor(img: HTMLImageElement, u: number, v: number): Color {
  const [, ctx] = canvas(8, 8);
  ctx.drawImage(img, img.naturalWidth * u - 16, img.naturalHeight * v - 16, 32, 32, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return new Color().setRGB(r / n / 255, g / n / 255, b / n / 255, SRGBColorSpace);
}

export async function loadSceneTextures(anisotropy: number): Promise<SceneTextures> {
  const fontsReady = document.fonts
    ? Promise.all([document.fonts.load(`500 64px ${DISPLAY}`), document.fonts.load(`italic 500 64px ${DISPLAY}`)]).catch(() => undefined)
    : Promise.resolve(undefined);
  const [front, right, left, back, lid, cover] = await Promise.all([
    loadImage(assets.textures.packFront),
    loadImage(assets.textures.packRight),
    loadImage(assets.textures.packLeft),
    loadImage(assets.textures.packBack),
    loadImage(assets.textures.lidInside),
    loadImage(assets.textures.bookletCover),
    fontsReady,
  ]);
  const plain = (img: HTMLImageElement): CanvasTexture => {
    const [c, ctx] = canvas(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, 0, 0);
    return toTexture(c, anisotropy);
  };
  const sieve = toTexture(sieveMesh(), anisotropy);
  sieve.wrapS = sieve.wrapT = RepeatWrapping;
  sieve.repeat.set(56, 20);
  const bark = toTexture(cinnamonBark(), 1);
  bark.wrapS = bark.wrapT = RepeatWrapping;
  return {
    packFront: toTexture(packFront(front), anisotropy),
    packRight: toTexture(packRight(right), anisotropy),
    packLeft: plain(left),
    packBack: plain(back),
    lidInside: plain(lid),
    bookletCover: plain(cover),
    bottleLabel: toTexture(bottleLabel(), anisotropy),
    orange: toTexture(orangeSlice(), anisotropy),
    cinnamon: bark,
    sieve,
    steam: toTexture(steamWisp(), 1),
    glow: toTexture(hobGlow(), 1),
    cardboard: sampleColor(front, 0.5, 0.05),
  };
}

export function disposeSceneTextures(t: SceneTextures): void {
  for (const value of Object.values(t)) {
    if (value && typeof (value as Texture).dispose === 'function' && (value as Texture).isTexture) (value as Texture).dispose();
  }
}
