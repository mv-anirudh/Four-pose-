import { FILMS, FOOT, GAP, LAYOUTS, MARGIN } from './options';
import type { Frame, LayoutKey, Photo, SaveKind, Settings, Sticker } from './types';

/* All drawing is plain canvas code with no React in it, so it can be tested on its own. */

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement, opts?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', opts);
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  return ctx;
}

export function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${m[3]} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 128;
}

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function geometry(layout: LayoutKey): { W: number; H: number; frames: Frame[] } {
  const l = LAYOUTS[layout];
  const W = MARGIN * 2 + l.cols * l.fw + (l.cols - 1) * GAP;
  const H = MARGIN + l.rows * l.fh + (l.rows - 1) * GAP + FOOT;
  const frames: Frame[] = [];
  for (let r = 0; r < l.rows; r++) {
    for (let c = 0; c < l.cols; c++) {
      frames.push({ x: MARGIN + c * (l.fw + GAP), y: MARGIN + r * (l.fh + GAP), w: l.fw, h: l.fh });
    }
  }
  return { W, H, frames };
}

/** Draws one photo into its frame and applies the film look. */
function developFrame(photo: Photo, frame: Frame, scale: number, index: number, s: Settings): HTMLCanvasElement {
  const w = Math.round(frame.w * scale);
  const h = Math.round(frame.h * scale);
  const c = makeCanvas(w, h);
  const x = ctx2d(c, { willReadFrequently: true });

  const fit = Math.max(w / photo.w, h / photo.h);
  const dw = photo.w * fit;
  const dh = photo.h * fit;
  const ex = dw - w;
  const ey = dh - h;
  x.drawImage(photo.src, -ex / 2 - (photo.ox * ex) / 2, -ey / 2 - (photo.oy * ey) / 2, dw, dh);

  const film = FILMS[s.film];
  const gAmt = s.grain * 70;
  const vAmt = s.vignette * 0.75;
  if (s.film !== 'none' || gAmt || vAmt) {
    const img = x.getImageData(0, 0, w, h);
    const d = img.data;
    const { sat, con, bri, fade } = film;
    const [tr, tg, tb] = film.tint;
    const keep = 1 - fade;
    const lift = 140 * fade;
    const cx = w / 2;
    const cy = h / 2;
    const maxd = cx * cx + cy * cy;
    let seed = ((index + 1) * 9781 + 17) | 0;
    for (let yy = 0, i = 0; yy < h; yy++) {
      const dy = yy - cy;
      for (let xx = 0; xx < w; xx++, i += 4) {
        let r = d[i];
        let g = d[i + 1];
        let b = d[i + 2];
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + (r - l) * sat;
        g = l + (g - l) * sat;
        b = l + (b - l) * sat;
        r = ((r - 128) * con + 128) * bri * tr;
        g = ((g - 128) * con + 128) * bri * tg;
        b = ((b - 128) * con + 128) * bri * tb;
        r = r * keep + lift;
        g = g * keep + lift;
        b = b * keep + lift;
        if (vAmt) {
          const dx = xx - cx;
          const v = 1 - vAmt * ((dx * dx + dy * dy) / maxd);
          r *= v;
          g *= v;
          b *= v;
        }
        if (gAmt) {
          seed ^= seed << 13;
          seed ^= seed >>> 17;
          seed ^= seed << 5;
          const n = ((seed >>> 0) / 4294967296 - 0.5) * gAmt;
          r += n;
          g += n;
          b += n;
        }
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }
    }
    x.putImageData(img, 0, 0);
  }

  if (s.leak > 0) {
    const gx = index % 2 === 0 ? 0 : w;
    const gy = index % 3 === 0 ? 0 : h;
    const grad = x.createRadialGradient(gx, gy, 0, gx, gy, w * 0.75);
    grad.addColorStop(0, `rgba(255, 120, 40, ${0.85 * s.leak})`);
    grad.addColorStop(0.5, `rgba(255, 60, 60, ${0.3 * s.leak})`);
    grad.addColorStop(1, 'rgba(255, 60, 60, 0)');
    x.globalCompositeOperation = 'screen';
    x.fillStyle = grad;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
  }

  if (s.wear > 0) {
    const rand = rng((index + 3) * 4409);
    x.fillStyle = 'rgba(255, 255, 255, 0.55)';
    const specks = Math.round(s.wear * 45);
    for (let i = 0; i < specks; i++) {
      x.beginPath();
      x.arc(rand() * w, rand() * h, (0.4 + rand() * 1.3) * scale, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    x.lineWidth = Math.max(1, scale * 0.8);
    const scratches = Math.round(s.wear * 4);
    for (let i = 0; i < scratches; i++) {
      const sx = rand() * w;
      const sy = rand() * h * 0.5;
      const len = h * (0.2 + rand() * 0.6);
      x.beginPath();
      x.moveTo(sx, sy);
      x.lineTo(sx + (rand() - 0.5) * 6 * scale, sy + len);
      x.stroke();
    }
  }
  return c;
}

export function renderStrip(photos: Photo[], stickers: Sticker[], s: Settings, scale: number): HTMLCanvasElement {
  const g = geometry(s.layout);
  const c = makeCanvas(g.W * scale, g.H * scale);
  const ctx = ctx2d(c);
  ctx.scale(scale, scale);

  const dark = isDark(s.paper);
  ctx.fillStyle = s.paper;
  ctx.fillRect(0, 0, g.W, g.H);

  g.frames.forEach((f, i) => {
    const photo = photos[i];
    if (photo) {
      ctx.drawImage(developFrame(photo, f, scale, i, s), f.x, f.y, f.w, f.h);
    } else {
      ctx.fillStyle = dark ? 'rgba(239, 233, 220, 0.12)' : 'rgba(27, 26, 23, 0.1)';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = dark ? 'rgba(239, 233, 220, 0.6)' : 'rgba(27, 26, 23, 0.55)';
      ctx.font = '26px "Special Elite", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Pose ${i + 1}`, f.x + f.w / 2, f.y + f.h / 2);
    }
    // No frame outline: real booth prints have none.
  });

  // Footer: caption and date stamp
  const caption = s.caption.trim();
  const stamp = s.dateOn ? formatDate(s.date) : '';
  const footTop = g.H - FOOT;
  ctx.fillStyle = dark ? '#efe9dc' : '#1b1a17';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (caption) {
    let size = 56;
    const font = (px: number) => `600 ${px}px "Caveat", "Segoe Script", cursive`;
    ctx.font = font(size);
    while (ctx.measureText(caption).width > g.W - MARGIN * 2 && size > 24) {
      size -= 2;
      ctx.font = font(size);
    }
    ctx.fillText(caption, g.W / 2, footTop + (stamp ? 58 : 72));
  }
  if (stamp) {
    ctx.font = '24px "Special Elite", "Courier New", monospace';
    ctx.globalAlpha = 0.8;
    ctx.fillText(stamp, g.W / 2, footTop + (caption ? 112 : 76));
    ctx.globalAlpha = 1;
  }

  for (const st of stickers) {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);
    ctx.font = `${st.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.ch, 0, 0);
    ctx.restore();
  }
  return c;
}

/** Places the strip, slightly tilted, on a coloured backdrop at an Instagram size. */
function composeForInstagram(strip: HTMLCanvasElement, backdrop: string, w: number, h: number): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, w, h);
  const shade = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);

  const fit = Math.min((w * 0.8) / strip.width, (h * 0.8) / strip.height);
  const dw = strip.width * fit;
  const dh = strip.height * fit;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.035);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.drawImage(strip, -dw / 2, -dh / 2, dw, dh);
  return c;
}

export function renderForSave(kind: SaveKind, photos: Photo[], stickers: Sticker[], s: Settings): HTMLCanvasElement {
  const strip = renderStrip(photos, stickers, s, 2);
  if (kind === 'story') return composeForInstagram(strip, s.backdrop, 1080, 1920);
  if (kind === 'post') return composeForInstagram(strip, s.backdrop, 1080, 1350);
  return strip;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
