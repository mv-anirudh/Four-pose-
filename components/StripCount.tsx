'use client';

import { MAX_COPIES } from '@/lib/options';
import { photoSets } from '@/lib/render';
import type { Photo, Settings } from '@/lib/types';

interface Props {
  settings: Settings;
  photos: Photo[];
  slots: number;
  onChange: (patch: Partial<Settings>) => void;
}

/** How many strips the booth prints, set on the stage right above the slot they drop from. */
export default function StripCount({ settings, photos, slots, onChange }: Props) {
  return (
    <div className="strip-count">
      <div className="choices" role="group" aria-label="Strips to print">
        {Array.from({ length: MAX_COPIES }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className="btn" aria-pressed={settings.copies === n} onClick={() => onChange({ copies: n })}>
            {n === 1 ? '1 strip' : `${n} strips`}
          </button>
        ))}
      </div>
      {settings.copies > 1 && (
        <label className="check">
          <input type="checkbox" checked={settings.useSpares} onChange={(e) => onChange({ useSpares: e.target.checked })} />
          <span>{spareNote(photos, settings, slots)}</span>
        </label>
      )}
    </div>
  );
}

function spareNote(photos: Photo[], settings: Settings, slots: number): string {
  const sets = photoSets(photos, { ...settings, useSpares: true });
  const filled = sets.filter((x, i) => i > 0 && !x.duplicate).length;
  if (filled === 0) return `Use spare photos on extra strips (add ${slots} more to fill strip 2)`;
  return `Use spare photos on extra strips (${filled} of ${settings.copies - 1} can be filled)`;
}
