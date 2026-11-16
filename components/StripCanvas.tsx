'use client';

import { useEffect, useRef, useState } from 'react';
import { clamp, ctx2d, geometry, renderStrip } from '@/lib/render';
import type { Photo, Settings, Sticker } from '@/lib/types';

interface Props {
  photos: Photo[];
  stickers: Sticker[];
  settings: Settings;
  /** Plays the "strip drops out of the slot" animation when this mounts. */
  animate: boolean;
  onPanPhoto: (index: number, ox: number, oy: number) => void;
  onMoveSticker: (id: number, x: number, y: number) => void;
  onRemoveSticker: (id: number) => void;
  /** Called when someone clicks a frame that has no photo yet. */
  onEmptyFrame: () => void;
}

type Drag = { type: 'sticker'; id: number; x: number; y: number } | { type: 'photo'; index: number; x: number; y: number };

export default function StripCanvas({
  photos,
  stickers,
  settings,
  animate,
  onPanPhoto,
  onMoveSticker,
  onRemoveSticker,
  onEmptyFrame,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const g = geometry(settings.layout);

  // Redraw once the caption and date fonts have loaded.
  useEffect(() => {
    let alive = true;
    if (document.fonts) {
      Promise.all([document.fonts.load('24px "Special Elite"'), document.fonts.load('600 56px "Caveat"')])
        .catch(() => undefined)
        .then(() => {
          if (alive) setFontTick((t) => t + 1);
        });
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      ctx2d(canvas).drawImage(renderStrip(photos, stickers, settings, 1), 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [photos, stickers, settings, fontTick]);

  const toStrip = (e: React.PointerEvent | React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * g.W) / r.width, y: ((e.clientY - r.top) * g.H) / r.height };
  };
  const hitSticker = (pt: { x: number; y: number }) => {
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i];
      if (Math.abs(pt.x - s.x) < s.size * 0.6 && Math.abs(pt.y - s.y) < s.size * 0.6) return s;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toStrip(e);
    const sticker = hitSticker(pt);
    if (sticker) {
      drag.current = { type: 'sticker', id: sticker.id, ...pt };
    } else {
      const index = g.frames.findIndex((f) => pt.x >= f.x && pt.x <= f.x + f.w && pt.y >= f.y && pt.y <= f.y + f.h);
      if (index >= 0 && photos[index]) drag.current = { type: 'photo', index, ...pt };
      else if (index >= 0) onEmptyFrame();
    }
    if (drag.current) e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const pt = toStrip(e);
    const dx = pt.x - d.x;
    const dy = pt.y - d.y;
    d.x = pt.x;
    d.y = pt.y;
    if (d.type === 'sticker') {
      const s = stickers.find((st) => st.id === d.id);
      if (s) onMoveSticker(s.id, clamp(s.x + dx, 0, g.W), clamp(s.y + dy, 0, g.H));
      return;
    }
    const p = photos[d.index];
    const f = g.frames[d.index];
    if (!p || !f) return;
    const fit = Math.max(f.w / p.w, f.h / p.h);
    const ex = p.w * fit - f.w;
    const ey = p.h * fit - f.h;
    onPanPhoto(
      d.index,
      ex > 0.5 ? clamp(p.ox - (2 * dx) / ex, -1, 1) : p.ox,
      ey > 0.5 ? clamp(p.oy - (2 * dy) / ey, -1, 1) : p.oy,
    );
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className={animate ? 'strip-wrap is-printing' : 'strip-wrap'}>
      <canvas
        ref={canvasRef}
        id="strip"
        className={photos.length < g.frames.length ? 'is-empty' : undefined}
        style={{ '--strip-w': g.W, '--strip-h': g.H } as React.CSSProperties}
        width={g.W}
        height={g.H}
        aria-label="Preview of your photo strip"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) => {
          const s = hitSticker(toStrip(e));
          if (s) onRemoveSticker(s.id);
        }}
      />
    </div>
  );
}
