# Cantina Cana Mulled Wine Kit

One-page product story: a scroll-controlled 3D preparation ritual in six chapters, followed by Inside the box, the recipe, and an order section. Built with React, TypeScript, Vite, GSAP ScrollTrigger, Three.js and React Three Fiber.

## Run

```
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # type-check + production build in dist/
npm run preview    # serve dist/
```

## Things you will want to edit

| What | Where |
| --- | --- |
| Order URL and price | `order` in `src/config/product.ts`. The checkout button and price appear only when `url` and `price` are set. |
| Name of the mini bottle | `product.spirit` in `src/config/product.ts` (default: orange aperitif). |
| Product facts, kit contents, brand links, asset paths | `src/config/product.ts` |
| All page copy | `src/i18n/strings.ts` |
| Story timing (when each action happens, 0 to 1) | `T`, `CHAPTER_RANGES` in `src/scene/choreography.ts` |
| Scroll length of the story | `src/config/story.ts` |
| Colours, fonts, spacing | `src/styles/tokens.css` |

## How the story works

- `src/scene/choreography.ts` is a pure function: `computeState(intro, progress)` returns the pose of every object. It uses no timers and no state from earlier frames, so scrolling backward, jumping between chapters and replaying always give the same frame.
- `src/components/Journey.tsx` maps native scroll to that progress value with one scrubbed GSAP timeline. The stage is `position: sticky`; scrolling is never hijacked.
- `src/scene/world.ts` builds the procedural 3D scene and applies the state each frame. The scene is a lazy chunk loaded after first paint and only renders while the stage is on screen.
- Headings, chapter copy, cues and the recipe are DOM text over the canvas.

## Fallbacks

- `prefers-reduced-motion`, or a browser without WebGL, gets `StaticStory`: the same six chapters as still images with the full text. Visitors can switch either way from the page footer.
- If the WebGL context is lost, the stage swaps to the still for the current chapter.
- The stills are rendered from the 3D scene. After changing the scene, regenerate them with the dev server running:

```
npm run stills     # writes public/stills/*.webp and src/config/kit-markers.json
```

## URL switches for testing

`?motion=reduce` or `?motion=full` overrides the motion preference, `?webgl=off` forces the no-WebGL path, and `?freeze=1` holds the decorative loops (steam, ripples) still so frames can be compared.

## Checks

```
npm run verify:story   # choreography rules: order of actions, reversibility, solids stay in the sieve
npm run verify:page    # browser checks; needs the dev server and an installed Chrome or Edge
npm run verify         # type-check + both of the above
```

`verify:page` writes screenshots and `report.json` to `.verify/`. Run one group with, for example, `npm run verify:page -- mobile` (groups: `desktop`, `sizes`, `mobile`, `reduced`, `contrast`, `nowebgl`, `slow`). To test the production build, run `npm run preview` and set `SITE_URL=http://127.0.0.1:4173`.

## Source material

`Cantina_Cana_Cursor_Prompt.md` (brief), `mulledwine.jpeg`, `mulledwine2.jpeg` (packaging), `Recipe Book final 15x10.pdf` (booklet). `scripts/extract-assets.py` produced the textures, booklet illustrations and the web copy of the PDF under `public/`.
