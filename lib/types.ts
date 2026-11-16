export type LayoutKey = 'strip4' | 'strip3' | 'strip2' | 'grid4' | 'single';
export type FilmKey = 'silver' | 'sepia' | 'faded' | 'drugstore' | 'carnival' | 'none';
export type SaveKind = 'strip' | 'story' | 'post';
export type StickerKey = 'heart' | 'star' | 'flash' | 'sparkle' | 'crown' | 'cherries' | 'xoxo';

export interface Layout {
  label: string;
  cols: number;
  rows: number;
  fw: number;
  fh: number;
}

export interface Film {
  label: string;
  sat: number;
  con: number;
  bri: number;
  fade: number;
  tint: [number, number, number];
}

export interface Swatch {
  name: string;
  hex: string;
}

export interface Photo {
  id: number;
  src: HTMLCanvasElement;
  w: number;
  h: number;
  /** Crop offset inside the frame, from -1 to 1 on each axis. */
  ox: number;
  oy: number;
  thumb: string;
}

export interface Sticker {
  id: number;
  kind: StickerKey;
  /** Position in strip units (see geometry()). */
  x: number;
  y: number;
  size: number;
  rot: number;
}

export interface Settings {
  layout: LayoutKey;
  film: FilmKey;
  grain: number;
  vignette: number;
  leak: number;
  wear: number;
  paper: string;
  backdrop: string;
  caption: string;
  dateOn: boolean;
  date: string;
  timer: number;
}

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}
