import type { Swatch } from '@/lib/types';

export default function Swatches({ list, value, onPick }: { list: Swatch[]; value: string; onPick: (hex: string) => void }) {
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
