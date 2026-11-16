'use client';

import { ARRANGEMENTS, BACKDROPS, FORMATS, MAX_COPIES } from '@/lib/options';
import { photoSets } from '@/lib/render';
import type { Arrangement, Photo, Placement, SaveKind, Settings, ShareFormat, Sticker } from '@/lib/types';
import SharePreview from './SharePreview';
import Swatches from './Swatches';

interface Props {
  settings: Settings;
  photos: Photo[];
  stickers: Sticker[];
  placements: Placement[];
  selectedCopy: number;
  canShare: boolean;
  slots: number;
  onChange: (patch: Partial<Settings>) => void;
  onSelectCopy: (copy: number) => void;
  onMovePlacement: (copy: number, x: number, y: number) => void;
  onTilt: (copy: number, rot: number) => void;
  onResetPlacements: () => void;
  onSave: (kind: SaveKind) => void;
  onShare: () => void;
}

/** The Instagram image controls, on an ivory plate on the stage under the masthead. */
export default function InstaPlate(p: Props) {
  const { settings, photos, slots, onChange } = p;
  return (
    <section className="plate insta" aria-labelledby="insta-label">
      <h2 id="insta-label">Instagram image</h2>
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
          <p className="note">{settings.copies > 1 ? 'Drag a strip to move it. The outlined strip is the one Tilt changes.' : 'Drag the strip to move it.'}</p>
        </div>
        <div className="insta-controls">
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

          <TiltField placements={p.placements} selected={p.selectedCopy} onTilt={p.onTilt} />

          <div className="field field-stack">
            <span>Backdrop</span>
            <Swatches list={BACKDROPS} value={settings.backdrop} onPick={(backdrop) => onChange({ backdrop })} />
          </div>

          <div className="insta-actions">
            <button className="btn btn-wide" type="button" onClick={() => p.onSave(settings.format)}>
              Download {FORMATS[settings.format].label.toLowerCase()} <span className="ratio">{FORMATS[settings.format].ratio}</span>
            </button>
            {p.canShare && (
              <button className="btn" type="button" onClick={p.onShare}>
                Share
              </button>
            )}
          </div>
          <button className="btn btn-quiet" type="button" onClick={p.onResetPlacements}>
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
