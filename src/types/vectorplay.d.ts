/**
 * Hand-written declarations for `vectorplay@1.3.3`.
 *
 * The package ships plain JavaScript (`src/index.js`, `dist/vectorplay.mjs`)
 * with no `types` field and no bundled `.d.ts`, so every signature below was
 * transcribed from `node_modules/vectorplay/src/index.js`. Semantics that
 * matter to callers are called out in comments.
 */

declare module 'vectorplay' {
  import type { PerspectiveCamera, Object3D, Scene, WebGLRenderer } from 'three';
  import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

  export interface VectorLike {
    x: number;
    y: number;
    z: number;
  }

  export class Vector implements VectorLike {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z: number);

    /** Mutates `this`: this += vector. */
    add(vector: VectorLike): void;
    /** Mutates `this`: this -= vector. */
    substract(vector: VectorLike): void;
    /** Mutates `this`: this *= -1. */
    opposite(): void;
    /** Mutates `this`: this *= k. */
    scale(k: number): void;
    /** Cross product as a *new* Vector. */
    multiply(vector2: VectorLike): Vector;
    /** Euclidean norm. */
    value(): number;
    unitVector(): Vector;
    dotProduct(vec2: VectorLike): number;
  }

  export class MainFrame {
    readonly aspect_ratio: number;
    readonly screen_width: number;
    readonly screen_height: number;
    readonly scene: Scene;
    readonly camera: PerspectiveCamera;
    readonly renderer: WebGLRenderer;
    readonly labelRenderer: CSS2DRenderer;
    readonly controls: OrbitControls;

    /**
     * Builds a scene, a full-window WebGL canvas appended to `document.body`,
     * a CSS2D label layer appended to `document.body`, a grid, a three-axis
     * helper, and orbit controls. It also registers an unremovable `resize`
     * listener on `window` — `src/lib/vectorplay-scene.ts` compensates.
     */
    constructor(bg_color?: string, grid_length?: number, axis_length?: number);

    /** CSS2D label parented to `parent`, offset from its origin. */
    addLabel(
      text: string,
      parent: Object3D,
      bg?: string,
      color?: string,
      offset?: { x: number; y: number; z: number },
    ): void;

    /** Sphere marker at a point plus a `name(x, y, z)` label. */
    addPoint(x: number, y: number, z: number, name?: string, color?: string, size?: number): void;

    /**
     * Arrow from the origin (or `custom_origin`) to `vec`, plus a marker point
     * at the tip labeled `V`. `color` is passed straight to three.js, so both
     * hex numbers (`0x00b894`) and CSS strings (`"#00b894"`) work.
     */
    addVector(
      vec: VectorLike,
      fromOrigin?: boolean,
      custom_origin?: { x: number; y: number; z: number },
      color?: number | string,
    ): void;

    /** Dashed line between two points. */
    addLine(
      from: VectorLike,
      to: VectorLike,
      color?: number | string,
      dash?: number,
      gap?: number,
    ): void;

    /**
     * Draws `vector1`, `vector2` (chained from the tip of `vector1`), and the
     * sum. Mutates `vector1` in place — pass throwaway vectors.
     */
    plotSum(vector1: Vector, vector2: Vector): void;

    /**
     * Draws `vector2` and the difference `vector1 - vector2`. Mutates both
     * arguments (negates `vector2`, then runs `plotSum`).
     */
    plotDifference(vector1: Vector, vector2: Vector): void;

    /** Draws both vectors and their cross product. Does not mutate. */
    plotCross(vector1: Vector, vector2: Vector): void;

    /** Draws `vec` scaled by `k`. Mutates `vec`. */
    plotScaled(vec: Vector, k: number): void;

    /** Draws `ofvec1`, `onvec2`, and the projection of the former on the latter. */
    plotProjection(ofvec1: Vector, onvec2: Vector): void;

    /**
     * Starts an unbounded `requestAnimationFrame` loop that updates controls and
     * renders both layers. There is no stop method — see
     * `src/lib/vectorplay-scene.ts` for the cancellation strategy.
     */
    runInloop(): void;
  }

  const vectorplay: { MainFrame: typeof MainFrame; Vector: typeof Vector };
  export default vectorplay;
}
