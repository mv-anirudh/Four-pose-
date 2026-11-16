import { FILMS, FOOT, FORMATS, GAP, LAYOUTS, MARGIN, MAX_COPIES } from './options';
import type { Arrangement, Frame, LayoutKey, Photo, Placement, SaveKind, Settings, ShareFormat, Sticker, StickerKey } from './types';

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
    drawSticker(ctx, st.kind, st.size);
    ctx.restore();
  }
  return c;
}

/* Stickers: die-cut paper shapes in the booth palette, drawn the same way on every device. */

const INK = '#1b1a17';
const CUT = '#fbf8f1';
const RED = '#8e1f2b';
const AMBER = '#e9ae3f';
const GREEN = '#17463f';

/** One shape of a sticker, in a unit box from -0.5 to 0.5. `line` makes it a stroke (like a stem) instead of a fill. */
interface StickerPart {
  path: Path2D;
  color: string;
  line?: number;
}

function poly(points: [number, number][]): Path2D {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

function buildSticker(kind: Exclude<StickerKey, 'xoxo'>): StickerPart[] {
  switch (kind) {
    case 'heart': {
      const p = new Path2D();
      p.moveTo(0, 0.42);
      p.bezierCurveTo(-0.58, 0.04, -0.42, -0.46, 0, -0.18);
      p.bezierCurveTo(0.42, -0.46, 0.58, 0.04, 0, 0.42);
      return [{ path: p, color: RED }];
    }
    case 'star': {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.21 : 0.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([Math.cos(a) * r, Math.sin(a) * r + 0.04]);
      }
      return [{ path: poly(pts), color: AMBER }];
    }
    case 'flash':
      return [
        {
          path: poly([[-0.05, -0.5], [0.25, -0.5], [0.06, -0.1], [0.3, -0.1], [-0.15, 0.5], [0, 0.02], [-0.25, 0.02]]),
          color: AMBER,
        },
      ];
    case 'sparkle': {
      const p = new Path2D();
      p.moveTo(0, -0.5);
      p.quadraticCurveTo(0.07, -0.07, 0.5, 0);
      p.quadraticCurveTo(0.07, 0.07, 0, 0.5);
      p.quadraticCurveTo(-0.07, 0.07, -0.5, 0);
      p.quadraticCurveTo(-0.07, -0.07, 0, -0.5);
      p.closePath();
      return [{ path: p, color: GREEN }];
    }
    case 'crown':
      return [
        {
          path: poly([[-0.42, 0.34], [-0.46, -0.22], [-0.2, 0.02], [0, -0.36], [0.2, 0.02], [0.46, -0.22], [0.42, 0.34]]),
          color: AMBER,
        },
      ];
    case 'cherries': {
      const stems = new Path2D();
      stems.moveTo(-0.17, 0.1);
      stems.quadraticCurveTo(-0.08, -0.22, 0.12, -0.42);
      stems.moveTo(0.19, 0.04);
      stems.quadraticCurveTo(0.12, -0.2, 0.12, -0.42);
      const left = new Path2D();
      left.arc(-0.18, 0.26, 0.17, 0, Math.PI * 2);
      const right = new Path2D();
      right.arc(0.2, 0.2, 0.17, 0, Math.PI * 2);
      return [
        { path: stems, color: GREEN, line: 0.05 },
        { path: left, color: RED },
        { path: right, color: RED },
      ];
    }
  }
}

const stickerCache = new Map<StickerKey, StickerPart[]>();

