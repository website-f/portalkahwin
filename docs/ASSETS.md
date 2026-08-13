# Card assets — where to get them, and what is safe to use

Two routes into a template: the **built-in ornaments** (drawn in code, ours,
free) and **downloaded assets** (richer, but each carries a licence you have to
honour). Reach for the built-ins first — they recolour with the host's palette
and cost nothing to load.

> I cannot browse, so every link below is a site's own search page rather than a
> deep link to one file — deep links rot and I will not invent URLs. Open the
> site, search the term, and check the licence on the asset's own page. Licence
> terms change; the notes here are the general shape, not a guarantee.

---

## 1. Built-in ornaments (already in the codebase)

`resources/js/templates/ornaments.tsx` — original SVG, palette-aware, zero
licence burden, a few KB each:

| Ornament | What it is | Fits |
| --- | --- | --- |
| `FloralCorner` | Layered roses + eucalyptus sweeping from a corner | Floral, Boho, Pastel, Greenery |
| `PucukRebung` | Bamboo-shoot triangle border from a songket sarong | Songket, Seri, Pelamin |
| `SongketWeave` | Gold thread lattice, seamless tile | Songket, Seri |
| `BatikParang` | Diagonal *parang* knife motif, seamless tile | Batik, Peranakan |
| `AwanLarat` | Malay "drifting cloud" scroll border | Songket, Khat, Pelamin |
| `GeometricLattice` | Islamic eight-point star lattice | Khat, ArtDeco, Marble |
| `Divider` | Rule–diamond–rule section divider | Any |
| `Halo` | Soft radial glow behind a name block | Curtain, Celestial, Khat |

All take `color`, `accent` and `opacity`, so one ornament serves every palette.

---

## 2. Vector & pattern sources

**What to search for**, then filter by licence:

| Site | Search terms | Licence shape |
| --- | --- | --- |
| [svgrepo.com](https://www.svgrepo.com) | `floral corner`, `ornament divider`, `islamic pattern`, `wreath` | Large CC0 / public-domain section — **filter to those**. Best first stop. |
| [publicdomainvectors.org](https://publicdomainvectors.org) | `batik`, `damask`, `floral frame` | Public domain. Quality is mixed but the licence is unambiguous. |
| [openclipart.org](https://openclipart.org) | `wedding ornament`, `flourish` | CC0. |
| [heropatterns.com](https://heropatterns.com) | — | Free SVG background patterns, MIT. Recolourable, tiny. |
| [pattern.monster](https://pattern.monster) | — | Free SVG patterns, adjustable colour and stroke. |
| [freepik.com](https://www.freepik.com) | `songket pattern`, `batik parang`, `watercolour floral corner`, `malay wedding ornament` | **Free tier requires visible attribution**; the paid tier removes it. Do not ship free-tier assets without the credit line. |
| [vecteezy.com](https://www.vecteezy.com) | `songket`, `batik nusantara`, `eucalyptus wreath` | Same shape as Freepik — free needs attribution, Pro does not. |
| [flaticon.com](https://www.flaticon.com) | `wedding`, `islamic ornament` | Attribution on free tier. Good for small marks, not covers. |

**Malaysian / Nusantara motifs specifically.** Generic "floral" is what makes a
card look like every other card. Search these instead:
`songket`, `pucuk rebung`, `awan larat`, `bunga tanjung`, `batik parang`,
`batik kawung`, `batik mega mendung`, `tumpal`, `peranakan tile`,
`nyonya tile`, `bunga raya`, `ketupat`, `wau bulan`, `tepak sirih`.

---

## 3. Motion (the "moving flowers" reference)

That effect is a **Lottie animation** — JSON vector, animated, a few dozen KB.

| Site | Notes |
| --- | --- |
| [lottiefiles.com/free-animations](https://lottiefiles.com/free-animations) | Search `flower`, `petals falling`, `sparkle`, `confetti`, `curtain`. Filter to the free set; each shows its own licence. |
| [iconscout.com/lotties](https://iconscout.com/lotties) | Larger library, mixed free/paid. |

**This is wired up.** `lottie-web` (light build) is installed and split into its
own 47 KB gzipped chunk, so a card with no animation never downloads it. Drop a
`.json` into `public/lottie/` and it appears in the card editor under
Galeri & Muzik — see `public/lottie/README.md` for the download steps.

Cheaper alternatives already possible without any dependency:

- **CSS-animated SVG petals** — a handful of `FloralCorner` petals on slow,
  offset `translate`/`rotate` keyframes. This is what I would build first.
- **`framer-motion`**, already in the project, can drive the same motion.

---

## 4. Photographic / video backgrounds

| Site | Notes |
| --- | --- |
| [unsplash.com](https://unsplash.com) | Free for commercial use, no attribution required. Search `wedding flowers`, `silk fabric`, `gold bokeh`, `marble texture`. |
| [pexels.com](https://www.pexels.com) | Same terms; also has free video for curtain/fabric loops. |
| [pixabay.com](https://pixabay.com) | Same terms. |

**Compress before shipping.** A 4000px Unsplash JPEG is 3–6 MB. Target ≤ 250 KB
at 1600px wide, in WebP — a guest opening the card on 4G will not wait.

---

## 5. Fonts

Twenty display faces are already wired into the card editor
(`resources/js/lib/cardFonts.ts`), all Google Fonts, all loaded on demand. For
Jawi or Arabic khat, search [fonts.google.com](https://fonts.google.com) for
`Amiri`, `Scheherazade New`, `Reem Kufi`, `Lateef` — all SIL Open Font License,
free to embed.

---

## 6. Rules before anything ships

1. **Record the licence.** One line per asset in this file: what, where from,
   which licence, attribution needed yes/no.
2. **Never ship a free-tier Freepik/Vecteezy/Flaticon asset without its credit.**
   It is a paid product being used outside its terms.
3. **Prefer SVG.** It recolours with the palette and stays sharp; a PNG does
   neither.
4. **Budget the page.** A wedding card should open in a couple of seconds on
   mobile data. Ornament SVGs are ~2–8 KB; one uncompressed photo is 500×that.
5. **Check contrast after adding art.** Text over a busy background needs a
   scrim. `resources/js/lib/contrast.ts` has `contrastRatio()` for checking.

---

## 7. Asset register

Fill this in as assets are added. Empty today — everything currently rendering
is drawn in code.

| Asset | Used by | Source | Licence | Attribution |
| --- | --- | --- | --- | --- |
| _(none yet)_ | | | | |
