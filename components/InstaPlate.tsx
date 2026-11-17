'use client';

import { useState } from 'react';
import { ARRANGEMENTS, BACKDROPS, FORMATS } from '@/lib/options';
import type { Arrangement, Photo, Placement, SaveKind, Settings, ShareFormat, Sticker } from '@/lib/types';
import SharePreview from './SharePreview';
import StripCount from './StripCount';
import Swatches from './Swatches';

interface Props {
  settings: Settings;
  photos: Photo[];
  stickers: Sticker[];
  placements: Placement[];
  selectedCopy: number;
  canShare: boolean;
  /** Frames per strip in the current layout. */
  slots: number;
  /** Message from the last download or share here, shown under its buttons. */
  status: string;
  onChange: (patch: Partial<Settings>) => void;
  onSelectCopy: (copy: number) => void;
  onMovePlacement: (copy: number, x: number, y: number) => void;
  onTilt: (copy: number, rot: number) => void;
  onResetPlacements: () => void;
  onSave: (kind: SaveKind) => void;
  onShare: () => void;
}

/**
 * The one plate under the masthead: how many strips to print, and the Instagram image.
 * The Instagram controls stay closed until asked for, so the strips lead the page.
 * Booth shows this plate only once there is a photo.
 */
export default function InstaPlate(p: Props) {
  const { settings, photos, onChange } = p;
  const [open, setOpen] = useState(false);
  const f = FORMATS[settings.format];
  const copies = settings.copies;
  const summary = `${f.label} ${f.ratio} · ${copies === 1 ? '1 strip' : `${copies} strips`}`;

  return (
    <section className={open ? 'plate insta is-open' : 'plate insta'} aria-label="Strips and Instagram image">
      <div className="plate-bar">
        <StripCount settings={settings} photos={photos} slots={p.slots} onChange={onChange} />
        <button className="btn" type="button" aria-expanded={open} aria-controls="insta-body" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close Instagram image' : 'Make Instagram image'}
        </button>
      </div>

      {open && (
        <div className="insta-body" id="insta-body">
          <div className="insta-head">
            <h2>Instagram image</h2>
            <p className="insta-summary">{summary}</p>
          </div>
          <div className="insta-cols">
            <div className="insta-view">
              <div className="choices" role="group" aria-label="Image size">
                {(Object.keys(FORMATS) as ShareFormat[]).map((key) => (
                  <button key={key} type="button" className="btn" aria-pressed={settings.format === key} onClick={() => onChange({ format: key })}>
                    {FORMATS[key].label} <span className="ratio">{FORMATS[key].ratio}</span>
                  </button>
                ))}
              </div>

              <SharePreview
                photos={photos}
                stickers={p.stickers}
                settings={settings}
                placements={p.placements}
                selected={p.selectedCopy}
                onSelect={p.onSelectCopy}
                onMove={p.onMovePlacement}
              />
              <p className="note">
                {copies > 1
                  ? 'Drag a strip to move it, or pick it below and use the arrow keys on the preview.'
                  : 'Drag the strip to move it, or use the arrow keys on the preview.'}
              </p>
            </div>

            <div className="insta-controls">
              {copies > 1 && (
                <div className="field field-stack" role="group" aria-labelledby="pick-label">
                  <span id="pick-label">Strip to adjust</span>
                  <div className="choices">
                    {Array.from({ length: copies }, (_, i) => (
                      <button key={i} type="button" className="btn" aria-pressed={p.selectedCopy === i} onClick={() => p.onSelectCopy(i)}>
                        Strip {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <TiltField placements={p.placements} selected={p.selectedCopy} onTilt={p.onTilt} />

              {copies > 1 && (
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

              <div className="field field-stack" role="group" aria-labelledby="backdrop-label">
                <span id="backdrop-label">Backdrop</span>
                <Swatches list={BACKDROPS} value={settings.backdrop} onPick={(backdrop) => onChange({ backdrop })} />
              </div>

              <div className="insta-actions">
                <button className="btn btn-primary btn-wide" type="button" onClick={() => p.onSave(settings.format)}>
                  Download {f.label.toLowerCase()} <span className="ratio">{f.ratio}</span>
                </button>
                {p.canShare && (
                  <button className="btn" type="button" onClick={p.onShare}>
                    Share
                  </button>
                )}
              </div>
              <p className="status" role="status">
                {p.status}
              </p>
              <button className="btn btn-quiet" type="button" onClick={p.onResetPlacements}>
                Reset arrangement
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
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