/** Draws a sticker centred on the current origin, `size` strip units across. */
export function drawSticker(ctx: CanvasRenderingContext2D, kind: StickerKey, size: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (kind === 'xoxo') {
    // Handwritten, so it uses the caption face instead of a path.
    ctx.font = `600 ${size * 0.8}px "Caveat", "Segoe Script", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = CUT;
    ctx.lineWidth = size * 0.14;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = size * 0.06;
    ctx.shadowOffsetY = size * 0.02;
    ctx.strokeText('xoxo', 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = RED;
    ctx.fillText('xoxo', 0, 0);
    ctx.restore();
    return;
  }

  let parts = stickerCache.get(kind);
  if (!parts) {
    parts = buildSticker(kind);
    stickerCache.set(kind, parts);
  }

  // Paper backing with a soft shadow, as if cut out and stuck on.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = size * 0.06;
  ctx.shadowOffsetY = size * 0.02;
  ctx.scale(size, size);
  ctx.strokeStyle = CUT;
  ctx.fillStyle = CUT;
  for (const p of parts) {
    ctx.lineWidth = (p.line ?? 0) + 0.14;
    ctx.stroke(p.path);
    if (!p.line) ctx.fill(p.path);
  }
  ctx.shadowColor = 'transparent';

  // Printed colour with a thin ink edge.
  for (const p of parts) {
    if (p.line) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.line;
      ctx.stroke(p.path);
    } else {
      ctx.fillStyle = p.color;
      ctx.fill(p.path);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.025;
      ctx.stroke(p.path);
    }
  }
  ctx.restore();
}

/* ---------- Instagram image: one or more strips on a backdrop ---------- */

/** Width over height of a strip in the given layout. */
export function stripAspect(layout: LayoutKey): number {
  const g = geometry(layout);
  return g.W / g.H;
}

/** Starting positions for the strips; the person can drag and tilt them afterwards. */
export function presetPlacements(copies: number, arrangement: Arrangement, format: ShareFormat, layout: LayoutKey): Placement[] {
  const { w: W, h: H } = FORMATS[format];
  const a = stripAspect(layout);
  const n = Math.max(1, Math.min(MAX_COPIES, Math.round(copies)));
  const make = (hS: number, spots: [number, number, number][]): Placement[] =>
    spots.map(([x, y, rot], copy) => ({ copy, x: clamp(x, 0.05, 0.95), y: clamp(y, 0.05, 0.95), rot, h: hS / H }));

  if (n === 1) {
    return make(Math.min(0.8 * H, (0.8 * W) / a), [[0.5, 0.5, -0.035]]);
  }

  if (arrangement === 'row') {
    const gap = 0.04 * W;
    const hS = Math.min(0.78 * H, (0.88 * W - (n - 1) * gap) / (n * a));
    const sw = hS * a;
    const total = n * sw + (n - 1) * gap;
    const tilts = [-0.02, 0.015, -0.01];
    return make(
      hS,
      Array.from({ length: n }, (_, i) => [((W - total) / 2 + sw / 2 + i * (sw + gap)) / W, 0.5, tilts[i]] as [number, number, number]),
    );
  }

  if (arrangement === 'scatter') {
    const hS = Math.min(0.62 * H, (0.7 * W) / (a * (1 + 0.5 * (n - 1))));
    const spots: Record<number, [number, number, number][]> = {
      2: [[0.36, 0.44, -0.1], [0.64, 0.56, 0.08]],
      3: [[0.3, 0.4, -0.12], [0.7, 0.47, 0.09], [0.47, 0.62, -0.03]],
    };
    return make(hS, spots[n]);
  }

  // Fanned: overlapping like strips held in one hand
  const step = 0.42;
  const hS = Math.min(0.74 * H, (0.84 * W) / (a * (1 + step * (n - 1))));
  const sw = hS * a;
  const tilts: Record<number, number[]> = { 2: [-0.09, 0.07], 3: [-0.13, 0, 0.11] };
  return make(
    hS,
    Array.from({ length: n }, (_, i) => {
      const off = i - (n - 1) / 2;
      return [(W / 2 + off * step * sw) / W, 0.5 + Math.abs(off) * 0.02, tilts[n][i]] as [number, number, number];
    }),
  );
}

/**
 * Photos for each strip in the Instagram image. With spares on, strip 2 takes
 * photos 5 to 8 and so on, but only when there are enough to fill it;
 * otherwise it repeats strip 1, the way a booth prints a duplicate.
 */
export function photoSets(photos: Photo[], s: Settings): { photos: Photo[]; duplicate: boolean }[] {
  const n = LAYOUTS[s.layout].cols * LAYOUTS[s.layout].rows;
  const first = photos.slice(0, n);
  return Array.from({ length: s.copies }, (_, i) => {
    const set = photos.slice(i * n, (i + 1) * n);
    if (i > 0 && s.useSpares && set.length === n) return { photos: set, duplicate: false };
    return { photos: first, duplicate: i > 0 };
  });
}

/** Draws the full Instagram image at width w and height h. */
export function renderShare(
  photos: Photo[],
  stickers: Sticker[],
  s: Settings,
  placements: Placement[],
  w: number,
  h: number,
  stripScale: number,
): HTMLCanvasElement {
  // Stickers belong to strip 1's photos, so they repeat only on exact duplicates.
  const strips = photoSets(photos, s).map((set, i) =>
    renderStrip(set.photos, i === 0 || set.duplicate ? stickers : [], s, stripScale),
  );

  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = s.backdrop;
  ctx.fillRect(0, 0, w, h);
  const shade = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);

  for (const p of placements) {
    const strip = strips[p.copy];
    if (!strip) continue;
    const dh = p.h * h;
    const dw = (dh * strip.width) / strip.height;
    ctx.save();
    ctx.translate(p.x * w, p.y * h);
    ctx.rotate(p.rot);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 0.037 * w;
    ctx.shadowOffsetY = 0.017 * w;
    ctx.drawImage(strip, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
  return c;
}

export function renderForSave(kind: SaveKind, photos: Photo[], stickers: Sticker[], s: Settings, placements: Placement[]): HTMLCanvasElement {
  if (kind === 'strip') return renderStrip(photos, stickers, s, 2);
  const f = FORMATS[kind];
  return renderShare(photos, stickers, s, placements, f.w, f.h, 2);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
