# Four Poses

Vintage photo booth web app. Next.js (App Router) + React + TypeScript, static export, no backend. All photo processing happens in the browser on `<canvas>`.

## Commands

- `npm run dev` start the dev server at http://localhost:3000
- `npm run typecheck` type-check (run after every change)
- `npm run build` static export to `out/` (run before calling work done)

## Architecture

- `components/Booth.tsx` owns all state (`settings`, `photos`, `stickers`) and passes it down. Keep state there; other components stay presentational.
- `lib/render.ts` is pure canvas code with no React. All drawing and film effects live here. The same `renderStrip()` draws the preview (scale 1) and the downloads (scale 2), so the preview always matches the export.
- `lib/options.ts` holds every layout, film look, colour and limit. Adding a film or layout means adding one entry there plus its key in `lib/types.ts`.
- The Instagram image is `renderShare()` in `lib/render.ts`: strips placed by `Placement` (centre and height as fractions of the image, plus rotation). `presetPlacements()` gives the starting layout; Booth resets placements when size, strip count, arrangement or layout changes. The preview and the download use the same placements.
- Hold-to-pick-up (380 ms, 7 px slop) is used on the strip (swap) and the tray (move). A move before the hold completes is a pan or a scroll.
- Coordinates for stickers and dragging are in "strip units" from `geometry(layout)`, not screen pixels.

## Conventions

- Strict TypeScript, no `any`.
- Plain CSS in `app/globals.css` with tokens in `:root` (`--enamel`, `--paper`, `--curtain`, `--lamp`, `--ink`). No Tailwind or UI library.
- Film effects are done per pixel in `developFrame()`, not with `ctx.filter`, because Safari support for `ctx.filter` is unreliable.
- Photos are never uploaded anywhere. Do not add network calls that send images off the device.
- UI copy: sentence case, plain verbs, buttons say what they do ("Download strip"). Errors say what happened and how to fix it.
- Respect `prefers-reduced-motion`; the strip "print" animation is the only decorative motion.

## Design

The page is the outside of a 1960s photo booth: enamel green body, curtain-red lit sign, amber lamp lettering (Bungee), ivory control plate. Strip captions use Caveat (handwriting) and Special Elite (typewriter date stamp). Keep new UI inside this palette and type set.

## Ideas not built yet

- Zoom inside a frame (pinch or slider)
- 9-photo grid layout
- Remember settings between visits (localStorage)
- HEIC conversion in the browser
