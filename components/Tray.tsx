'use client';

import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@/lib/types';

interface Props {
  photos: Photo[];
  /** How many photos the current layout puts on strip 1. */
  slots: number;
  onMove: (from: number, to: number) => void;
  onMoveEarlier: (index: number) => void;
  onRemove: (index: number) => void;
}

const HOLD_MS = 380;
const SLOP = 7;

type Press = { index: number; x: number; y: number; timer: number; lifted: boolean };

/**
 * Thumbnails of every photo. Hold one to pick it up, then drop it on another
 * slot to move it there. The buttons under each photo do the same by keyboard.
 */
export default function Tray({ photos, slots, onMove, onMoveEarlier, onRemove }: Props) {
  const press = useRef<Press | null>(null);
  const [lift, setLift] = useState<{ from: number; over: number; x: number; y: number } | null>(null);

  // While a photo is held, stop the page from scrolling under the finger.
  useEffect(() => {
    if (!lift) return;
    const block = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', block, { passive: false });
    return () => document.removeEventListener('touchmove', block);
  }, [lift]);

  useEffect(
    () => () => {
      if (press.current) clearTimeout(press.current.timer);
    },
    [],
  );

  const slotAt = (x: number, y: number): number => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]');
    return el ? Number(el.dataset.slot) : -1;
  };

  const end = (commit: boolean) => {
    const p = press.current;
    if (p) clearTimeout(p.timer);
    if (commit && lift && lift.over >= 0 && lift.over !== lift.from) onMove(lift.from, lift.over);
    press.current = null;
    setLift(null);
  };

  const label = (i: number) => (i < slots ? `Photo ${i + 1}, on strip 1` : `Photo ${i + 1}, spare`);

  return (
    <>
      <ul className={lift ? 'tray is-lifting' : 'tray'}>
        {photos.map((p, i) => {
          const classes = [
            i >= slots ? 'is-spare' : '',
            lift?.from === i ? 'is-from' : '',
            lift && lift.over === i && lift.from !== i ? 'is-over' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={p.id} data-slot={i} className={classes || undefined}>
              {/* Thumbnails are small data URLs made in the browser, so next/image adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumb}
                alt={label(i)}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  const x = e.clientX;
                  const y = e.clientY;
                  const timer = window.setTimeout(() => {
                    if (!press.current) return;
                    press.current.lifted = true;
                    setLift({ from: i, over: i, x, y });
                    navigator.vibrate?.(12);
                  }, HOLD_MS);
                  press.current = { index: i, x, y, timer, lifted: false };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  const pr = press.current;
                  if (!pr) return;
                  if (!pr.lifted) {
                    // Moving before the hold completes is a scroll, not a pick-up.
                    if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > SLOP) end(false);
                    return;
                  }
                  setLift({ from: pr.index, over: slotAt(e.clientX, e.clientY), x: e.clientX, y: e.clientY });
                }}
                onPointerUp={() => end(true)}
                onPointerCancel={() => end(false)}
              />
              <span className="tray-num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="tray-actions">
                <button
                  type="button"
                  title="Move earlier"
                  aria-label={`Move photo ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => onMoveEarlier(i)}
                >
                  ‹
                </button>
                <button type="button" title="Remove" aria-label={`Remove photo ${i + 1}`} onClick={() => onRemove(i)}>
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {lift && photos[lift.from] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="tray-ghost" src={photos[lift.from].thumb} alt="" style={{ left: lift.x, top: lift.y }} />
      )}
      <p className="sr-only" aria-live="polite">
        {lift
          ? lift.over >= 0 && lift.over !== lift.from
            ? `Release to move photo ${lift.from + 1} to slot ${lift.over + 1}.`
            : `Photo ${lift.from + 1} picked up.`
          : ''}
      </p>
    </>
  );
}
