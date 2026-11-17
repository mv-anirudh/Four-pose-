import type { Metadata, Viewport } from 'next';
import './fonts.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Four Poses, a vintage photo booth',
  description:
    'Turn your photos into a vintage photo booth strip, sized for Instagram. Everything stays on your device.',
  openGraph: {
    title: 'Four Poses',
    description: 'Turn your photos into a vintage photo booth strip. Everything stays on your device.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17463f',
};

// Fonts are self-hosted in app/fonts (see fonts.css) under their real family names,
// so the canvas can use them ("Special Elite", "Caveat") and nothing is fetched from another site.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
