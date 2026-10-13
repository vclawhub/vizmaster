import {
  Axes,
  Circle,
  Draw,
  FadeIn,
  FunctionPlot,
  LaTeX,
  Line,
  Matrix,
  Player,
  Sequence,
  Stagger,
  Text,
  Transform,
  Vector,
  easeOutCubic,
} from '@elucim/core';
import { useMemo, useState } from 'react';

import { fmt, makePlot, toSvg } from '../lib/plot';
import { ACCENT, AXIS_STYLE, PALETTE, SCENE_BACKGROUND } from '../lib/theme';
import type { TutorialMeta } from '../lib/tutorial';

export const tutorial: TutorialMeta = {
  id: 'quadratic-functions',
  title: 'Quadratic Functions',
  blurb: 'Drag a, b, and c and watch the parabola, its vertex, and its roots move together.',
  kind: 'elucim',
  order: 20,
};

const PLOT = makePlot({ domain: [-5, 5], range: [-5, 15], scale: 30, padX: 60, padY: 56 });
const SCENE_WIDTH = PLOT.width;
const SCENE_HEIGHT = PLOT.height;
const DURATION = 150;

/** Beyond this |a| the curve leaves the pane for good; at 0 it is not a parabola. */
const A_EPSILON = 1e-9;

interface Parabola {
  kind: 'parabola';
  vertex: { x: number; y: number };
  /** Real roots, ascending; a repeated root appears once. */
  roots: number[];
  discriminant: number;
}

interface Degenerate {
  kind: 'degenerate';
  reason: string;
}

type Analysis = Parabola | Degenerate;

/**
 * Everything the scene needs, derived once per coefficient change.
 *
 * For y = ax² + bx + c: the vertex sits at h = −b/2a with k = c − b²/4a
 * (completing the square), and the roots are (−b ± √D)/2a for D = b² − 4ac.
 */
function analyse(a: number, b: number, c: number): Analysis {
  if (Math.abs(a) < A_EPSILON) {
    return { kind: 'degenerate', reason: 'a = 0 leaves a straight line, not a parabola' };
  }
  const discriminant = b * b - 4 * a * c;
  const vertex = { x: -b / (2 * a), y: c - (b * b) / (4 * a) };
  if (discriminant < 0) {
    return { kind: 'parabola', vertex, roots: [], discriminant };
  }
  const root = Math.sqrt(discriminant);
  const lo = (-b - root) / (2 * a);
  const hi = (-b + root) / (2 * a);
  const roots = discriminant === 0 ? [lo] : [Math.min(lo, hi), Math.max(lo, hi)];
  return { kind: 'parabola', vertex, roots, discriminant };
}

export default function QuadraticFunctions() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-2);
  const [c, setC] = useState(-3);

  const analysis = useMemo(() => analyse(a, b, c), [a, b, c]);

  const equation = `y = ${fmt(a)}x^{2} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b))}x ${c < 0 ? '-' : '+'} ${fmt(
    Math.abs(c),
  )}`;

  return (
    <div className="stage">
      <div className="player-shell">
        <Player
          width={SCENE_WIDTH}
          height={SCENE_HEIGHT}
          fps={30}
          durationInFrames={DURATION}
          autoPlay
          loop
          background={SCENE_BACKGROUND}
          controlsBackground={PALETTE.panel}
          controlsColor={PALETTE.text}
          controlsAccent={ACCENT.purple}
          style={{ width: '100%', maxWidth: `${SCENE_WIDTH}px` }}
        >
          <Scene a={a} b={b} c={c} equation={equation} analysis={analysis} />
        </Player>
      </div>

      <aside className="panel">
        <h3>Coefficients</h3>
        <Coefficient id="a" label="a" value={a} min={-3} max={3} step={0.05} onChange={setA} note="vertical stretch / direction" />
        <Coefficient id="b" label="b" min={-6} max={6} step={0.1} value={b} onChange={setB} note="shifts the axis of symmetry to −b/2a" />
        <Coefficient id="c" label="c" min={-5} max={10} step={0.1} value={c} onChange={setC} note="the y-intercept (0, c)" />

        <h3>Derived</h3>
        <dl className="readout">
          <dt>vertex</dt>
          <dd>
            {analysis.kind === 'parabola'
              ? `(${fmt(analysis.vertex.x)}, ${fmt(analysis.vertex.y)})`
              : '—'}
          </dd>
          <dt>axis of symmetry</dt>
          <dd>{analysis.kind === 'parabola' ? `x = ${fmt(analysis.vertex.x)}` : '—'}</dd>
          <dt>discriminant D = b² − 4ac</dt>
          <dd>{analysis.kind === 'parabola' ? fmt(analysis.discriminant) : '—'}</dd>
          <dt>real roots</dt>
          <dd>{rootSummary(analysis)}</dd>
        </dl>
        <p className="control-note">
          D &gt; 0 gives two real roots, D = 0 a repeated one, and D &lt; 0 none — the parabola floats clear of the x-axis.
        </p>
      </aside>
    </div>
  );
}

function rootSummary(analysis: Analysis): string {
  if (analysis.kind === 'degenerate') return '—';
  if (analysis.roots.length === 0) return 'none (D < 0)';
  return analysis.roots.map((root) => `x = ${fmt(root)}`).join(', ');
}

