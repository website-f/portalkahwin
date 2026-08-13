# Lottie animations

Drop `.json` animation files in this folder. That is the whole install step —
they are fetched at runtime, so **no rebuild and no redeploy of the bundle** is
needed to add or replace one.

```
public/lottie/
  petals-fall.json
  gold-sparkle.json
  curtain-open.json
```

Then reference the filename:

```tsx
<CardMotion file="petals-fall.json" tint={[theme.secondary, theme.accent, theme.primary]} />
```

## Getting animations from LottieFiles

1. Go to <https://lottiefiles.com/free-animations> and search — `falling petals`,
   `flower bloom`, `gold sparkle`, `confetti`, `curtain`, `fireworks`.
2. **Filter to Free.** Paid animations look identical in the grid.
3. Open one and check the licence shown on its page. Most free ones are the
   Lottie Simple License (free for commercial use, no attribution); some are
   CC-BY and **need a credit line** — record those in `docs/ASSETS.md`.
4. Download → choose **Lottie JSON** (`.json`), not `.lottie`, not GIF, not MP4.
5. Save it here with a plain kebab-case name.

You do not need an account to download free animations.

## What makes a good card animation

- **Small.** Under ~150 KB. Anything with embedded raster images will be
  megabytes — check the file size before committing it. A JSON that opens as
  mostly `"p":"data:image/png;base64,..."` is one of those; skip it.
- **Loopable.** It plays continuously behind the card, so it must not visibly
  restart with a jump.
- **Sparse.** It sits behind names and dates. Dense, high-contrast motion makes
  the text unreadable — which is the problem we just fixed elsewhere.
- **Slow.** Wedding cards want drift, not energy. `speed={0.4}` is often better
  than the author's default.

## Recolouring

Pass `tint` with a palette ramp (darkest first) and the animation is retinted
onto the card's colours: its distinct colours are ranked by lightness and mapped
onto the ramp in order, so shading survives and pink petals become whatever the
host chose.

Omit `tint` to keep the original artwork exactly as drawn.

## Licence register

Every file added here needs a row in the table in `docs/ASSETS.md` — what it is,
where it came from, its licence, and whether attribution is required.
