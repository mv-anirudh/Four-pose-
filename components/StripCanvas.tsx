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
  onSwapPhotos: (from: number, to: number) => void;
  onMoveSticker: (id: number, x: number, y: number) => void;
  onRemoveSticker: (id: number) => void;
  /** Called when someone clicks a frame that has no photo yet. */
  onEmptyFrame: () => void;
}

/** How long a press must hold still before the photo lifts out of its frame. */
const HOLD_MS = 380;
/** Movement (screen px) that turns a press into a pan instead of a lift. */
const SLOP = 7;

type Drag =
  | { type: 'sticker'; id: number; x: number; y: number }
  | { type: 'press'; index: number; x: number; y: number; cx: number; cy: number; timer: number }
  | { type: 'pan'; index: number; x: number; y: number }
  | { type: 'lift'; index: number };

interface Lift {
  from: number;
  over: number;
  /** Pointer position inside the strip, as fractions of its size. */
  fx: number;
  fy: number;
}

export default function StripCanvas({
  photos,
  stickers,
  settings,
  animate,
  onPanPhoto,
  onSwapPhotos,
  onMoveSticker,
  onRemoveSticker,
  onEmptyFrame,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const [lift, setLift] = useState<Lift | null>(null);
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

  // Clear any pending hold timer if the strip unmounts mid-press.
  useEffect(
    () => () => {
      const d = drag.current;
      if (d?.type === 'press') clearTimeout(d.timer);
    },
    [],
  );

  const toStrip = (e: React.PointerEvent | React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * g.W) / r.width, y: ((e.clientY - r.top) * g.H) / r.height };
  };
  const frameAt = (pt: { x: number; y: number }) =>
    g.frames.findIndex((f) => pt.x >= f.x && pt.x <= f.x + f.w && pt.y >= f.y && pt.y <= f.y + f.h);
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
      const index = frameAt(pt);
      if (index >= 0 && photos[index]) {
        const timer = window.setTimeout(() => {
          const d = drag.current;
          if (d?.type !== 'press') return;
          drag.current = { type: 'lift', index: d.index };
          setLift({ from: d.index, over: d.index, fx: d.x / g.W, fy: d.y / g.H });
          navigator.vibrate?.(12);
        }, HOLD_MS);
        drag.current = { type: 'press', index, ...pt, cx: e.clientX, cy: e.clientY, timer };
      } else if (index >= 0) {
        onEmptyFrame();
      }
    }
    if (drag.current) e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const pt = toStrip(e);

    if (d.type === 'lift') {
      const over = frameAt(pt);
      setLift({ from: d.index, over: over >= 0 && over < photos.length ? over : -1, fx: pt.x / g.W, fy: pt.y / g.H });
      return;
    }
    if (d.type === 'press') {
      if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < SLOP) return;
      clearTimeout(d.timer);
      drag.current = { type: 'pan', index: d.index, x: d.x, y: d.y };
    }
    const cur = drag.current;
    if (!cur || cur.type === 'lift' || cur.type === 'press') return;
    const dx = pt.x - cur.x;
    const dy = pt.y - cur.y;
    cur.x = pt.x;
    cur.y = pt.y;

    if (cur.type === 'sticker') {
      const s = stickers.find((st) => st.id === cur.id);
      if (s) onMoveSticker(s.id, clamp(s.x + dx, 0, g.W), clamp(s.y + dy, 0, g.H));
      return;
    }
    const p = photos[cur.index];
    const f = g.frames[cur.index];
    if (!p || !f) return;
    const fit = Math.max(f.w / p.w, f.h / p.h);
    const ex = p.w * fit - f.w;
    const ey = p.h * fit - f.h;
    onPanPhoto(
      cur.index,
      ex > 0.5 ? clamp(p.ox - (2 * dx) / ex, -1, 1) : p.ox,
      ey > 0.5 ? clamp(p.oy - (2 * dy) / ey, -1, 1) : p.oy,
    );
  };

  const endDrag = (commit: boolean) => {
    const d = drag.current;
    if (d?.type === 'press') clearTimeout(d.timer);
    if (commit && d?.type === 'lift' && lift && lift.over >= 0 && lift.over !== lift.from) {
      onSwapPhotos(lift.from, lift.over);
    }
    drag.current = null;
    setLift(null);
  };

  const box = (i: number) => {
    const f = g.frames[i];
    return { left: `${(f.x / g.W) * 100}%`, top: `${(f.y / g.H) * 100}%`, width: `${(f.w / g.W) * 100}%`, height: `${(f.h / g.H) * 100}%` };
  };
  const lifted = lift ? photos[lift.from] : null;
  const fw = lift ? g.frames[lift.from].w / g.W : 0;

  return (
    <div className={animate ? 'strip-wrap is-printing' : 'strip-wrap'}>
      <div className={lift ? 'strip-holder is-lifting' : 'strip-holder'}>
        <canvas
          ref={canvasRef}
          id="strip"
          className={photos.length < g.frames.length ? 'is-empty' : undefined}
          style={{ '--strip-w': g.W, '--strip-h': g.H } as React.CSSProperties}
          width={g.W}
          height={g.H}
          aria-label="Preview of your photo strip"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => endDrag(true)}
          onPointerCancel={() => endDrag(false)}
          onDoubleClick={(e) => {
            const s = hitSticker(toStrip(e));
            if (s) onRemoveSticker(s.id);
          }}
        />
        {lift && (
          <>
            <span className="frame-mark frame-from" style={box(lift.from)} aria-hidden="true" />
            {lift.over >= 0 && lift.over !== lift.from && (
              <span className="frame-mark frame-over" style={box(lift.over)} aria-hidden="true" />
            )}
            {lifted && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="lifted"
                src={lifted.thumb}
                alt=""
                style={{ left: `${lift.fx * 100}%`, top: `${lift.fy * 100}%`, width: `${fw * 70}%` }}
              />
            )}
          </>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {lift
          ? lift.over >= 0 && lift.over !== lift.from
            ? `Release to swap photo ${lift.from + 1} with photo ${lift.over + 1}.`
            : `Photo ${lift.from + 1} picked up. Drag it onto another frame.`
          : ''}
      </p>
    </div>
  );
}
