import { MAX_SIDE } from './options';
import { ctx2d, makeCanvas } from './render';
import type { Photo } from './types';

let nextId = 1;
export function newId(): number {
  return nextId++;
}

/** Copies an image or video frame into a size-capped canvas and makes a thumbnail. */
export function photoFromSource(source: CanvasImageSource, sw: number, sh: number): Photo {
  const s = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const c = makeCanvas(sw * s, sh * s);
  ctx2d(c).drawImage(source, 0, 0, c.width, c.height);

  const t = makeCanvas(140, 140);
  const ts = Math.max(140 / c.width, 140 / c.height);
  ctx2d(t).drawImage(c, (140 - c.width * ts) / 2, (140 - c.height * ts) / 2, c.width * ts, c.height * ts);

  return { id: newId(), src: c, w: c.width, h: c.height, ox: 0, oy: 0, thumb: t.toDataURL('image/jpeg', 0.7) };
}

export function loadFile(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(photoFromSource(img, img.naturalWidth, img.naturalHeight));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    img.src = url;
  });
}
