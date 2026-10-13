import { MainFrame } from 'vectorplay';
import type { BufferGeometry, Material, Object3D } from 'three';

/**
 * Adapter around VectorPlay's `MainFrame`.
 *
 * `MainFrame` is written for a one-scene-per-page demo: its constructor appends
 * a full-window canvas *and* a full-window CSS2D label layer to `document.body`,
 * sizes both from `window.innerWidth/innerHeight`, registers a `resize` listener
 * it never removes, and `runInloop()` starts a `requestAnimationFrame` chain
 * with no way to stop it. Inside a routed multi-tutorial shell that leaks a
 * WebGL context (and its render loop) on every navigation, which eventually
 * costs you the browser's context limit.
 *
 * This module keeps the library's scene graph and drawing helpers, and fixes
 * the surrounding lifecycle:
 *
 * - both layers are re-parented into a host element and sized to it;
 * - `runInloop()`'s chain is cancellable (the loop re-reads the global
 *   `requestAnimationFrame` every iteration, so one gated wrapper around that
 *   global stops exactly this loop and leaves other callers alone);
 * - objects added by a drawing call are recorded by name, so operations can be
 *   toggled with `visible` instead of rebuilding the scene — which matters,
 *   because a rebuild would leak another `resize` listener and context.
 */

export interface VectorSceneOptions {
  /** Scene background. Pass the app background so the canvas blends in. */
  background: string;
  /** Grid extent in world units (one cell per unit). Default 20. */
  gridLength?: number;
  /** Axis helper length. Default 5. */
  axisLength?: number;
}

export interface VectorScene {
  readonly frame: MainFrame;
  /** Runs `draw` and records every scene object it adds under `name`. */
  capture(name: string, draw: () => void): void;
  /** Shows or hides everything recorded under `name`. */
  setVisible(name: string, visible: boolean): void;
  dispose(): void;
}

/**
 * One live VectorPlay scene at a time. The rAF gate below identifies the
 * library loop by its first registration, which is only unambiguous with a
 * single `MainFrame`; this makes that assumption explicit instead of silent.
 */
let liveScene: VectorScene | null = null;

export function mountVectorScene(host: HTMLElement, options: VectorSceneOptions): VectorScene {
  if (liveScene) {
    throw new Error('mountVectorScene: a VectorPlay scene is already mounted; dispose it before mounting another.');
  }

  const frame = new MainFrame(options.background, options.gridLength ?? 20, options.axisLength ?? 5);

  const canvas = frame.renderer.domElement;
  const labelLayer = frame.labelRenderer.domElement;
  labelLayer.classList.add('label-layer');
  canvas.style.display = 'block';
  host.append(canvas, labelLayer);

  const applySize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    frame.camera.aspect = width / height;
    frame.camera.updateProjectionMatrix();
    frame.renderer.setSize(width, height);
    frame.labelRenderer.setSize(width, height);
  };
  applySize();

  const resizeObserver = new ResizeObserver(applySize);
  resizeObserver.observe(host);
  // MainFrame already listens for window resizes and sizes to the *window*.
  // Listeners on the same target fire in registration order, so this later
  // listener runs afterwards and overwrites its values with the host's.
  window.addEventListener('resize', applySize);

  const realRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  let loopCallback: FrameRequestCallback | null = null;
  let stopped = false;

  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    if (loopCallback === null) loopCallback = callback;
    if (callback !== loopCallback) return realRequestAnimationFrame(callback);
    return realRequestAnimationFrame((time) => {
      if (!stopped) callback(time);
    });
  };
  frame.runInloop();

  const groups = new Map<string, Object3D[]>();
  const scene: VectorScene = {
    frame,

    capture(name, draw) {
      const before = new Set(frame.scene.children);
      draw();
      groups.set(
        name,
        frame.scene.children.filter((child) => !before.has(child)),
      );
    },

    setVisible(name, visible) {
      for (const object of groups.get(name) ?? []) object.visible = visible;
    },

    dispose() {
      stopped = true;
      window.requestAnimationFrame = realRequestAnimationFrame;
      window.removeEventListener('resize', applySize);
      resizeObserver.disconnect();
      frame.controls.dispose();

      // MainFrame's own window listener outlives this scene and would keep
      // resizing a disposed renderer on later window resizes.
      frame.renderer.setSize = () => {};
      frame.labelRenderer.setSize = () => {};

      frame.scene.traverse((object) => {
        const mesh = object as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material?.dispose();
      });

      frame.renderer.dispose();
      frame.renderer.forceContextLoss();
      labelLayer.remove();
      canvas.remove();
      groups.clear();
      liveScene = null;
    },
  };

  liveScene = scene;
  return scene;
}