function Coefficient({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  note,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  note: string;
}) {
  return (
    <div className="control">
      <div className="control-head">
        <label htmlFor={id}>{label}</label>
        <span className="value">{fmt(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p className="control-note">{note}</p>
    </div>
  );
}

function Scene({
  a,
  b,
  c,
  equation,
  analysis,
}: {
  a: number;
  b: number;
  c: number;
  equation: string;
  analysis: Analysis;
}) {
  const fn = useMemo(() => (x: number) => a * x * x + b * x + c, [a, b, c]);
  const vertex = analysis.kind === 'parabola' ? analysis.vertex : null;
  const roots = analysis.kind === 'parabola' ? analysis.roots : [];

  return (
    <>
      <Axes
        domain={PLOT.domain}
        range={PLOT.range}
        origin={PLOT.origin}
        scale={PLOT.scale}
        showGrid
        tickStep={1}
        fadeIn={20}
        {...AXIS_STYLE}
      />

      {/* Live equation, placed in the pane's padding band. */}
      <Transform duration={24} translate={{ from: [-18, 0], to: [0, 0] }} opacity={{ from: 0, to: 1 }}>
        <LaTeX expression={equation} x={SCENE_WIDTH / 2} y={34} color={ACCENT.purple} fontSize={19} />
      </Transform>

      <FunctionPlot
        fn={fn}
        domain={PLOT.domain}
        yClamp={PLOT.range}
        origin={PLOT.origin}
        scale={PLOT.scale}
        color={ACCENT.purple}
        strokeWidth={2.5}
        draw={45}
        easing={easeOutCubic}
      />

      {/* Axis of symmetry: only meaningful once we know where the vertex is. */}
      {vertex && (
        <Sequence from={40}>
          <Draw duration={30}>
            <Line
              x1={toSvg(PLOT, vertex.x, PLOT.range[1])[0]}
              y1={toSvg(PLOT, vertex.x, PLOT.range[1])[1]}
              x2={toSvg(PLOT, vertex.x, PLOT.range[0])[0]}
              y2={toSvg(PLOT, vertex.x, PLOT.range[0])[1]}
              stroke={ACCENT.orange}
              strokeWidth={1.5}
              lineStyle="dashed"
              opacity={0.6}
            />
          </Draw>
        </Sequence>
      )}

      <Sequence from={45}>
        <Stagger staggerDelay={8}>
          {vertex && (
            <g>
              {/* Position vector of the vertex — the point is a displacement from the origin. */}
              <Vector
                from={[0, 0]}
                to={[vertex.x, vertex.y]}
                origin={PLOT.origin}
                scale={PLOT.scale}
                color={ACCENT.purple}
                strokeWidth={1.5}
                label="V"
                labelColor={ACCENT.purple}
                labelFontSize={15}
              />
              <Circle
                cx={toSvg(PLOT, vertex.x, vertex.y)[0]}
                cy={toSvg(PLOT, vertex.x, vertex.y)[1]}
                r={5.5}
                fill={ACCENT.purple}
                stroke={PALETTE.background}
                strokeWidth={2}
              />
              <LaTeX
                expression={`V\\left(${fmt(vertex.x)},\\, ${fmt(vertex.y)}\\right)`}
                x={toSvg(PLOT, vertex.x, vertex.y)[0] + 12}
                y={toSvg(PLOT, vertex.x, vertex.y)[1] + (a > 0 ? 26 : -16)}
                color={ACCENT.purple}
                fontSize={14}
                align="left"
              />
            </g>
          )}
          {roots.map((root, index) => (
            <g key={`root-${index}`}>
              <Circle
                cx={toSvg(PLOT, root, 0)[0]}
                cy={toSvg(PLOT, root, 0)[1]}
                r={5.5}
                fill={ACCENT.green}
                stroke={PALETTE.background}
                strokeWidth={2}
              />
              <LaTeX
                expression={`x_{${index + 1}} = ${fmt(root)}`}
                x={toSvg(PLOT, root, 0)[0]}
                y={toSvg(PLOT, root, 0)[1] + 26}
                color={ACCENT.green}
                fontSize={14}
              />
            </g>
          ))}
        </Stagger>
      </Sequence>

      {/* Coefficient vector [a b c], the numbers the sliders own. */}
      <FadeIn duration={30}>
        <Text x={PLOT.origin[0] - 5 * PLOT.scale - 56} y={SCENE_HEIGHT - 42} fill={PALETTE.muted} fontSize={11} textAnchor="start">
          coefficients
        </Text>
        <Matrix
          values={[[fmt(a), fmt(b), fmt(c)]]}
          x={PLOT.origin[0] - 5 * PLOT.scale - 52}
          y={SCENE_HEIGHT - 34}
          cellSize={24}
          fontSize={14}
          color={PALETTE.text}
          bracketColor={PALETTE.muted}
        />
      </FadeIn>

      {analysis.kind === 'degenerate' && (
        <LaTeX expression="\text{a linear function}" x={SCENE_WIDTH / 2} y={SCENE_HEIGHT - 60} color={PALETTE.muted} fontSize={14} />
      )}
    </>
  );
}
