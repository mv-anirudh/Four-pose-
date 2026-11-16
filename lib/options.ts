import type { Film, FilmKey, Layout, LayoutKey, Settings, Swatch } from './types';

export const LAYOUTS: Record<LayoutKey, Layout> = {
  strip4: { label: '4 poses', cols: 1, rows: 4, fw: 568, fh: 426 },
  strip3: { label: '3 poses', cols: 1, rows: 3, fw: 568, fh: 426 },
  strip2: { label: '2 poses', cols: 1, rows: 2, fw: 568, fh: 568 },
  grid4: { label: '2 by 2', cols: 2, rows: 2, fw: 420, fh: 420 },
  single: { label: 'Single', cols: 1, rows: 1, fw: 640, fh: 640 },
};

export const MARGIN = 36;
export const GAP = 20;
export const FOOT = 150;

export const FILMS: Record<FilmKey, Film> = {
  silver: { label: 'Silver', sat: 0, con: 1.25, bri: 1.02, fade: 0.04, tint: [1, 1, 1] },
  sepia: { label: 'Sepia', sat: 0, con: 1.1, bri: 1.04, fade: 0.08, tint: [1.08, 0.95, 0.76] },
  faded: { label: "Faded '74", sat: 0.7, con: 0.92, bri: 1.04, fade: 0.14, tint: [1.06, 1, 0.88] },
  drugstore: { label: 'Drugstore', sat: 0.8, con: 1, bri: 1, fade: 0.1, tint: [0.94, 1.03, 1.02] },
  carnival: { label: 'Carnival', sat: 1.35, con: 1.15, bri: 1, fade: 0.02, tint: [1.04, 1, 0.96] },
  none: { label: 'As shot', sat: 1, con: 1, bri: 1, fade: 0, tint: [1, 1, 1] },
};

export const PAPERS: Swatch[] = [
  { name: 'Ivory', hex: '#efe9dc' },
  { name: 'White', hex: '#fafaf7' },
  { name: 'Black', hex: '#161514' },
  { name: 'Rose', hex: '#e7bfc0' },
  { name: 'Butter', hex: '#ebd28a' },
  { name: 'Booth green', hex: '#1f4d46' },
];

export const BACKDROPS: Swatch[] = [
  { name: 'Booth green', hex: '#17463f' },
  { name: 'Curtain red', hex: '#8e1f2b' },
  { name: 'Lamp amber', hex: '#e9ae3f' },
  { name: 'Ivory', hex: '#efe9dc' },
  { name: 'Black', hex: '#161514' },
];

export const STICKERS = ['❤️', '⭐', '🌸', '🎀', '💋', '✨', '🍒', '🦋'];
export const MAX_PHOTOS = 12;
export const MAX_SIDE = 1800;

export const DEFAULT_SETTINGS: Settings = {
  layout: 'strip4',
  film: 'silver',
  grain: 0.35,
  vignette: 0.4,
  leak: 0.2,
  wear: 0.25,
  paper: PAPERS[0].hex,
  backdrop: BACKDROPS[0].hex,
  caption: '',
  dateOn: true,
  date: '', // set on the client after mount, so server and browser render the same HTML
  timer: 3,
};

export function slotCount(layout: LayoutKey): number {
  const l = LAYOUTS[layout];
  return l.cols * l.rows;
}
