import {
  Axes,
  Circle,
  Draw,
  FadeIn,
  FunctionPlot,
  LaTeX,
  Line,
  Player,
  Polygon,
  Sequence,
  Stagger,
  Text,
  Transform,
  Vector,
  Write,
  easeOutCubic,
  interpolate,
  useCurrentFrame,
} from '@elucim/core';
import type { PlayerRef } from '@elucim/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { fmt, makePlot, toSvg } from '../lib/plot';
import { ACCENT, AXIS_STYLE, PALETTE, SCENE_BACKGROUND } from '../lib/theme';
import type { TutorialMeta } from '../lib/tutorial';

export const tutorial: TutorialMeta = {
  id: 'unit-circle',
  title: 'Unit Circle ↔ Sine Wave',
  blurb: 'A radius sweeps the unit circle while its height unrolls into a sine wave.',
  kind: 'elucim',
  order: 10,
};

const TWO_PI = Math.PI * 2;
const FPS = 30;
/** One full revolution per loop. 360 frames at 30 fps = 12 s. */
const DURATION = 360;

/**
 * Pixels per unit. Both panes share it, so the green leg on the circle and the
 * green cursor in the wave have *identical* pixel lengths — the visual claim of
 * this tutorial is that they are the same number.
 */
const SCALE = 84;

const CIRCLE_PLOT = makePlot({ domain: [-1.4, 1.4], range: [-1.4, 1.4], scale: SCALE, padX: 36, padY: 36 });
const WAVE_PLOT = makePlot({ domain: [0, TWO_PI], range: [-1.5, 1.5], scale: SCALE, padX: 0, padY: 30 });

const CIRCLE = { ...CIRCLE_PLOT, origin: [26 + CIRCLE_PLOT.origin[0], 24 + CIRCLE_PLOT.origin[1]] as [number, number] };
const WAVE_DY = 24 + CIRCLE_PLOT.height + 34;
const WAVE = {
  ...WAVE_PLOT,
  origin: [24 + WAVE_PLOT.origin[0], WAVE_DY + WAVE_PLOT.origin[1]] as [number, number],
};

/** Right-hand column holding the live readouts, clear of both panes. */
const COLUMN_X = 26 + CIRCLE_PLOT.width + 16;
const SCENE_WIDTH = Math.ceil(Math.max(COLUMN_X + 236, 24 + WAVE_PLOT.width + 18));
const SCENE_HEIGHT = Math.ceil(WAVE_DY + WAVE_PLOT.height + 20);

const [CX, CY] = CIRCLE.origin;

/** Radians → the frame that renders them, so the slider can drive the Player. */
const frameFor = (radians: number) => Math.min(DURATION - 1, Math.max(0, Math.round((radians / TWO_PI) * DURATION)));

export default function UnitCircle() {
  const playerRef = useRef<PlayerRef | null>(null);
  /** Non-null while the angle slider is parked; the scene then follows it. */
  const [parked, setParked] = useState<number | null>(null);
  /** The scene writes the live angle into these, outside React's render path. */
  const angleInputRef = useRef<HTMLInputElement | null>(null);
  const angleLabelRef = useRef<HTMLSpanElement | null>(null);

  const onAngleChange = useCallback((radians: number) => {
    setParked(radians);
    playerRef.current?.pause();
    playerRef.current?.seekToFrame(frameFor(radians));
  }, []);

  const onFollow = useCallback(() => {
    setParked(null);
    playerRef.current?.play();
  }, []);

  // Resuming from the Player's own controls is continuous: parking the slider
  // always seeks to the matching frame first.
  const onPlayStateChange = useCallback((playing: boolean) => {
    if (playing) setParked(null);
  }, []);

  const isParked = parked !== null;

  return (
    <div className="stage">
      <div className="player-shell">
        <Player
          ref={playerRef}
          width={SCENE_WIDTH}
          height={SCENE_HEIGHT}
          fps={FPS}
          durationInFrames={DURATION}
          autoPlay
          loop
          background={SCENE_BACKGROUND}
          controlsBackground={PALETTE.panel}
          controlsColor={PALETTE.text}
          controlsAccent={ACCENT.purple}
          onPlayStateChange={onPlayStateChange}
          style={{ width: '100%', maxWidth: `${SCENE_WIDTH}px` }}
        >
          <Scene parked={parked} angleInput={angleInputRef} angleLabel={angleLabelRef} />
        </Player>
      </div>

      <aside className="panel">
        <h3>Angle</h3>
        <div className="control">
          <div className="control-head">
            <label htmlFor="theta">θ</label>
            <span className="value" ref={angleLabelRef}>
              —
            </span>
          </div>
          <AngleSlider inputRef={angleInputRef} onChange={onAngleChange} />
          <p className="control-note">
            Dragging pauses playback and seeks the Player to that angle. Uniform angular speed is the one motion in this
            scene that is deliberately linear: a constant ω is what makes the wave a sine, not a distorted one.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="ghost" onClick={onFollow} disabled={!isParked}>
            Follow the animation
          </button>
        </div>
        <p className="control-note">
          While parked, the scene holds the angle you chose; the rotation resumes from the same point when you press play
          (or the button above).
        </p>
      </aside>
    </div>
  );
}

