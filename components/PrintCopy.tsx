'use client';

import { useEffect, useRef, useState } from 'react';
import { ctx2d, geometry, renderStrip } from '@/lib/render';
import type { Photo, Settings, Sticker } from '@/lib/types';

interface Props {
  photos: Photo[];
  stickers: Sticker[];
  settings: Settings;
  /** Short caption under the strip, such as "Strip 2 · copy of strip 1". */
  caption: string;
}

/**
 * An extra strip from the same session, shown beside strip 1 on the stage.
 * It is drawn with the same renderStrip() as the downloads, and it is read-only:
 * editing happens on strip 1.
 */
export default function PrintCopy({ photos, stickers, settings, caption }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fontTick, setFontTick] = useState(0);
  const g = geometry(settings.layout);

  // Redraw once the caption and date fonts have loaded.
  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => alive && setFontTick((t) => t + 1));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = ref.current;
      if (!canvas) return;
      ctx2d(canvas).drawImage(renderStrip(photos, stickers, settings, 1), 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [photos, stickers, settings, fontTick]);

  return (
    <figure className="print">
      {/* Each extra strip drops out of the slot when it is added. */}
      <div className="strip-wrap is-printing">
        <canvas
          ref={ref}
          className="print-copy"
          width={g.W}
          height={g.H}
          style={{ '--strip-w': g.W, '--strip-h': g.H } as React.CSSProperties}
          aria-label={caption}
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
