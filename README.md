# Four Poses

A vintage photo booth in the browser, built with Next.js, React and TypeScript. Add your photos (or use the camera), pick a film look, and download a strip sized for Instagram. Photos never leave the device: there is no server and no upload.

## Run it

You need Node.js 20 or newer.

```
npm install
npm run dev
```

Open http://localhost:3000. The camera works on `localhost` and on HTTPS sites.

Other commands:

- `npm run build` makes a static site in `out/` that any static host can serve (Vercel, Netlify, GitHub Pages)
- `npm run typecheck` checks types without building

## Features

- Add photos by file picker, drag and drop, or paste; or shoot a session with the camera and a 3, 5 or 10 second countdown
- Layouts: 4, 3 and 2 pose strips, 2 by 2 grid, single frame
- Film looks: Silver, Sepia, Faded '74, Drugstore, Carnival, As shot
- Grain, dark corners, light leak, dust and scratches
- Paper colours, handwritten caption, typewriter date stamp
- Emoji stickers (drag to move, double-click to remove)
- Drag a photo inside its frame to re-centre the crop
- Download the strip, a 9:16 Story (1080 x 1920) or a 4:5 post (1080 x 1350); Share button on phones

## Structure

```
app/
  layout.tsx        page shell, fonts, metadata
  page.tsx          renders <Booth />
  globals.css       all styling (plain CSS, design tokens at the top)
components/
  Booth.tsx         owns all state; wires the pieces together
  StripCanvas.tsx   live preview canvas; drag to pan photos and move stickers
  Panel.tsx         the settings panel
  CameraDialog.tsx  camera, countdown and capture
lib/
  types.ts          shared types
  options.ts        layouts, films, colours, limits, default settings
  render.ts         canvas drawing: film effects, strip, Instagram export
  photos.ts         loading and downscaling photos
```

## Known limits

- HEIC photos open only in Safari; convert to JPG elsewhere
- Fonts load from Google Fonts; offline, the strip falls back to system fonts
- No zoom inside a frame yet, only re-centring
- Nothing is saved between visits
