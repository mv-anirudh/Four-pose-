import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Four Poses, a vintage photo booth',
  description:
    'Turn your photos into a vintage photo booth strip, sized for Instagram. Everything stays on your device.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Fonts are loaded with a plain stylesheet link so the canvas can use them
// by their real family names ("Special Elite", "Caveat").
const FONTS =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600&family=Bungee&family=Caveat:wght@600&family=Special+Elite&display=swap';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
