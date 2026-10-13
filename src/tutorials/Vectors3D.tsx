import { useCallback, useEffect, useRef, useState } from 'react';
import { Object3D } from 'three';
import { Vector } from 'vectorplay';

import { ACCENT, PALETTE } from '../lib/theme';
import { makeSceneLabel } from '../lib/scene-label';
import type { TutorialMeta } from '../lib/tutorial';
import { mountVectorScene } from '../lib/vectorplay-scene';
import type { VectorScene } from '../lib/vectorplay-scene';

export const tutorial: TutorialMeta = {
  id: 'vectors-3d',
  title: 'Vectors in 3D',
  blurb: 'Sum, difference, cross product, and scalar multiples of two vectors, drawn in space.',
  kind: 'vectorplay',
  order: 30,
};

/** The two vectors under study. Chosen so every readout below is exact. */
const V1 = { x: 3, y: 1, z: 2 };
const V2 = { x: -1, y: 3, z: 1 };

const MAG1 = Math.hypot(V1.x, V1.y, V1.z); // √14
const MAG2 = Math.hypot(V2.x, V2.y, V2.z); // √11
const DOT = V1.x * V2.x + V1.y * V2.y + V1.z * V2.z; // 2
const CROSS = {
  x: V1.y * V2.z - V1.z * V2.y, // -5
  y: V1.z * V2.x - V1.x * V2.z, // -5
  z: V1.x * V2.y - V1.y * V2.x, // 10
};
const CROSS_MAG = Math.hypot(CROSS.x, CROSS.y, CROSS.z); // √150
const ANGLE_DEG = (Math.acos(DOT / (MAG1 * MAG2)) * 180) / Math.PI;
/** The cross product is orthogonal to both inputs — exactly zero, not approximately. */
const CROSS_ORTHOGONALITY = V1.x * CROSS.x + V1.y * CROSS.y + V1.z * CROSS.z;

const SCALE_FACTOR = 2;
const AXIS_LENGTH = 4;

/** three's AxesHelper hues, lifted slightly for the dark background. */
const AXIS_COLORS = { x: '#ff5252', y: '#57ff8f', z: '#5b9dff' } as const;

interface Operations {
  sum: boolean;
  difference: boolean;
  cross: boolean;
  scaled: boolean;
}

const INITIAL_OPS: Operations = { sum: true, difference: false, cross: false, scaled: false };

