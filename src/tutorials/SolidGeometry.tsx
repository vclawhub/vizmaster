import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
  AxesHelper,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { makeSceneLabel } from '../lib/scene-label';
import { ACCENT, PALETTE } from '../lib/theme';
import type { TutorialMeta } from '../lib/tutorial';

export const tutorial: TutorialMeta = {
  id: 'solid-geometry',
  title: 'Solid Geometry: the Regular Tetrahedron',
  blurb: 'A rotating tetrahedron with circumscribed and inscribed spheres, and a plane that slices it.',
  kind: 'three',
  order: 40,
};

/**
 * Vertices of a regular tetrahedron centred on the origin.
 *
 * These four points are pairwise equidistant (edge 2√2) and their centroid is
 * the origin, which makes every measurement below exact rather than measured:
 * circumradius √3, inradius √3/3 = R/3, volume 8/3, dihedral angle arccos(1/3).
 */
const TETRA_VERTICES: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];
const VERTEX_LABELS: readonly string[] = ['A', 'B', 'C', 'D'];
const FACE_INDICES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 2, 3],
  [1, 2, 3],
];

const CIRCUMRADIUS = Math.sqrt(3);
const INRADIUS = CIRCUMRADIUS / 3;
const EDGE_LENGTH = 2 * Math.SQRT2;
const VOLUME = 8 / 3;
const DIHEDRAL_DEG = (Math.acos(1 / 3) * 180) / Math.PI;
const FACE_AREA = (Math.sqrt(3) / 4) * EDGE_LENGTH * EDGE_LENGTH;

function vertexAt(index: number): Vector3 {
  const [x, y, z] = TETRA_VERTICES[index]!;
  return new Vector3(x, y, z);
}

/** The four faces, wound so that each normal points away from the centroid. */
const TETRA_FACES: Vector3[][] = FACE_INDICES.map(([i, j, k]) => {
  const a = vertexAt(i);
  const b = vertexAt(j);
  const c = vertexAt(k);
  const normal = b.clone().sub(a).cross(c.clone().sub(a));
  return normal.dot(a) < 0 ? [a, c, b] : [a, b, c];
});

const SECTION_NORMAL = new Vector3(1, 1, 1).normalize();
/** Signed distance of each vertex along the cutting normal: √3 for the apex, −1/√3 for the far face. */
const SECTION_SIGNED = TETRA_VERTICES.map(([x, y, z]) => SECTION_NORMAL.dot(new Vector3(x, y, z)));
const SECTION_APEX = Math.max(...SECTION_SIGNED);
const SECTION_FAR = Math.min(...SECTION_SIGNED);

/** The six edges of the tetrahedron, as vertex index pairs. */
const TETRA_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

function dedupe(points: Vector3[], epsilon = 1e-9): Vector3[] {
  const unique: Vector3[] = [];
  for (const point of points) {
    if (!unique.some((existing) => existing.distanceTo(point) < epsilon)) unique.push(point);
  }
  return unique;
}

/** Any unit vector orthogonal to `normal`. */
function perpendicularTo(normal: Vector3): Vector3 {
  const axis = Math.abs(normal.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  return axis.clone().cross(normal).normalize();
}

/**
 * Orders coplanar points by angle around the plane normal, which turns an
 * unordered point set into a simple polygon.
 */
function orderAroundNormal(points: Vector3[], normal: Vector3): Vector3[] {
  const centroid = points.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(points.length);
  const u = perpendicularTo(normal);
  const v = normal.clone().cross(u).normalize();
  return points.sort((a, b) => {
    const da = a.clone().sub(centroid);
    const db = b.clone().sub(centroid);
    return Math.atan2(da.dot(v), da.dot(u)) - Math.atan2(db.dot(v), db.dot(u));
  });
}

/**
 * The polygon where a plane meets the tetrahedron.
 *
 * For a convex body the section is exactly the set of edge crossings: a plane
 * that misses every edge cannot enter the interior. (Collecting clipped *faces*
 * instead would return the silhouette of the remaining solid, which is not
 * planar and only coincides with the section at the far face.)
 */
function crossSectionPolygon(t: number): Vector3[] {
  const distance = SECTION_APEX + t * (SECTION_FAR - SECTION_APEX);
  const crossings: Vector3[] = [];

  for (const [i, j] of TETRA_EDGES) {
    const a = vertexAt(i);
    const b = vertexAt(j);
    const da = SECTION_NORMAL.dot(a) - distance;
    const db = SECTION_NORMAL.dot(b) - distance;
    // A vertex lying on the plane is itself a section vertex.
    if (Math.abs(da) < 1e-12) crossings.push(a);
    if (Math.abs(db) < 1e-12) crossings.push(b);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      crossings.push(a.clone().lerp(b, da / (da - db)));
    }
  }

  const unique = dedupe(crossings);
  return unique.length < 3 ? unique : orderAroundNormal(unique, SECTION_NORMAL);
}

