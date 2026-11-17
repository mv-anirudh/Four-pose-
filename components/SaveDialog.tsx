'use client';

import { useEffect, useRef } from 'react';

export interface SaveImage {
  /** A data URL, so a long press can save it even where blob links fail. */
  src: string;
  name: string;
  blob: Blob;
}

interface Props {
  image: SaveImage | null;
  /** Set inside Instagram, X and other app browsers, where downloads don't work. */
  appName: string | null;
  canShare: boolean;
  onClose: () => void;
}

/**
 * Shown instead of a download inside app browsers that ignore downloads:
 * the finished image, ready to press and hold, plus Share where the browser supports it.
 */
export default function SaveDialog({ image, appName, canShare, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (image && !d.open) d.showModal();
    if (!image && d.open) d.close();
  }, [image]);

  const share = async () => {
    if (!image) return;
    try {
      await navigator.share({ files: [new File([image.blob], image.name, { type: 'image/png' })] });
    } catch {
      // The person cancelled, or the app blocked it; the image is still here to press and hold.
    }
  };

  return (
    <dialog
      ref={ref}
      className="cam save"
      aria-labelledby="save-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2 id="save-title">Save your image</h2>
      <p className="save-how">
        Press and hold the image, then choose <strong>Save image</strong> (or <strong>Add to Photos</strong>).
      </p>
      {image && (
        // A plain <img> on purpose: the long-press menu needs a real image element with a data URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="save-img" src={image.src} alt="Your finished photo strip" />
      )}
      {appName ? (
        <p className="save-note">
          {appName}&rsquo;s built-in browser blocks downloads. If saving doesn&rsquo;t work, open this page in your phone&rsquo;s browser:
          tap the menu (&middot;&middot;&middot;) and choose <strong>Open in browser</strong>.
        </p>
      ) : (
        <p className="save-note">
          This browser blocks downloads. If saving doesn&rsquo;t work, open this page in your phone&rsquo;s own browser.
        </p>
      )}
      <div className="row">
        {canShare && (
          <button className="btn btn-primary" type="button" onClick={() => void share()}>
            Share image
          </button>
        )}
        <button className="btn" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
