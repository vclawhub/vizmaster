/**
 * One visual language for every tutorial: a dark canvas, a raised panel, and
 * three accent colors. Scenes, the shell, and the OMP generators all read from
 * here so a generated tutorial cannot drift away from the hand-written ones.
 */

/** Structural colors (surfaces, text, chrome). */
export const PALETTE = {
  background: '#0d0d0d',
  panel: '#1a1a2e',
  panelRaised: '#14142a',
  border: '#2a2a44',
  text: '#e8e8f2',
  muted: '#8b8ba7',
  /** Axis lines. */
  axis: '#4a4a6a',
  /** Grid lines — deliberately dimmer than the axes they belong to. */
  grid: '#242438',
  /** Tick labels. */
  tick: '#9a9ab8',
} as const;

/** Accent colors. Purple carries the primary object, green the result of an
 * operation, orange the secondary object being combined. */
export const ACCENT = {
  purple: '#6c5ce7',
  green: '#00b894',
  orange: '#e17055',
} as const;

/**
 * Axis styling forwarded to every Elucim `<Axes>` so plots match across
 * tutorials instead of each one inventing its own greys.
 */
export const AXIS_STYLE = {
  axisColor: PALETTE.axis,
  gridColor: PALETTE.grid,
  labelColor: PALETTE.tick,
} as const;

/** Shared player background (also the `<html>` background). */
export const SCENE_BACKGROUND = PALETTE.background;
