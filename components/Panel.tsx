'use client';

import { useEffect, useRef } from 'react';
import { FILMS, LAYOUTS, MAX_PHOTOS, PAPERS, STICKERS, slotCount } from '@/lib/options';
import { ctx2d, drawSticker } from '@/lib/render';
import type { FilmKey, LayoutKey, Photo, SaveKind, Settings, Sticker, StickerKey } from '@/lib/types';
import Swatches from './Swatches';
import Tray from './Tray';

/** A small preview drawn with the same code as the strip, so the button shows exactly what gets added. */
function StickerIcon({ kind }: { kind: StickerKey }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    const paint = () => {
      const c = ref.current;
      if (!c || !alive) return;
      const ctx = ctx2d(c);
      const dpr = window.devicePixelRatio || 1;
      c.width = 36 * dpr;
      c.height = 36 * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 18 * dpr, 18 * dpr);
      drawSticker(ctx, kind, 26);
    };
    paint();
    // Redraw once the handwriting face has loaded, for the xoxo sticker.
    void document.fonts?.ready.then(paint);
    return () => {
      alive = false;
    };
  }, [kind]);
  return <canvas ref={ref} width={36} height={36} aria-hidden="true" />;
}

interface Props {
  settings: Settings;
  photos: Photo[];
  status: string;
  stickers: Sticker[];
  /** How many strips are on the stage right now. */
  stripsShown: number;
  onChange: (patch: Partial<Settings>) => void;
  onLayout: (layout: LayoutKey) => void;
  onPickFiles: () => void;
  onOpenCamera: () => void;
  onMoveEarlier: (index: number) => void;
  onMovePhoto: (from: number, to: number) => void;
  onRemovePhoto: (index: number) => void;
  onAddSticker: (kind: StickerKey) => void;
  onClearStickers: () => void;
  onSave: (kind: SaveKind) => void;
}

function trayNote(count: number, slots: number): string {
  if (count === 0) return `Add up to ${MAX_PHOTOS} photos. The first ${slots} fill the strip.`;
  const spare = count - slots;
  if (spare > 0) {
    return `The first ${slots} are on strip 1. Spare photos fill the extra strips when you print 2 or 3 strips. Hold a photo and drag it to change its place.`;
  }
  if (count < slots) return `This layout has room for ${slots - count} more.`;
  return 'The strip is full. Hold a photo and drag it to change its place.';
}

const SLIDERS: { key: 'grain' | 'vignette' | 'leak' | 'wear'; label: string }[] = [
  { key: 'grain', label: 'Grain' },
  { key: 'vignette', label: 'Dark corners' },
  { key: 'leak', label: 'Light leak' },
  { key: 'wear', label: 'Dust and scratches' },
];

export default function Panel(props: Props) {
  const { settings, photos, status, onChange } = props;
  const slots = slotCount(settings.layout);

  return (
    <section className="panel" aria-label="Strip settings">
      <p className="status" role="status" aria-live="polite">
        {status}
      </p>

      <div className="group">
        <h2>Photos</h2>
        <div className="row">
          <button className="btn btn-primary" type="button" onClick={props.onPickFiles}>
            Add photos
          </button>
          <button className="btn" type="button" onClick={props.onOpenCamera}>
            Use camera
          </button>
        </div>
        <p className="note">{trayNote(photos.length, slots)}</p>
        <Tray
          photos={photos}
          slots={slots}
          onMove={props.onMovePhoto}
          onMoveEarlier={props.onMoveEarlier}
          onRemove={props.onRemovePhoto}
        />
        <div className="field field-stack" role="group" aria-labelledby="countdown-label">
          <span id="countdown-label">Camera countdown</span>
          <div className="choices">
            {[3, 5, 10].map((sec) => (
              <button
                key={sec}
                type="button"
                className="btn"
                aria-pressed={settings.timer === sec}
                onClick={() => onChange({ timer: sec })}
              >
                {sec} seconds
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="group">
        <h2>Layout</h2>
        <div className="choices">
          {(Object.keys(LAYOUTS) as LayoutKey[]).map((key) => (
            <button key={key} type="button" className="btn" aria-pressed={settings.layout === key} onClick={() => props.onLayout(key)}>
              {LAYOUTS[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <h2>Film</h2>
        <div className="choices">
          {(Object.keys(FILMS) as FilmKey[]).map((key) => (
            <button key={key} type="button" className="btn" aria-pressed={settings.film === key} onClick={() => onChange({ film: key })}>
              {FILMS[key].label}
            </button>
          ))}
        </div>
        {SLIDERS.map(({ key, label }) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings[key]}
              onChange={(e) => onChange({ [key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>

      <div className="group">
        <h2>Paper</h2>
        <Swatches list={PAPERS} value={settings.paper} onPick={(paper) => onChange({ paper })} />
      </div>

      <div className="group">
        <h2>Words</h2>
        <label className="field field-stack">
          <span>Caption</span>
          <input
            type="text"
            maxLength={28}
            placeholder="Kochi, with the gang"
            value={settings.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.dateOn} onChange={(e) => onChange({ dateOn: e.target.checked })} />
          <span>Stamp the date</span>
        </label>
        {settings.dateOn && (
          <label className="field field-inline">
            <span>Date</span>
            <input type="date" value={settings.date} onChange={(e) => onChange({ date: e.target.value })} />
          </label>
        )}
      </div>

      <div className="group">
        <h2>Stickers</h2>
        <div className="stickers">
          {STICKERS.map(({ key, label }) => (
            <button key={key} type="button" title={label} aria-label={`Add ${label} sticker`} onClick={() => props.onAddSticker(key)}>
              <StickerIcon kind={key} />
            </button>
          ))}
        </div>
        {props.stickers.length > 0 && (
          <button className="btn btn-quiet" type="button" onClick={props.onClearStickers}>
            Remove all stickers
          </button>
        )}
      </div>

      <div className="group group-save">
        <h2>Save</h2>
        <button className="btn btn-primary btn-download" type="button" onClick={() => props.onSave('strip')}>
          {props.stripsShown > 1 ? 'Download strip 1' : 'Download strip'}
        </button>

      </div>
    </section>
  );
}