/**
 * The slider is a live view of the animation: while the Player drives the frame
 * it shows θ(frame); once dragged it owns the angle. It is deliberately
 * uncontrolled — only the scene, which sits inside the Player, can read the
 * frame clock, so the scene writes the current angle into it every frame.
 */
function AngleSlider({
  inputRef,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (radians: number) => void;
}) {
  return (
    <input
      id="theta"
      ref={inputRef}
      type="range"
      min={0}
      max={TWO_PI}
      step={0.01}
      defaultValue={0}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function Scene({
  parked,
  angleInput,
  angleLabel,
}: {
  parked: number | null;
  angleInput: RefObject<HTMLInputElement | null>;
  angleLabel: RefObject<HTMLSpanElement | null>;
}) {
  const frame = useCurrentFrame();

  // θ advances uniformly — see the note in the side panel. `interpolate` clamps
  // at 2π, so the loop's last frame lands exactly on a full revolution.
  const animated = interpolate(frame, [0, DURATION], [0, TWO_PI]);
  const theta = parked ?? animated;

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const degrees = (theta * 180) / Math.PI;

  const arc = useMemo(() => {
    const steps = Math.max(2, Math.ceil((theta / TWO_PI) * 96));
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i += 1) {
      const a = (theta * i) / steps;
      points.push(toSvg(CIRCLE, 0.34 * Math.cos(a), 0.34 * Math.sin(a)));
    }
    return points;
  }, [theta]);

  // See `AngleSlider`: publish θ imperatively so the controls never lie and the
  // parent does not re-render 30 times a second.
  useEffect(() => {
    const angle = parked ?? theta;
    if (angleInput.current) angleInput.current.value = String(angle);
    if (angleLabel.current) angleLabel.current.textContent = `${fmt(angle)} rad — drag to scrub`;
  });

  // Keep the θ label off the x-axis for small angles.
  const labelAngle = Math.max(theta / 2, 0.28);
  const thetaLabel = toSvg(CIRCLE, 0.5 * Math.cos(labelAngle), 0.5 * Math.sin(labelAngle) + 0.1);

  const movingPoint = toSvg(CIRCLE, cos, sin);
  const wavePoint = toSvg(WAVE, theta, sin);
  const waveZeroY = toSvg(WAVE, 0, 0)[1];
  // The link between the two panes only earns attention once the trace is moving.
  const connectorOpacity = interpolate(frame, [45, 75], [0, 0.55], { easing: easeOutCubic });

  return (
    <>
      {/* ---- unit circle pane ---- */}
      <Write duration={40}>
        <Text x={26} y={26} fill={PALETTE.muted} fontSize={15} fontWeight={600} textAnchor="start">
          unit circle: the point (cos θ, sin θ)
        </Text>
      </Write>
      <Axes
        domain={CIRCLE.domain}
        range={CIRCLE.range}
        origin={CIRCLE.origin}
        scale={CIRCLE.scale}
        showGrid
        tickStep={0.5}
        fadeIn={24}
        {...AXIS_STYLE}
      />
      <Draw duration={40}>
        <Circle cx={CX} cy={CY} r={SCALE} stroke={ACCENT.purple} strokeWidth={2} fill="none" opacity={0.55} />
      </Draw>

      {/* Component legs: cos along x (orange), sin along y (green). */}
      <Vector from={[0, 0]} to={[cos, 0]} origin={CIRCLE.origin} scale={CIRCLE.scale} color={ACCENT.orange} strokeWidth={2} />
      <Vector
        from={[cos, 0]}
        to={[cos, sin]}
        origin={CIRCLE.origin}
        scale={CIRCLE.scale}
        color={ACCENT.green}
        strokeWidth={2.5}
      />
      <Vector
        from={[0, 0]}
        to={[cos, sin]}
        origin={CIRCLE.origin}
        scale={CIRCLE.scale}
        color={ACCENT.purple}
        strokeWidth={2.5}
      />

      <Polygon points={arc} closed={false} fill="none" stroke={ACCENT.orange} strokeWidth={2} />
      <LaTeX expression="\theta" x={thetaLabel[0]} y={thetaLabel[1]} color={ACCENT.orange} fontSize={16} />
      <Circle cx={movingPoint[0]} cy={movingPoint[1]} r={5.5} fill={ACCENT.green} stroke={PALETTE.background} strokeWidth={2} />

      {/* ---- sine wave pane ---- */}
      <Axes
        domain={WAVE.domain}
        range={WAVE.range}
        origin={WAVE.origin}
        scale={WAVE.scale}
        showGrid
        tickStep={1}
        fadeIn={24}
        {...AXIS_STYLE}
      />
      <LaTeX
        expression="y = \sin\theta"
        x={WAVE.origin[0] + 12}
        y={WAVE.origin[1] - 1.5 * WAVE.scale - 8}
        color={ACCENT.green}
        fontSize={15}
        align="left"
      />
      <LaTeX
        expression="2\pi"
        x={WAVE.origin[0] + TWO_PI * WAVE.scale}
        y={waveZeroY + 34}
        color={PALETTE.tick}
        fontSize={13}
      />
      {/* The wave the animation is tracing, kept dim for reference. */}
      <FadeIn duration={40}>
        <FunctionPlot
          fn={Math.sin}
          domain={WAVE.domain}
          yClamp={[-1.5, 1.5]}
          origin={WAVE.origin}
          scale={WAVE.scale}
          color={ACCENT.green}
          strokeWidth={1.5}
          opacity={0.3}
        />
      </FadeIn>

      <Sequence from={30}>
        {/* Traced portion: the curve over the angle swept so far. */}
        <FunctionPlot
          fn={Math.sin}
          domain={[0, Math.max(theta, 0.02)]}
          yClamp={[-1.5, 1.5]}
          origin={WAVE.origin}
          scale={WAVE.scale}
          color={ACCENT.green}
          strokeWidth={2.5}
        />
        {/* Same color, same length as the circle's green leg. */}
        <Line
          x1={wavePoint[0]}
          y1={waveZeroY}
          x2={wavePoint[0]}
          y2={wavePoint[1]}
          stroke={ACCENT.green}
          strokeWidth={3}
        />
        <Circle cx={wavePoint[0]} cy={wavePoint[1]} r={5} fill={ACCENT.green} stroke={PALETTE.background} strokeWidth={2} />
        {/* Ties the circle's y-coordinate to the height it unrolls into. */}
        <Line
          x1={movingPoint[0]}
          y1={movingPoint[1]}
          x2={wavePoint[0]}
          y2={wavePoint[1]}
          stroke={PALETTE.muted}
          strokeWidth={1}
          lineStyle="dashed"
          opacity={connectorOpacity}
        />
      </Sequence>

      {/* ---- live readouts ---- */}
      <Sequence from={20}>
        <Transform duration={26} translate={{ from: [16, 0], to: [0, 0] }} opacity={{ from: 0, to: 1 }}>
          <LaTeX expression={`\\theta = ${fmt(theta)}\\ \\text{rad}`} x={COLUMN_X} y={92} color={PALETTE.text} fontSize={17} align="left" />
          <LaTeX
            expression={`\\textcolor{${ACCENT.green}}{\\sin\\theta = ${fmt(sin)}}`}
            x={COLUMN_X}
            y={128}
            color={ACCENT.green}
            fontSize={17}
            align="left"
          />
          <LaTeX
            expression={`\\textcolor{${ACCENT.orange}}{\\cos\\theta = ${fmt(cos)}}`}
            x={COLUMN_X}
            y={164}
            color={ACCENT.orange}
            fontSize={17}
            align="left"
          />
          <LaTeX
            expression={`\\theta = ${fmt(degrees, 1)}^{\\circ}`}
            x={COLUMN_X}
            y={200}
            color={PALETTE.muted}
            fontSize={15}
            align="left"
          />
        </Transform>
      </Sequence>

      <FadeIn duration={20}>
        <Stagger staggerDelay={9}>
          <LegendRow y={262} color={ACCENT.purple} text="radius r = 1" />
          <LegendRow y={292} color={ACCENT.green} text="sin θ — height above the x-axis" />
          <LegendRow y={322} color={ACCENT.orange} text="cos θ — horizontal coordinate" />
        </Stagger>
      </FadeIn>
    </>
  );
}

function LegendRow({ y, color, text }: { y: number; color: string; text: string }) {
  return (
    <g>
      <Circle cx={COLUMN_X + 6} cy={y - 4} r={5} fill={color} />
      <Text x={COLUMN_X + 20} y={y} fill={PALETTE.text} fontSize={13} textAnchor="start">
        {text}
      </Text>
    </g>
  );
}
