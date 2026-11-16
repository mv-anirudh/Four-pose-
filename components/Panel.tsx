'use client';

import { useEffect, useRef } from 'react';
import { ARRANGEMENTS, BACKDROPS, FILMS, FORMATS, LAYOUTS, MAX_COPIES, MAX_PHOTOS, PAPERS, STICKERS, slotCount } from '@/lib/options';
import { ctx2d, drawSticker } from '@/lib/render';
import { photoSets } from '@/lib/render';
import type { Arrangement, FilmKey, LayoutKey, Photo, Placement, SaveKind, Settings, ShareFormat, Sticker, StickerKey, Swatch } from '@/lib/types';
import SharePreview from './SharePreview';
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
  placements: Placement[];
  selectedCopy: number;
  canShare: boolean;
  onChange: (patch: Partial<Settings>) => void;
  onLayout: (layout: LayoutKey) => void;
  onPickFiles: () => void;
  onOpenCamera: () => void;
  onMoveEarlier: (index: number) => void;
  onMovePhoto: (from: number, to: number) => void;
  onSelectCopy: (copy: number) => void;
  onMovePlacement: (copy: number, x: number, y: number) => void;
  onTilt: (copy: number, rot: number) => void;
  onResetPlacements: () => void;
  onRemovePhoto: (index: number) => void;
  onAddSticker: (kind: StickerKey) => void;
  onClearStickers: () => void;
  onSave: (kind: SaveKind) => void;
  onShare: () => void;
}

function Swatches({ list, value, onPick }: { list: Swatch[]; value: string; onPick: (hex: string) => void }) {
  return (
    <div className="swatches">
      {list.map((item) => (
        <button
          key={item.hex}
          type="button"
          className="swatch"
          style={{ background: item.hex }}
          title={item.name}
          aria-label={item.name}
          aria-pressed={value === item.hex}
          onClick={() => onPick(item.hex)}
        />
      ))}
    </div>
  );
}

function trayNote(count: number, slots: number): string {
  if (count === 0) return `Add up to ${MAX_PHOTOS} photos. The first ${slots} fill the strip.`;
  const spare = count - slots;
  if (spare > 0) {
    return `The first ${slots} are on strip 1. Spare photos fill the extra strips you add under Save and share. Hold a photo and drag it to change its place.`;
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
        <h2>Save and share</h2>
        <button className="btn btn-primary btn-download" type="button" onClick={() => props.onSave('strip')}>
          Download strip
        </button>

        <div className="insta" role="group" aria-labelledby="insta-label">
          <h3 id="insta-label">Instagram image</h3>

          <div className="choices" role="group" aria-label="Image size">
            {(Object.keys(FORMATS) as ShareFormat[]).map((key) => (
              <button key={key} type="button" className="btn" aria-pressed={settings.format === key} onClick={() => onChange({ format: key })}>
                {FORMATS[key].label} <span className="ratio">{FORMATS[key].ratio}</span>
              </button>
            ))}
          </div>

          <SharePreview
            photos={photos}
            stickers={props.stickers}
            settings={settings}
            placements={props.placements}
            selected={props.selectedCopy}
            onSelect={props.onSelectCopy}
            onMove={props.onMovePlacement}
          />
          <p className="note">{settings.copies > 1 ? 'Drag a strip to move it. The outlined strip is the one Tilt changes.' : 'Drag the strip to move it.'}</p>

          <div className="field field-stack" role="group" aria-labelledby="copies-label">
            <span id="copies-label">Strips</span>
            <div className="choices">
              {Array.from({ length: MAX_COPIES }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className="btn" aria-pressed={settings.copies === n} onClick={() => onChange({ copies: n })}>
                  {n === 1 ? '1 strip' : `${n} strips`}
                </button>
              ))}
            </div>
          </div>

          {settings.copies > 1 && (
            <div className="field field-stack" role="group" aria-labelledby="arrange-label">
              <span id="arrange-label">Arrangement</span>
              <div className="choices">
                {(Object.keys(ARRANGEMENTS) as Arrangement[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="btn"
                    aria-pressed={settings.arrangement === key}
                    onClick={() => onChange({ arrangement: key })}
                  >
                    {ARRANGEMENTS[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {settings.copies > 1 && (
            <label className="check">
              <input type="checkbox" checked={settings.useSpares} onChange={(e) => onChange({ useSpares: e.target.checked })} />
              <span>{spareNote(photos, settings, slots)}</span>
            </label>
          )}

          <TiltField placements={props.placements} selected={props.selectedCopy} onTilt={props.onTilt} />

          <div className="field field-stack">
            <span>Backdrop</span>
            <Swatches list={BACKDROPS} value={settings.backdrop} onPick={(backdrop) => onChange({ backdrop })} />
          </div>

          <div className="insta-actions">
            <button className="btn btn-wide" type="button" onClick={() => props.onSave(settings.format)}>
              Download {FORMATS[settings.format].label.toLowerCase()} <span className="ratio">{FORMATS[settings.format].ratio}</span>
            </button>
            {props.canShare && (
              <button className="btn" type="button" onClick={props.onShare}>
                Share
              </button>
            )}
          </div>
          <button className="btn btn-quiet" type="button" onClick={props.onResetPlacements}>
            Reset arrangement
          </button>
        </div>
      </div>
    </section>
  );
}

function spareNote(photos: Photo[], settings: Settings, slots: number): string {
  const sets = photoSets(photos, { ...settings, useSpares: true });
  const filled = sets.filter((x, i) => i > 0 && !x.duplicate).length;
  if (filled === 0) return `Use spare photos on extra strips (add ${slots} more to fill strip 2)`;
  return `Use spare photos on extra strips (${filled} of ${settings.copies - 1} can be filled)`;
}

function TiltField({ placements, selected, onTilt }: { placements: Placement[]; selected: number; onTilt: (copy: number, rot: number) => void }) {
  const p = placements.find((x) => x.copy === selected) ?? placements[0];
  if (!p) return null;
  const deg = Math.round((p.rot * 180) / Math.PI);
  return (
    <label className="field">
      <span>{placements.length > 1 ? `Tilt strip ${p.copy + 1}` : 'Tilt'}</span>
      <input
        type="range"
        min={-20}
        max={20}
        step={1}
        value={deg}
        aria-valuetext={`${deg} degrees`}
        onChange={(e) => onTilt(p.copy, (Number(e.target.value) * Math.PI) / 180)}
      />
    </label>
  );
}
