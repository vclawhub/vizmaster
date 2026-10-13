/**
 * Layout math for Elucim's coordinate primitives.
 *
 * Elucim's `<Axes>`, `<FunctionPlot>`, and `<Vector>` all take an SVG-space
 * `origin` plus a pixels-per-unit `scale`, and Elucim uses a *single* scale for
 * both axes. This module turns a math domain/range into the exact scene
 * dimensions and origin needed to fit it with equal unit lengths on both axes,
 * so panes line up without hand-tuned pixel constants.
 */

export interface PlotLayout {
  /** SVG-space position of the math origin (0, 0). */
  origin: [number, number];
  /** Pixels per math unit, identical on both axes. */
  scale: number;
  domain: [number, number];
  range: [number, number];
  /** Scene width that fits `domain` with the requested padding. */
  width: number;
  /** Scene height that fits `range` with the requested padding. */
  height: number;
}

export interface PlotRequest {
  domain: [number, number];
  range: [number, number];
  /** Pixels per math unit. */
  scale: number;
  /** Horizontal padding around the plot, in pixels. Default 40. */
  padX?: number;
  /** Vertical padding around the plot, in pixels. Default 40. */
  padY?: number;
}

/**
 * Solve the origin/dimensions for a plot.
 *
 * Invariants (checked by the tutorials' layout assertions shown in the README):
 * `domain[0]` maps to `padX`, `domain[1]` to `width - padX`, `range[0]` to
 * `height - padY`, and `range[1]` to `padY`.
 */
export function makePlot({ domain, range, scale, padX = 40, padY = 40 }: PlotRequest): PlotLayout {
  const [xMin, xMax] = domain;
  const [yMin, yMax] = range;
  if (!(xMax > xMin)) throw new Error(`makePlot: domain must ascend, got [${xMin}, ${xMax}]`);
  if (!(yMax > yMin)) throw new Error(`makePlot: range must ascend, got [${yMin}, ${yMax}]`);
  if (!(scale > 0)) throw new Error(`makePlot: scale must be positive, got ${scale}`);

  const width = (xMax - xMin) * scale + 2 * padX;
  const height = (yMax - yMin) * scale + 2 * padY;

  return {
    origin: [padX - xMin * scale, height - padY + yMin * scale],
    scale,
    domain,
    range,
    width,
    height,
  };
}

/**
 * Math coordinates → SVG coordinates.
 *
 * Elucim exports an equivalent `mathToSvg`, but it defaults `origin` to
 * `[400, 300]`, whereas every plot here derives its origin from `makePlot`.
 */
export function toSvg(layout: Pick<PlotLayout, 'origin' | 'scale'>, x: number, y: number): [number, number] {
  const [ox, oy] = layout.origin;
  return [ox + x * layout.scale, oy - y * layout.scale];
}

/** Formats a number for on-canvas labels without trailing zeros. */
export function fmt(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return value > 0 ? '\\infty' : '-\\infty';
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}
