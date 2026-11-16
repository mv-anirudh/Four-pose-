'use client';

import { BACKDROPS, FILMS, LAYOUTS, MAX_PHOTOS, PAPERS, STICKERS, slotCount } from '@/lib/options';
import type { FilmKey, LayoutKey, Photo, SaveKind, Settings, Swatch } from '@/lib/types';

interface Props {
  settings: Settings;
  photos: Photo[];
  status: string;
  stickerCount: number;
  canShare: boolean;
  onChange: (patch: Partial<Settings>) => void;
  onLayout: (layout: LayoutKey) => void;
  onPickFiles: () => void;
  onOpenCamera: () => void;
  onMoveEarlier: (index: number) => void;
  onRemovePhoto: (index: number) => void;
  onAddSticker: (ch: string) => void;
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
  if (count === 0) return `Add up to ${MAX_PHOTOS} photos. The first ones fill the strip.`;
  const spare = count - slots;
  if (spare > 0) {
    return `This layout uses the first ${slots}. The ${spare} faded ${spare === 1 ? 'photo is' : 'photos are'} spare. Move one earlier to use it.`;
  }
  if (count < slots) return `This layout has room for ${slots - count} more.`;
  return 'The strip is full.';
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
        <ul className="tray">
          {photos.map((p, i) => (
            <li key={p.id} className={i >= slots ? 'is-spare' : undefined}>
              {/* Thumbnails are small data URLs made in the browser, so next/image adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={i < slots ? `Photo ${i + 1}, in the strip` : `Photo ${i + 1}, not in the strip`} />
              <div className="tray-actions">
                <button
                  type="button"
                  title="Move earlier"
                  aria-label={`Move photo ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => props.onMoveEarlier(i)}
                >
                  ‹
                </button>
                <button type="button" title="Remove" aria-label={`Remove photo ${i + 1}`} onClick={() => props.onRemovePhoto(i)}>
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
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
          {STICKERS.map((ch) => (
            <button key={ch} type="button" aria-label={`Add ${ch} sticker`} onClick={() => props.onAddSticker(ch)}>
              {ch}
            </button>
          ))}
        </div>
        {props.stickerCount > 0 && (
          <button className="btn btn-quiet" type="button" onClick={props.onClearStickers}>
            Remove all stickers
          </button>
        )}
      </div>

      <div className="group group-save">
        <h2>Save</h2>
        <button className="btn btn-primary btn-download" type="button" onClick={() => props.onSave('strip')}>
          Download strip
        </button>

        <div className="insta" role="group" aria-labelledby="insta-label">
          <h3 id="insta-label">For Instagram</h3>
          <p className="note">The strip sits on a backdrop. Pick its colour, then a size.</p>
          <Swatches list={BACKDROPS} value={settings.backdrop} onPick={(backdrop) => onChange({ backdrop })} />
          <div className="insta-sizes">
            <button className="btn" type="button" onClick={() => props.onSave('story')}>
              Download Story <span className="ratio">9:16</span>
            </button>
            <button className="btn" type="button" onClick={() => props.onSave('post')}>
              Download post <span className="ratio">4:5</span>
            </button>
          </div>
          {props.canShare && (
            <button className="btn btn-quiet" type="button" onClick={props.onShare}>
              Share Story
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