/** Shoelace area of an ordered polygon lying in the plane of `normal`. */
function polygonArea(points: Vector3[], normal: Vector3): number {
  if (points.length < 3) return 0;
  const u = perpendicularTo(normal);
  const v = normal.clone().cross(u).normalize();
  const origin = points[0]!;
  let sum = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const b = points[i]!.clone().sub(origin);
    const c = points[i + 1]!.clone().sub(origin);
    sum += b.dot(u) * c.dot(v) - c.dot(u) * b.dot(v);
  }
  return Math.abs(sum) / 2;
}

type Layer = 'inscribed' | 'circumscribed' | 'crossSection' | 'rotating';

interface SolidScene {
  setVisible(layer: Layer, visible: boolean): void;
  setSectionDepth(t: number): void;
}

export default function SolidGeometry() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SolidScene | null>(null);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({
    rotating: true,
    inscribed: true,
    circumscribed: false,
    crossSection: true,
  });
  const [depth, setDepth] = useState(0.45);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = createSolidScene(host);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setVisible('inscribed', layers.inscribed);
    scene.setVisible('circumscribed', layers.circumscribed);
    scene.setVisible('crossSection', layers.crossSection);
    scene.setVisible('rotating', layers.rotating);
  }, [layers]);

  useEffect(() => {
    sceneRef.current?.setSectionDepth(depth);
  }, [depth]);

  const section = useMemo(() => {
    const polygon = crossSectionPolygon(depth);
    const side = polygon.length >= 2 ? polygon[0]!.distanceTo(polygon[1]!) : 0;
    return { side, area: polygonArea(polygon, SECTION_NORMAL), count: polygon.length };
  }, [depth]);

  const toggle = useCallback((layer: Layer) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }, []);

  return (
    <div className="canvas-shell" ref={hostRef}>
      <div className="overlay">
        <h3>Regular tetrahedron</h3>
        <dl className="readout">
          <dt>edge a</dt>
          <dd>{EDGE_LENGTH.toFixed(3)} = 2√2</dd>
          <dt>circumradius R</dt>
          <dd>{CIRCUMRADIUS.toFixed(3)} = √3</dd>
          <dt>inradius r</dt>
          <dd>{INRADIUS.toFixed(3)} = R/3</dd>
          <dt>volume</dt>
          <dd>{VOLUME.toFixed(3)} = a³/(6√2)</dd>
          <dt>dihedral angle</dt>
          <dd>{DIHEDRAL_DEG.toFixed(2)}°</dd>
          <dt>face area</dt>
          <dd>{FACE_AREA.toFixed(3)}</dd>
        </dl>

        <h3>Layers</h3>
        <label className="toggle">
          <input type="checkbox" checked={layers.rotating} onChange={() => toggle('rotating')} />
          <span className="dot" style={{ background: PALETTE.muted }} />
          rotate
        </label>
        <label className="toggle">
          <input type="checkbox" checked={layers.inscribed} onChange={() => toggle('inscribed')} />
          <span className="dot" style={{ background: ACCENT.green }} />
          inscribed sphere (r = √3/3)
        </label>
        <label className="toggle">
          <input type="checkbox" checked={layers.circumscribed} onChange={() => toggle('circumscribed')} />
          <span className="dot" style={{ background: ACCENT.orange }} />
          circumscribed sphere (R = √3)
        </label>
        <label className="toggle">
          <input type="checkbox" checked={layers.crossSection} onChange={() => toggle('crossSection')} />
          <span className="dot" style={{ background: ACCENT.purple }} />
          cutting plane
        </label>

        <h3>Cross-section</h3>
        <div className="control">
          <div className="control-head">
            <label htmlFor="depth">depth</label>
            <span className="value">{depth.toFixed(2)}</span>
          </div>
          <input
            id="depth"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
          />
          <p className="control-note">
            0 slices the apex, 1 slices the opposite face. A plane perpendicular to a vertex axis always cuts a triangle.
          </p>
        </div>
        <dl className="readout">
          <dt>section vertices</dt>
          <dd>{section.count}</dd>
          <dt>section edge</dt>
          <dd>{section.side.toFixed(3)}</dd>
          <dt>section area</dt>
          <dd>{section.area.toFixed(3)}</dd>
          <dt>face area (depth 1)</dt>
          <dd>{FACE_AREA.toFixed(3)}</dd>
        </dl>
      </div>
      <p className="hint">drag to orbit · scroll to zoom · right-drag to pan</p>
    </div>
  );
}

