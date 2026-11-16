'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CameraDialog from './CameraDialog';
import InstaPlate from './InstaPlate';
import Panel from './Panel';
import StripCanvas from './StripCanvas';
import StripCount from './StripCount';
import { DEFAULT_SETTINGS, MAX_PHOTOS, slotCount } from '@/lib/options';
import { loadFile, newId } from '@/lib/photos';
import { canvasToBlob, clamp, geometry, photoSets, presetPlacements, renderForSave, renderStrip, todayISO } from '@/lib/render';
import type { LayoutKey, Photo, Placement, SaveKind, Settings, Sticker, StickerKey } from '@/lib/types';

const fileName = (kind: SaveKind) => `four-poses-${kind}-${todayISO()}.png`;

export default function Booth() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [status, setStatus] = useState('');
  const [instaStatus, setInstaStatus] = useState('');
  const [printKey, setPrintKey] = useState(0);
  const [camOpen, setCamOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>(() =>
    presetPlacements(DEFAULT_SETTINGS.copies, DEFAULT_SETTINGS.arrangement, DEFAULT_SETTINGS.format, DEFAULT_SETTINGS.layout),
  );
  const [selectedCopy, setSelectedCopy] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickFiles = useCallback(() => fileInput.current?.click(), []);

  // Lets async handlers read the current photos without going stale.
  const photosRef = useRef<Photo[]>(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  // A new size, strip count, arrangement or layout starts from a fresh arrangement.
  const { copies, arrangement, format, layout } = settings;
  const resetPlacements = useCallback(() => {
    setPlacements(presetPlacements(copies, arrangement, format, layout));
    setSelectedCopy(0);
  }, [copies, arrangement, format, layout]);
  useEffect(() => {
    resetPlacements();
  }, [resetPlacements]);

  // Browser-only setup: today's date and whether this device can share files.
  useEffect(() => {
    update({ date: todayISO() });
    try {
      const probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
      setCanShare(Boolean(navigator.canShare?.({ files: [probe] })));
    } catch {
      setCanShare(false);
    }
  }, [update]);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) {
      setStatus('Those files are not photos. Choose JPG, PNG or WebP images.');
      return;
    }
    setStatus('');
    const before = photosRef.current.length;
    const room = MAX_PHOTOS - before;
    const loaded: Photo[] = [];
    const failed: string[] = [];
    let skipped = 0;
    for (const file of files) {
      if (loaded.length >= room) {
        skipped++;
        continue;
      }
      try {
        loaded.push(await loadFile(file));
      } catch {
        failed.push(file.name);
      }
    }
    const notes: string[] = [];
    if (failed.length) notes.push(`This browser can't open ${failed.join(', ')}. Convert HEIC photos to JPG, then add them again.`);
    if (skipped) notes.push(`The tray holds ${MAX_PHOTOS} photos, so ${skipped} were left out. Remove some to add more.`);
    setStatus(notes.join(' '));
    if (loaded.length) {
      setPhotos((prev) => [...prev, ...loaded].slice(0, MAX_PHOTOS));
      if (before === 0) setPrintKey((k) => k + 1);
    }
  }, []);

  // Drop or paste photos anywhere on the page.
  useEffect(() => {
    const over = (e: DragEvent) => {
      e.preventDefault();
      setDropping(true);
    };
    const leave = (e: DragEvent) => {
      if (!e.relatedTarget) setDropping(false);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setDropping(false);
      if (e.dataTransfer?.files.length) void addFiles(e.dataTransfer.files);
    };
    const paste = (e: ClipboardEvent) => {
      const files = e.clipboardData ? Array.from(e.clipboardData.files) : [];
      if (files.length) void addFiles(files);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('paste', paste);
    };
  }, [addFiles]);

  const changeLayout = (layout: LayoutKey) => {
    const g = geometry(layout);
    // Keep stickers inside the new strip size.
    setStickers((list) => list.map((s) => ({ ...s, x: clamp(s.x, 0, g.W), y: clamp(s.y, 0, g.H) })));
    update({ layout });
  };

  const addSticker = (kind: StickerKey) => {
    const g = geometry(settings.layout);
    setStickers((list) => [
      ...list,
      {
        id: newId(),
        kind,
        x: g.W * (0.2 + Math.random() * 0.6),
        y: g.H * (0.15 + Math.random() * 0.6),
        size: 72,
        rot: (Math.random() - 0.5) * 0.5,
      },
    ]);
  };

  const MAKE_FAILED = "The image couldn't be made. Try a smaller layout or fewer effects.";

  /** Saves a finished canvas as a PNG download. Returns an error message, or '' when it worked. */
  const download = async (canvas: HTMLCanvasElement, name: string): Promise<string> => {
    const blob = await canvasToBlob(canvas);
    if (!blob) return MAKE_FAILED;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return '';
  };

  // Strip downloads report in the panel; Instagram downloads report under their own buttons.
  const save = async (kind: SaveKind) => {
    const report = kind === 'strip' ? setStatus : setInstaStatus;
    if (!photos.length) {
      report('Add a photo first, then download.');
      return;
    }
    report(await download(renderForSave(kind, photos, stickers, settings, placements), fileName(kind)));
  };

  const share = async () => {
    if (!photos.length) {
      setInstaStatus('Add a photo first, then share.');
      return;
    }
    const blob = await canvasToBlob(renderForSave(settings.format, photos, stickers, settings, placements));
    if (!blob) {
      setInstaStatus(MAKE_FAILED);
      return;
    }
    setInstaStatus('');
    try {
      await navigator.share({ files: [new File([blob], fileName(settings.format), { type: 'image/png' })], title: 'Photo strip' });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setInstaStatus("Sharing didn't work here. Download the image and share it from your gallery.");
      }
    }
  };

  // Every strip from the Strips setting is shown on the stage and can be edited there.
  // A strip of spare photos edits those photos; a copy of strip 1 edits strip 1's photos,
  // so the copy and strip 1 always match (stickers only belong to strip 1 and its copies).
  const perStrip = slotCount(settings.layout);
  const strips = (photos.length ? photoSets(photos, settings) : [{ photos, duplicate: false }]).map((set, i) => {
    const spare = i > 0 && !set.duplicate;
    return {
      photos: set.photos,
      offset: spare ? i * perStrip : 0,
      stickers: spare ? [] : stickers,
      caption:
        i === 0
          ? 'Strip 1'
          : spare
            ? `Strip ${i + 1} · photos ${i * perStrip + 1}–${(i + 1) * perStrip}`
            : `Strip ${i + 1} · copy of strip 1, edits change both`,
    };
  });

  const panPhoto = (index: number, ox: number, oy: number) =>
    setPhotos((list) => list.map((p, i) => (i === index ? { ...p, ox, oy } : p)));
  const swapPhotos = (from: number, to: number) =>
    setPhotos((list) => {
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  const moveSticker = (id: number, x: number, y: number) =>
    setStickers((list) => list.map((s) => (s.id === id ? { ...s, x, y } : s)));
  const removeSticker = (id: number) => setStickers((list) => list.filter((s) => s.id !== id));

  // Each strip on the stage downloads on its own, drawn at export size like strip 1.
  const [stripStatus, setStripStatus] = useState('');
  const downloadStrip = async (i: number) => {
    const strip = strips[i];
    if (!strip) return;
    setStripStatus(await download(renderStrip(strip.photos, strip.stickers, settings, 2), `four-poses-strip-${i + 1}-${todayISO()}.png`));
  };

  const closeCamera = useCallback(() => setCamOpen(false), []);
  const cameraError = useCallback((message: string) => {
    setCamOpen(false);
    setStatus(message);
  }, []);
  const cameraDone = useCallback((taken: Photo[]) => {
    setCamOpen(false);
    setPhotos(taken);
    setPrintKey((k) => k + 1);
  }, []);

  return (
    <div className="booth">
      <aside className="sign" aria-hidden="true">
        <span>PHOTOS</span>
      </aside>
      <div className="trim" aria-hidden="true" />

      <main className={dropping ? 'stage is-dropping' : 'stage'}>
        <header className="masthead">
          <h1>Four Poses</h1>
          <p>Turn your photos into a photo booth strip. Nothing leaves this device.</p>
        </header>

        <InstaPlate
          settings={settings}
          photos={photos}
          stickers={stickers}
          placements={placements}
          selectedCopy={selectedCopy}
          canShare={canShare}
          status={instaStatus}
          onChange={update}
          onSelectCopy={setSelectedCopy}
          onMovePlacement={(copy, x, y) =>
            setPlacements((list) => {
              // The strip being moved comes to the front.
              const p = list.find((q) => q.copy === copy);
              return p ? [...list.filter((q) => q.copy !== copy), { ...p, x, y }] : list;
            })
          }
          onTilt={(copy, rot) => setPlacements((list) => list.map((p) => (p.copy === copy ? { ...p, rot } : p)))}
          onResetPlacements={resetPlacements}
          onSave={(kind) => void save(kind)}
          onShare={() => void share()}
        />

        {photos.length > 0 && <StripCount settings={settings} photos={photos} slots={perStrip} onChange={update} />}

        <div className="chute" style={{ '--copies': strips.length } as React.CSSProperties}>
          <div className="slot" />
          <div className="prints">
            {strips.map((strip, i) => (
              <figure className="print" key={i === 0 ? `strip-${printKey}` : `strip-${printKey}-${i}`}>
                <StripCanvas
                  animate={i > 0 || printKey > 0}
                  label={strips.length > 1 ? strip.caption : undefined}
                  photos={strip.photos}
                  stickers={strip.stickers}
                  settings={settings}
                  onPanPhoto={(index, ox, oy) => panPhoto(index + strip.offset, ox, oy)}
                  onSwapPhotos={(from, to) => swapPhotos(from + strip.offset, to + strip.offset)}
                  onMoveSticker={moveSticker}
                  onRemoveSticker={removeSticker}
                  onEmptyFrame={pickFiles}
                />
                {strips.length > 1 && (
                  <figcaption>
                    <span>{strip.caption}</span>
                    {photos.length > 0 && (
                      <button className="btn btn-stage" type="button" onClick={() => void downloadStrip(i)}>
                        Download strip {i + 1}
                      </button>
                    )}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
        {stripStatus && (
          <p className="stage-status" role="status">
            {stripStatus}
          </p>
        )}

        <p className="hint">
          {photos.length === 0
            ? 'Click an empty frame to add photos, or drop them anywhere on the page.'
            : 'Drag a photo to re-centre it. Hold a photo, then drop it on another frame to swap them. Drag stickers to move them, double-click one to remove it.'}
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </main>
      <div className="trim" aria-hidden="true" />

      <Panel
        settings={settings}
        photos={photos}
        status={status}
        stickers={stickers}
        onChange={update}
        onLayout={changeLayout}
        onPickFiles={pickFiles}
        onOpenCamera={() => {
          setStatus('');
          setCamOpen(true);
        }}
        onMoveEarlier={(i) =>
          setPhotos((list) => {
            if (i <= 0) return list;
            const next = [...list];
            [next[i - 1], next[i]] = [next[i], next[i - 1]];
            return next;
          })
        }
        onMovePhoto={(from, to) =>
          setPhotos((list) => {
            const next = [...list];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
          })
        }
        onRemovePhoto={(i) => setPhotos((list) => list.filter((_, n) => n !== i))}
        onAddSticker={addSticker}
        onClearStickers={() => setStickers([])}
        onSave={(kind) => void save(kind)}
      />

      <CameraDialog
        open={camOpen}
        shots={slotCount(settings.layout)}
        timer={settings.timer}
        onDone={cameraDone}
        onClose={closeCamera}
        onError={cameraError}
      />
    </div>
  );
}
