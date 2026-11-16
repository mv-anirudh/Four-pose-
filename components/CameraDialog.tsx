'use client';

import { useEffect, useRef, useState } from 'react';
import { photoFromSource } from '@/lib/photos';
import { ctx2d, makeCanvas } from '@/lib/render';
import type { Photo } from '@/lib/types';

interface Props {
  open: boolean;
  shots: number;
  timer: number;
  onDone: (photos: Photo[]) => void;
  onClose: () => void;
  /** Called instead of opening when the camera can't be used. */
  onError: (message: string) => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return "Camera access is blocked. Allow the camera in the browser's site settings, then choose Use camera again.";
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. Add photos from your files instead.';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'Another app is using the camera. Close it, then choose Use camera again.';
  }
  return "The camera didn't start. Choose Use camera again, or add photos from your files.";
}

export default function CameraDialog({ open, shots, timer, onDone, onClose, onError }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const session = useRef(0);
  const [count, setCount] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(0);

  // Keep the latest callbacks without restarting the camera when they change.
  const handlers = useRef({ onDone, onClose, onError });
  useEffect(() => {
    handlers.current = { onDone, onClose, onError };
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const dialog = dialogRef.current;
    const video = videoRef.current;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        handlers.current.onError(
          window.isSecureContext
            ? "This browser can't open the camera. Add photos from your files instead."
            : 'The camera only works on a secure (https) page. Open the app over https, or add photos from your files.',
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
      } catch (err) {
        handlers.current.onError(cameraErrorMessage(err));
        return;
      }
      if (cancelled || !dialog || !video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      setCount(null);
      setRunning(false);
      setMessage(`Get everyone in the frame. The booth takes ${shots} ${shots === 1 ? 'photo' : 'photos'}.`);
      if (!dialog.open) dialog.showModal();
    })();

    return () => {
      cancelled = true;
      session.current++;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      if (dialog?.open) dialog.close();
    };
  }, [open, shots]);

  const runSession = async () => {
    const video = videoRef.current;
    if (!video) return;
    const mine = ++session.current;
    const taken: Photo[] = [];
    setRunning(true);
    for (let i = 0; i < shots; i++) {
      setMessage(`Pose ${i + 1} of ${shots}`);
      for (let t = timer; t > 0; t--) {
        setCount(t);
        await wait(1000);
        if (mine !== session.current) return;
      }
      setCount(null);
      if (!video.videoWidth) {
        setMessage('The camera stopped sending a picture. Close the camera and open it again.');
        setRunning(false);
        return;
      }
      const grab = makeCanvas(video.videoWidth, video.videoHeight);
      const gx = ctx2d(grab);
      gx.translate(grab.width, 0);
      gx.scale(-1, 1); // match the mirrored preview
      gx.drawImage(video, 0, 0);
      taken.push(photoFromSource(grab, grab.width, grab.height));
      setFlash((f) => f + 1);
      await wait(800);
      if (mine !== session.current) return;
    }
    handlers.current.onDone(taken);
  };

  return (
    <dialog
      ref={dialogRef}
      className="cam"
      aria-label="Camera"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="cam-view">
        <video ref={videoRef} autoPlay playsInline muted />
        <div className="cam-count" aria-live="assertive">
          {count}
        </div>
        {flash > 0 && <div key={flash} className="cam-flash is-on" />}
      </div>
      <p className="cam-status">{message}</p>
      <div className="row">
        {!running && (
          <button className="btn btn-primary" type="button" onClick={runSession}>
            Start the poses
          </button>
        )}
        <button className="btn" type="button" onClick={onClose}>
          Close camera
        </button>
      </div>
    </dialog>
  );
}
