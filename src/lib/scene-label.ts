import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * A CSS2D label in the dark educational style used by both 3D tutorials.
 *
 * VectorPlay's own `addLabel` is hard-wired to 50% opacity (it targets the
 * point markers it creates), which is too faint for axis names that carry the
 * meaning of the scene. This helper keeps the same typeface, padding, radius,
 * and surface colour at full opacity, so labels from either library read as one
 * system.
 */
export function makeSceneLabel(text: string, color: string): CSS2DObject {
  const element = document.createElement('div');
  element.textContent = text;
  element.style.color = color;
  element.style.fontSize = '12px';
  element.style.fontFamily = 'monospace';
  element.style.backgroundColor = 'rgba(20, 20, 32, 0.85)';
  element.style.padding = '2px 4px';
  element.style.borderRadius = '4px';
  element.style.whiteSpace = 'nowrap';
  return new CSS2DObject(element);
}
