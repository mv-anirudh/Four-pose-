# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who likes the vintage photo booth look; there is no single main audience. A typical visitor has a few photos on their phone (or takes them with the camera in the app) and wants a booth-style strip to keep or post, usually on Instagram. Most visits are on a phone.

## Product Purpose

Four Poses turns ordinary photos into a vintage photo booth strip in the browser: pick a layout and a film look, add captions, a date stamp and stickers, then download the strip or an Instagram Story or post image. Success is a visitor going from photos to a strip they want to share in a few minutes, without signing up or uploading anything.

## Positioning

- **Nothing is uploaded.** All photo processing happens on the device, on `<canvas>`. There is no server, no account and no upload.
- **It feels like a real booth.** The page is the outside of a 1960s booth, the strip drops out of a slot, and the film looks, grain, light leaks and wear imitate real booth prints. It is not a template editor.
- **Output is ready for Instagram.** Story (9:16) and post (4:5) images with one to three strips, arranged and tilted, plus a Share button on phones.
- **Free, with no sign-up**, watermark or paywall.

## Operating Context

- Photos come from the file picker, drag and drop, paste, or the in-app camera with a 3, 5 or 10 second countdown.
- The visitor edits on the stage (pan a photo in its frame, hold to swap photos, move stickers) and in the control plate (layout, film, effects, paper, caption, date, stickers).
- Results leave as PNG downloads or through the phone's share sheet.

## Capabilities and Constraints

- Next.js static export with no backend; it can be hosted on any static host.
- Layouts: 4, 3 and 2 pose strips, a 2 by 2 grid, and a single frame. Up to 12 photos in the tray; spare photos can fill extra strips (up to 3).
- Film effects are computed per pixel, not with `ctx.filter`, so they work in Safari.
- Known limits: HEIC opens only in Safari, fonts come from Google Fonts, there is no zoom inside a frame, and nothing is saved between visits.
- Never add network calls that send images off the device.

## Brand Commitments

- Name: Four Poses.
- The 1960s photo booth world described in `CLAUDE.md` (Design section) is binding.
- Voice: sentence case, plain verbs, buttons say what they do ("Download strip"), and errors say what happened and how to fix it.

## Evidence on Hand

No testimonials, user numbers, press or reviews exist. Do not invent any.

## Product Principles

1. **Private by construction.** Photos stay on the device; any feature that would need a server is out of scope.
2. **Free and clean.** No ads, accounts, tracking, watermarks or paywalls, now or later.
3. **Phone first.** Design for a phone in one hand first, then scale up to desktop.
4. **The booth, not an editor.** Controls and motion should feel like using a photo booth, not filling in a form.
5. **What you see is what you download.** The preview and the export are drawn by the same code and must match.

## Accessibility & Inclusion

Keyboard use, screen reader support and colour contrast matter, and the existing reduced-motion support must stay. No formal standard (such as WCAG 2.2 AA) has been chosen yet.