export default function Vectors3D() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<VectorScene | null>(null);
  const [ops, setOps] = useState<Operations>(INITIAL_OPS);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = mountVectorScene(host, {
      background: PALETTE.background,
      gridLength: 16,
      axisLength: AXIS_LENGTH,
    });
    sceneRef.current = scene;

    labelAxis(scene, 'x', AXIS_LENGTH, 0, 0, AXIS_COLORS.x);
    labelAxis(scene, 'y', 0, AXIS_LENGTH, 0, AXIS_COLORS.y);
    labelAxis(scene, 'z', 0, 0, AXIS_LENGTH, AXIS_COLORS.z);

    // Every operation is captured once, as its own set of scene objects. The
    // toggles below only flip `visible`, so no rebuild — and no leaked WebGL
    // context — ever happens while the user explores.
    scene.capture('base', () => {
      scene.frame.addVector({ ...V1 }, true, undefined, ACCENT.purple);
      scene.frame.addVector({ ...V2 }, true, undefined, ACCENT.orange);
    });
    scene.capture('sum', () => {
      scene.frame.plotSum(new Vector(V1.x, V1.y, V1.z), new Vector(V2.x, V2.y, V2.z));
    });
    scene.capture('difference', () => {
      scene.frame.plotDifference(new Vector(V1.x, V1.y, V1.z), new Vector(V2.x, V2.y, V2.z));
    });
    scene.capture('cross', () => {
      scene.frame.plotCross(new Vector(V1.x, V1.y, V1.z), new Vector(V2.x, V2.y, V2.z));
    });
    scene.capture('scaled', () => {
      scene.frame.plotScaled(new Vector(V1.x, V1.y, V1.z), SCALE_FACTOR);
    });

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // `plotSum` / `plotDifference` / `plotScaled` each draw their inputs as well as
  // their result, so with any operation on, the library's own colors describe
  // the picture; the flat pair is only shown on its own.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const anyOperation = ops.sum || ops.difference || ops.cross || ops.scaled;
    scene.setVisible('base', !anyOperation);
    scene.setVisible('sum', ops.sum);
    scene.setVisible('difference', ops.difference);
    scene.setVisible('cross', ops.cross);
    scene.setVisible('scaled', ops.scaled);
  }, [ops]);

  const toggle = useCallback((key: keyof Operations) => {
    setOps((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const anyOperation = ops.sum || ops.difference || ops.cross || ops.scaled;

  return (
    <div className="canvas-shell" ref={hostRef}>
      <div className="overlay">
        <h3>Vectors</h3>
        <dl className="readout">
          <dt>v₁</dt>
          <dd>
            ({V1.x}, {V1.y}, {V1.z})
          </dd>
          <dt>v₂</dt>
          <dd>
            ({V2.x}, {V2.y}, {V2.z})
          </dd>
          <dt>|v₁|, |v₂|</dt>
          <dd>
            {MAG1.toFixed(2)}, {MAG2.toFixed(2)}
          </dd>
        </dl>

        <h3>Operations</h3>
        <label className="toggle">
          <input type="checkbox" checked={ops.sum} onChange={() => toggle('sum')} />
          <span className="dot" style={{ background: ACCENT.green }} />v₁ + v₂ = ({V1.x + V2.x}, {V1.y + V2.y},{' '}
          {V1.z + V2.z})
        </label>
        <label className="toggle">
          <input type="checkbox" checked={ops.difference} onChange={() => toggle('difference')} />
          <span className="dot" style={{ background: ACCENT.green }} />v₁ − v₂
        </label>
        <label className="toggle">
          <input type="checkbox" checked={ops.cross} onChange={() => toggle('cross')} />
          <span className="dot" style={{ background: ACCENT.green }} />v₁ × v₂ = ({CROSS.x}, {CROSS.y}, {CROSS.z})
        </label>
        <label className="toggle">
          <input type="checkbox" checked={ops.scaled} onChange={() => toggle('scaled')} />
          <span className="dot" style={{ background: ACCENT.green }} />{SCALE_FACTOR}v₁
        </label>

        <h3>Structure</h3>
        <dl className="readout">
          <dt>v₁ · v₂</dt>
          <dd>{DOT}</dd>
          <dt>angle between</dt>
          <dd>{ANGLE_DEG.toFixed(1)}°</dd>
          <dt>|v₁ × v₂|</dt>
          <dd>{CROSS_MAG.toFixed(2)}</dd>
          <dt>|v₁||v₂| sin θ</dt>
          <dd>{(MAG1 * MAG2 * Math.sin((ANGLE_DEG * Math.PI) / 180)).toFixed(2)}</dd>
          <dt>v₁ · (v₁ × v₂)</dt>
          <dd>{CROSS_ORTHOGONALITY}</dd>
        </dl>
        <p className="control-note">
          |v₁ × v₂| equals |v₁||v₂| sin θ, and v₁ · (v₁ × v₂) is exactly zero: the cross product is orthogonal to both
          inputs.{' '}
          {anyOperation
            ? 'Each operation draws its inputs as well as its result (yellow inputs, green result, grey the vector being subtracted), so enabling two at once superimposes two complete diagrams.'
            : 'With every operation off you see the two vectors on their own.'}
        </p>
      </div>
      <p className="hint">drag to orbit · scroll to zoom · right-drag to pan</p>
    </div>
  );
}

/** Names a coordinate axis the way the 3D tutorials label everything: a CSS2D tag on an anchor. */
function labelAxis(
  scene: VectorScene,
  text: string,
  x: number,
  y: number,
  z: number,
  color: string,
): void {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  anchor.add(makeSceneLabel(text, color));
  scene.frame.scene.add(anchor);
}
