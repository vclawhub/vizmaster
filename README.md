# VizMaster

**VizMaster** is a toolchain for interactive high-school mathematics tutorials:
animated explanations in the 3Blue1Brown style, with 2D scenes that advance frame
by frame and 3D scenes you can orbit. Every tutorial is a small React component,
and OMP agent tools can generate new ones on request.

Four tutorials ship today:

| Tutorial | Route | What it shows | Engine |
| --- | --- | --- | --- |
| Unit Circle ↔ Sine Wave | `#/unit-circle` | A radius sweeps the unit circle while its height unrolls into a sine wave, with a scrubbable angle | Elucim |
| Quadratic Functions | `#/quadratic-functions` | Sliders for `a`, `b`, `c` move the parabola, its vertex, its axis of symmetry, and its roots | Elucim |
| Vectors in 3D | `#/vectors-3d` | Two vectors in space with sum, difference, cross product, and scalar multiple as toggleable layers | VectorPlay |
| Solid Geometry | `#/solid-geometry` | A rotating regular tetrahedron with its circumscribed and inscribed spheres, and a plane that slices it | Three.js |

## Quick start

```bash
npm install
npm run dev
```

Every tutorial is independently viewable at its own `#/route` and can be linked
to or reloaded directly. The shell is a side navigation plus the active
tutorial, and it discovers tutorials from the filesystem (see
[Adding a tutorial](#adding-a-tutorial)).

Other scripts:

```bash
npm run typecheck    # tsc --noEmit over src, scripts, and .omp
npm run build        # typecheck, then a production build into dist/
npm run preview      # serve the production build
npm run tools:smoke  # exercise the OMP tutorial generators (needs Bun)
```

Verified with Node 22.22, npm 11.15, and Bun 1.4. Bun is only required for
`npm run tools:smoke`; the app itself is plain Node plus a browser.

### Playback controls

Elucim's `<Player>` owns the timeline: scrubber, play/pause, frame counter, and
these shortcuts when it has focus.

| Key | Action |
| --- | --- |
| `Space` | play / pause |
| `←` / `→` | seek one frame |
| `Shift` + `←` / `→` | seek ten frames |
| `Home` / `End` | first / last frame |

The 3D tutorials are driven by their own animation loops: drag to orbit, scroll
to zoom, right-drag to pan.

## How a tutorial is structured

Every file in `src/tutorials/` exports exactly two things:

```tsx
export const tutorial: TutorialMeta = {
  id: 'unit-circle',            // becomes #/unit-circle
  title: 'Unit Circle ↔ Sine Wave',
  blurb: 'A radius sweeps the unit circle while its height unrolls into a sine wave.',
  kind: 'elucim',               // 'elucim' | 'vectorplay' | 'three'
  order: 10,                    // lower sorts first in the navigation
};

export default function UnitCircle() {
  return <Player …>{/* scene */}</Player>;
}
```

`src/App.tsx` finds these files with
`import.meta.glob('./tutorials/*.tsx', { eager: true })` and skips any module
that does not satisfy the contract, so a half-written file cannot take the shell
down. There is no registry to update by hand.

### Adding a tutorial

1. Create `src/tutorials/MyTutorial.tsx` exporting `tutorial` and a default
   component (copy the nearest existing tutorial as a starting point).
2. Pick `kind`:
   - `elucim` → wrap the scene in `<Player width height fps durationInFrames autoPlay loop>`
     and build it from Elucim primitives (`Axes`, `FunctionPlot`, `Vector`,
     `VectorField`, `Matrix`, `LaTeX`) plus the motion wrappers (`FadeIn`,
     `Draw`, `Write`, `Transform`, `Stagger`, `Sequence`).
   - `vectorplay` → mount a VectorPlay scene with `mountVectorScene` from
     `src/lib/vectorplay-scene.ts` (see [VectorPlay integration](#vectorplay-integration)).
   - `three` → build a raw Three.js scene in a `useEffect`, and dispose
     everything in the cleanup (see `SolidGeometry.tsx`).
3. Reuse `src/lib/plot.ts` (`makePlot`, `toSvg`, `fmt`) for coordinate layout,
   `src/lib/theme.ts` for colors, and `src/lib/scene-label.ts` for 3D labels so
   the tutorial matches the others.
4. `npm run typecheck` and open the route.

### Or generate one with the agent tools

`src/tools/math-renderer.ts` defines three OMP custom tools that write finished
tutorials into `src/tutorials/`, where the shell picks them up immediately:

| Tool | Input | Writes |
| --- | --- | --- |
| `renderFunctionPlot` | `equation`, `domain: [min, max]`, `range: [min, max]` | An Elucim scene plotting `y = f(x)` on labelled axes |
| `renderVectorScene` | `vectors: [{ x, y, z, label }]`, `operations: string[]` | A VectorPlay scene with the requested operations as toggles |
| `renderUnitCircleTutorial` | `angleRange: [start, end]`, `showSineWave` | An Elucim scene sweeping the unit circle, optionally with a sine wave |

`equation` accepts textbook notation (`x^2`, `2x`, `sin(x)`, `sqrt(x)`, `pi`).
It is compiled by a whitelisted recursive-descent parser
(`ExpressionCompiler`): nothing is `eval`-ed, in the tool or in the file it
writes, and an unknown name is rejected with the list of allowed names.

OMP loads the tools from `.omp/tools/math-renderer.ts`, which re-exports the
factory from `src/tools/math-renderer.ts`. To check the whole path without an
agent session:

```bash
npm run tools:smoke           # discovers, loads, validates, generates, then cleans up
npm run tools:smoke -- --keep # leaves the generated files in src/tutorials/ for inspection
```

The harness uses the real SDK loader and the real injected zod builder, so it
covers discovery, schema validation, and code generation, and it typechecks the
generated TypeScript through the project's own `tsc`.

## Design notes

### Frame-driven 2D, loop-driven 3D

Elucim scenes are pure functions of a frame number: nothing animates in a
`setInterval`, so the scrubber, play/pause, and keyboard seeking all work on
every 2D tutorial for free. Anything frame-driven uses `useCurrentFrame()` and
`interpolate()`.

The one deliberately linear motion is the unit circle's rotation. Uniform
angular speed is what makes the wave a sine rather than a distorted one, so
easing it would be a mathematical lie. Entry reveals use `easeOutCubic`.

### VectorPlay integration

`src/lib/vectorplay-scene.ts` adapts `MainFrame` to a routed app. The library
assumes one scene per page: its constructor appends a full-window canvas and a
full-window CSS2D label layer to `document.body`, sizes both from
`window.innerWidth/innerHeight`, registers a `resize` listener it never removes,
and `runInloop()` starts a `requestAnimationFrame` chain with no stop method.
Left alone inside a router that leaks a WebGL context per navigation, which
eventually costs you the browser's context limit.

The adapter re-parents both layers into a host element, sizes them to it, and
stops the loop by gating the loop's own callback (the loop re-reads the global
`requestAnimationFrame` every iteration, so the gate identifies it by its first
registration and leaves other callers untouched). It also records the scene
objects each `plot*` call creates, so the operation toggles flip `visible`
instead of rebuilding the scene.

One scene may be mounted at a time; `mountVectorScene` throws if a second one is.

### VectorPlay's drawing helpers

`plotSum`, `plotDifference`, and `plotScaled` mutate the vectors you hand them
(`plotSum` adds `vector2` into `vector1`), so every call passes fresh `Vector`
instances. Each helper also draws its own inputs, which is why the base pair is
hidden whenever an operation is on: enabling two operations at once superimposes
two complete diagrams, by the library's design.

### The tetrahedron's cross-section

`crossSectionPolygon` intersects the plane with the tetrahedron's **edges**.
Clipping the faces instead returns the silhouette of the part left behind, which
is not planar and only coincides with the real section when the plane is exactly
the far face. The readouts are exact rather than sampled — at depth `t` the
section is an equilateral triangle of side `t·2√2` and area `t²·(√3/4)·8`, so at
`t = 1` it equals the face area, and at `t = 0` it is a point.

### KaTeX

Elucim's `<LaTeX>` renders KaTeX markup, and KaTeX ships its metrics as CSS.
`src/main.tsx` imports `katex/dist/katex.min.css`; `katex` is therefore a direct
dependency (`@elucim/core` also depends on it, and npm dedupes to one copy)
rather than an accidental hoist. Without it, fractions and radicals collapse to
unstyled HTML.

### Configuration

There is no `omp.config.ts`. OMP reads project settings from
`.omp/settings.json` or `.omp/config.yml`, and this project needs no overrides,
so adding a config file would be configuration for its own sake. The only OMP
wiring the project needs is `.omp/tools/math-renderer.ts` for tool discovery.

## Project layout

```text
vizmaster/
├── index.html
├── vite.config.ts              # React plugin, dep pre-bundling for vectorplay
├── tsconfig.json               # strict, noUncheckedIndexedAccess, verbatimModuleSyntax
├── scripts/
│   └── tools-smoke.ts          # loads and runs the OMP tools through the real SDK loader
├── .omp/
│   └── tools/
│       └── math-renderer.ts    # OMP tool discovery entry point
└── src/
    ├── main.tsx                # React root + KaTeX stylesheet
    ├── App.tsx                 # navigation shell and tutorial discovery
    ├── styles.css              # dark theme, shared control and overlay styling
    ├── lib/
    │   ├── plot.ts             # domain/range → Elucim origin + scale + scene size
    │   ├── theme.ts            # palette, accents, axis styling
    │   ├── tutorial.ts         # TutorialMeta contract + runtime guard
    │   ├── scene-label.ts      # shared CSS2D label style for the 3D tutorials
    │   └── vectorplay-scene.ts # MainFrame lifecycle adapter
    ├── tools/
    │   └── math-renderer.ts    # the three OMP custom tools + the equation compiler
    ├── types/
    │   └── vectorplay.d.ts     # hand-written declarations for the untyped package
    └── tutorials/
        ├── UnitCircle.tsx
        ├── QuadraticFunctions.tsx
        ├── Vectors3D.tsx
        └── SolidGeometry.tsx
```

## Using this repository with OMP

Opening this repository as an OMP project auto-loads the three generator tools
from `.omp/tools/`. They validate their inputs with the injected zod builder and
write only into `src/tutorials/`; the constraints are spelled out in
[SECURITY.md](SECURITY.md). Delete the `.omp/` directory if you would rather not
load them.

## License

[MIT](LICENSE) © The VizMaster Authors

## Known tradeoffs

- **One JS chunk.** Three.js and KaTeX make the initial bundle about 1 MB
  (295 kB gzipped). Tutorials are discovered eagerly so the navigation can show
  titles before you click, which rules out lazy-loading a tutorial without a
  metadata pass. Splitting the 3D engines behind a dynamic import is the obvious
  next step if the bundle size matters.
- **`vectorplay` ships no types.** `src/types/vectorplay.d.ts` declares the API
  by hand from the package's own source; `plot*` mutations and the label
  behaviour are documented in the declarations.
- **`vectorplay@1.3.3`'s `main` field points at a file the tarball does not
  contain.** Its `module` field is valid, so Vite resolves the ESM source; the
  `optimizeDeps.include` entry in `vite.config.ts` keeps it that way.
