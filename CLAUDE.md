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
- One ivory plate (`InstaPlate`) sits on the stage under the masthead, and only once there is a photo. Its bar holds the strip count (`StripCount`, with the spare-photos option) and a button that opens the Instagram image controls inside the same plate. Do not add a second section between the masthead and the strips. Instagram download and share errors show under their own buttons. The preview canvas takes arrow keys (Shift for bigger steps) to move the strip picked in "Strip to adjust". The image is `renderShare()` in `lib/render.ts`: strips placed by `Placement` (centre and height as fractions of the image, plus rotation). `presetPlacements()` gives the starting layout; Booth resets placements when size, strip count, arrangement or layout changes. The preview and the download use the same placements.
- Extra strips drop out on the stage beside strip 1, each with its own download button, using `photoSets()` like the Instagram image. Every strip is an editable `StripCanvas`: a spare-photo strip maps its frames to photos `i * perStrip` onward, and a copy of strip 1 edits strip 1's photos and stickers. All strips share one height, set in CSS from the stage width (`cqw`) and `--copies` so they always fit side by side.
- `developFrame()` caches preview frames by photo, crop, size and film settings, so a drag only redoes the frame that changed. Exports (scale 2) are not cached.
- Every strip edit has a keyboard path: invisible `.strip-key` buttons sit over each frame (arrow keys re-centre) and each sticker (arrow keys move, Delete removes). Keep that when adding strip interactions.
- The strip uses `touch-action: pan-y` so a vertical swipe scrolls the page; a touch pan must start sideways, and StripCanvas holds the gesture once something is moving.
- On a stage narrower than 520px, strips show one at a time at full size, picked with the "Strip to show" buttons.
- Fonts are self-hosted in `app/fonts` (see `app/fonts.css`); the page makes no third-party requests. Type sizes are in `rem`.
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