/** Builds the scene, owns its render loop, and tears everything down again. */
function createSolidScene(host: HTMLElement): SolidScene & { dispose(): void } {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = 'block';
  host.append(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.classList.add('label-layer');
  host.append(labelRenderer.domElement);

  const scene = new Scene();
  scene.background = new Color(PALETTE.background);

  const camera = new PerspectiveCamera(48, 1, 0.1, 200);
  camera.position.set(3.4, 2.6, 4.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.8;
  controls.maxDistance = 14;
  controls.target.set(0, 0, 0);

  // Same reference furniture VectorPlay draws, sized to this solid.
  const grid = new GridHelper(8, 8, 0x00ffff, 0x333333);
  grid.position.y = -CIRCUMRADIUS - 0.25;
  scene.add(grid, new AxesHelper(2.4));

  scene.add(new AmbientLight(0xffffff, 0.75));
  const key = new DirectionalLight(0xffffff, 2.1);
  key.position.set(4, 7, 5);
  const fill = new DirectionalLight(0x6c5ce7, 0.9);
  fill.position.set(-5, -3, -4);
  scene.add(key, fill);

  const solid = new Group();
  scene.add(solid);

  // ---- body ----
  const positions: number[] = [];
  for (const face of TETRA_FACES) for (const point of face) positions.push(point.x, point.y, point.z);
  const tetraGeometry = new BufferGeometry();
  tetraGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  tetraGeometry.computeVertexNormals();

  const faceMaterial = new MeshStandardMaterial({
    color: new Color(ACCENT.purple),
    roughness: 0.42,
    metalness: 0.05,
    transparent: true,
    opacity: 0.42,
    // Transparent faces that write depth hide whatever sits inside the solid;
    // the inscribed sphere has to read through them.
    depthWrite: false,
    side: DoubleSide,
  });
  solid.add(new Mesh(tetraGeometry, faceMaterial));

  const edgeGeometry = new EdgesGeometry(tetraGeometry);
  const edges = new LineSegments(edgeGeometry, new LineBasicMaterial({ color: 0xc9c2ff }));
  solid.add(edges);

  const vertexGeometry = new SphereGeometry(0.06, 16, 12);
  const vertexMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  for (let i = 0; i < TETRA_VERTICES.length; i += 1) {
    const [x, y, z] = TETRA_VERTICES[i]!;
    const marker = new Mesh(vertexGeometry, vertexMaterial);
    marker.position.set(x, y, z);
    const label = makeSceneLabel(`${VERTEX_LABELS[i]}(${x}, ${y}, ${z})`, '#e8e8f2');
    label.position.set(x * 0.06, y * 0.06, z * 0.06);
    marker.add(label);
    solid.add(marker);
  }

  // ---- spheres ----
  const inscribed = new Mesh(
    new SphereGeometry(INRADIUS, 40, 24),
    new MeshStandardMaterial({
      color: new Color(ACCENT.green),
      roughness: 0.5,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide,
    }),
  );
  const circumscribed = new Mesh(
    new SphereGeometry(CIRCUMRADIUS, 40, 24),
    new MeshStandardMaterial({
      color: new Color(ACCENT.orange),
      roughness: 0.5,
      transparent: true,
      opacity: 0.12,
      wireframe: true,
    }),
  );
  solid.add(inscribed, circumscribed);

  // ---- cutting plane and its cross-section ----
  const sectionGroup = new Group();
  solid.add(sectionGroup);

  const sectionBasis = new Matrix4().makeBasis(
    perpendicularTo(SECTION_NORMAL),
    SECTION_NORMAL.clone().cross(perpendicularTo(SECTION_NORMAL)).normalize(),
    SECTION_NORMAL,
  );
  const planeMaterial = new MeshBasicMaterial({
    color: new Color(ACCENT.purple),
    transparent: true,
    opacity: 0.07,
    side: DoubleSide,
  });
  const plane = new Mesh(new PlaneGeometry(4.6, 4.6), planeMaterial);
  plane.quaternion.setFromRotationMatrix(sectionBasis);
  sectionGroup.add(plane);

  /** Holds only the objects that change with the slice depth. */
  const sectionBody = new Group();
  sectionGroup.add(sectionBody);

  const setSectionDepth = (t: number) => {
    const distance = SECTION_APEX + t * (SECTION_FAR - SECTION_APEX);
    plane.position.copy(SECTION_NORMAL.clone().multiplyScalar(distance));

    for (const child of [...sectionBody.children]) {
      const rendered = child as Mesh | LineLoop;
      rendered.geometry.dispose();
      const material = (rendered as Mesh).material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material?.dispose();
      sectionBody.remove(rendered);
    }

    const polygon = crossSectionPolygon(t);
    if (polygon.length < 3) return;

    const centroid = polygon.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(polygon.length);
    const fanPositions: number[] = [];
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i]!;
      const b = polygon[(i + 1) % polygon.length]!;
      fanPositions.push(centroid.x, centroid.y, centroid.z, a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const fanGeometry = new BufferGeometry();
    fanGeometry.setAttribute('position', new Float32BufferAttribute(fanPositions, 3));
    fanGeometry.computeVertexNormals();
    const fan = new Mesh(
      fanGeometry,
      new MeshBasicMaterial({ color: new Color('#9d8bff'), transparent: true, opacity: 0.55, side: DoubleSide }),
    );

    const outline = new LineLoop(
      new BufferGeometry().setFromPoints(polygon),
      new LineBasicMaterial({ color: new Color('#c9c2ff') }),
    );
    sectionBody.add(fan, outline);
  };

  // ---- sizing, loop, teardown ----
  const applySize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  };
  applySize();
  const resizeObserver = new ResizeObserver(applySize);
  resizeObserver.observe(host);

  let rotating = true;
  let elapsed = 0;
  let previous = performance.now();
  let frameHandle = requestAnimationFrame(function tick(now: number) {
    frameHandle = requestAnimationFrame(tick);
    // Clamp so a backgrounded tab does not jump the solid on return.
    const delta = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    elapsed += delta;
    if (rotating) {
      solid.rotation.y += delta * 0.42;
      solid.rotation.x = 0.24 + Math.sin(elapsed * 0.3) * 0.07;
    }
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return {
    setVisible(layer, visible) {
      if (layer === 'rotating') rotating = visible;
      else if (layer === 'inscribed') inscribed.visible = visible;
      else if (layer === 'circumscribed') circumscribed.visible = visible;
      else sectionGroup.visible = visible;
    },
    setSectionDepth,
    dispose() {
      cancelAnimationFrame(frameHandle);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      labelRenderer.domElement.remove();
      renderer.domElement.remove();
    },
  };
}
