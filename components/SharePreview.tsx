'use client';

import { useEffect, useRef, useState } from 'react';
import { FORMATS } from '@/lib/options';
import { clamp, ctx2d, renderShare, stripAspect } from '@/lib/render';
import type { Photo, Placement, Settings, Sticker } from '@/lib/types';

interface Props {
  photos: Photo[];
  stickers: Sticker[];
  settings: Settings;
  placements: Placement[];
  selected: number;
  onSelect: (copy: number) => void;
  onMove: (copy: number, x: number, y: number) => void;
}

/** Preview width in canvas pixels; half the export size keeps redraws quick. */
const PREVIEW_W = 540;

/**
 * Live preview of the Instagram image, drawn with the same code as the download.
 * Drag a strip to move it; the one you touched last is the one Tilt changes.
 */
export default function SharePreview({ photos, stickers, settings, placements, selected, onSelect, onMove }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ copy: number; dx: number; dy: number } | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const f = FORMATS[settings.format];
  const H = Math.round((PREVIEW_W * f.h) / f.w);
  const aspect = stripAspect(settings.layout);

  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => alive && setFontTick((t) => t + 1));
    return () => {
      alive = false;
    };
  }, []);

  // Film effects are per pixel, so wait for a short pause in slider drags before redrawing.
  useEffect(() => {
    const t = setTimeout(() => {
      const c = ref.current;
      if (!c) return;
      ctx2d(c).drawImage(renderShare(photos, stickers, settings, placements, PREVIEW_W, H, 0.5), 0, 0);
    }, 60);
    return () => clearTimeout(t);
  }, [photos, stickers, settings, placements, H, fontTick]);

  const toNorm = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  /** The topmost strip under the point, checked against its rotated outline. */
  const hit = (nx: number, ny: number): Placement | null => {
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      const dh = p.h * H;
      const dw = dh * aspect;
      const px = (nx - p.x) * PREVIEW_W;
      const py = (ny - p.y) * H;
      const lx = px * Math.cos(-p.rot) - py * Math.sin(-p.rot);
      const ly = px * Math.sin(-p.rot) + py * Math.cos(-p.rot);
      if (Math.abs(lx) <= dw / 2 && Math.abs(ly) <= dh / 2) return p;
    }
    return null;
  };

  const selectedPlacement = placements.find((p) => p.copy === selected);

  return (
    <div className="window">
      <div className="window-glass" style={{ aspectRatio: `${f.w} / ${f.h}`, width: `min(${Math.round((440 * f.w) / f.h)}px, 76vw)` }}>
        <canvas
          ref={ref}
          width={PREVIEW_W}
          height={H}
          aria-label={`Preview of your Instagram ${f.label.toLowerCase()} with ${placements.length} ${placements.length === 1 ? 'strip' : 'strips'}`}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            const pt = toNorm(e);
            const p = hit(pt.x, pt.y);
            if (!p) return;
            onSelect(p.copy);
            drag.current = { copy: p.copy, dx: pt.x - p.x, dy: pt.y - p.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const pt = toNorm(e);
            onMove(d.copy, clamp(pt.x - d.dx, 0.04, 0.96), clamp(pt.y - d.dy, 0.04, 0.96));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        />
        {placements.length > 1 && selectedPlacement && (
          <span
            className="window-pick"
            aria-hidden="true"
            style={{
              left: `${selectedPlacement.x * 100}%`,
              top: `${selectedPlacement.y * 100}%`,
              width: `${((selectedPlacement.h * H * aspect) / PREVIEW_W) * 100}%`,
              height: `${selectedPlacement.h * 100}%`,
              transform: `translate(-50%, -50%) rotate(${selectedPlacement.rot}rad)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
