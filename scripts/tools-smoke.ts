/**
 * Exercises the OMP custom tools through the same path OMP uses: discover the
 * module in `.omp/tools/`, load it with the SDK loader (which binds the real
 * `CustomToolAPI`, including the injected zod builder), validate parameters
 * against each tool's published schema, then run `execute`.
 *
 * Generated files land in `src/tutorials/` exactly as they would for a real
 * tool call, because the loader is given this repository as its working
 * directory. They are removed again unless `--keep` is passed, so the repo is
 * left with only the hand-written tutorials.
 *
 * Run with Bun (the SDK's runtime):  npm run tools:smoke
 * Keep the output for inspection:    npm run tools:smoke -- --keep
 */

import { readFile, rm } from 'node:fs/promises';

import { discoverCustomToolPaths, loadCustomTools } from '@oh-my-pi/pi-coding-agent';
import type { CustomTool, CustomToolContext } from '@oh-my-pi/pi-coding-agent';

const EXPECTED_TOOLS = ['renderFunctionPlot', 'renderVectorScene', 'renderUnitCircleTutorial'] as const;
const TOOL_MODULE = 'math-renderer.ts';
const TOOL_DIR = '/.omp/tools/';

function check(condition: boolean, description: string): void {
  if (!condition) throw new Error(`FAILED: ${description}`);
  console.log(`  ok  ${description}`);
}

async function expectRejection(action: () => Promise<unknown>, description: string): Promise<void> {
  try {
    await action();
  } catch {
    console.log(`  ok  ${description}`);
    return;
  }
  throw new Error(`FAILED: ${description}`);
}

/** What a tool's `parameters` can do once bridged into the runtime. */
interface ParseableSchema {
  safeParse(value: unknown): { success: true; data: unknown } | { success: false; error: { message: string } };
}

interface Generated {
  relativePath: string;
  absolutePath: string;
  contents: string;
}

// The SDK types `parameters` as its TSchema union while the runtime value is
// omptype's zod builder; the compiler cannot express that union, so the cast is
// pinned to one named constant with this reason.
const parseableSchema = (tool: CustomTool): ParseableSchema =>
  tool.parameters as unknown as ParseableSchema;

// The smoke run has no session, and these tools deliberately ignore `ctx`.
const isolatedContext = undefined as unknown as CustomToolContext;

async function runTool(tool: CustomTool, input: unknown): Promise<Generated> {
  const parsed = parseableSchema(tool).safeParse(input);
  if (!parsed.success) throw new Error(`schema rejected the input: ${parsed.error.message}`);

  const result = await tool.execute('smoke', parsed.data, undefined, isolatedContext);
  const details: unknown = result.details;
  if (
    typeof details !== 'object' ||
    details === null ||
    !('relativePath' in details) ||
    !('absolutePath' in details)
  ) {
    throw new Error('the tool did not report the file it wrote');
  }
  const { relativePath, absolutePath } = details;
  if (typeof relativePath !== 'string' || typeof absolutePath !== 'string') {
    throw new Error('the tool reported a non-string path');
  }

  return {
    relativePath,
    absolutePath,
    contents: await readFile(absolutePath, 'utf8'),
  };
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const keep = process.argv.includes('--keep');

  console.log('discovery');
  const discovered = await discoverCustomToolPaths([], cwd);
  const entry = discovered.find(
    (candidate) => candidate.path.replaceAll('\\', '/').includes(TOOL_DIR) && candidate.path.endsWith(TOOL_MODULE),
  );
  check(
    entry !== undefined,
    `${TOOL_DIR.slice(1)}${TOOL_MODULE} is discovered by OMP (found ${discovered.length} tool path(s))`,
  );
  if (!entry) {
    console.log(discovered.map((candidate) => `      - ${candidate.path}`).join('\n'));
    throw new Error('the project tool module was not discovered');
  }

  const { tools, errors } = await loadCustomTools([entry], cwd, []);
  check(errors.length === 0, errors.length === 0 ? 'the module loads cleanly' : `load errors: ${errors[0]?.error}`);

  const byName = new Map(tools.map((loaded) => [loaded.tool.name, loaded.tool]));
  for (const name of EXPECTED_TOOLS) check(byName.has(name), `tool "${name}" is registered`);

  const functionPlot = byName.get('renderFunctionPlot')!;
  const vectorScene = byName.get('renderVectorScene')!;
  const unitCircle = byName.get('renderUnitCircleTutorial')!;

  console.log('parameter validation');
  await expectRejection(
    () => runTool(functionPlot, { equation: 'x^2', domain: [0], range: [0, 1] }),
    'renderFunctionPlot rejects a one-element domain',
  );
  await expectRejection(
    () => runTool(vectorScene, { vectors: [{ x: 1, y: 0, z: 0, label: 'v' }], operations: ['bogus'] }),
    'renderVectorScene rejects an unknown operation name',
  );
  await expectRejection(
    () => runTool(unitCircle, { angleRange: [0, 1, 2], showSineWave: true }),
    'renderUnitCircleTutorial rejects a three-element angle range',
  );
  await expectRejection(
    () => runTool(functionPlot, { equation: 'x^2 + nonsense(x)', domain: [0, 1], range: [0, 1] }),
    'renderFunctionPlot rejects an unknown function in the equation',
  );
  await expectRejection(
    () => runTool(vectorScene, { vectors: [{ x: 1, y: 0, z: 0, label: 'v' }], operations: ['cross'] }),
    'renderVectorScene rejects cross with a single vector',
  );
  await expectRejection(
    () => runTool(unitCircle, { angleRange: [0, 12], showSineWave: true }),
    'renderUnitCircleTutorial rejects a sweep wider than one turn',
  );

  console.log('generation');
  const plot = await runTool(functionPlot, { equation: '2x^2 - 3x + 1', domain: [-5, 5], range: [-5, 15] });
  check(
    plot.contents.includes('((2 * Math.pow(x, 2)) - (3 * x)) + 1'),
    'textbook notation compiles with the right precedence into the generated file',
  );
  check(plot.contents.includes('expression={"y = 2x^{2} - 3x + 1"}'), 'the generated title is LaTeX');

  const sweep = await runTool(unitCircle, { angleRange: [0, 6.283185307179586], showSineWave: true });
  check(sweep.contents.includes('interpolate(frame, [0, DURATION], [START, END])'), 'the sweep is frame-driven');
  check(sweep.contents.includes('Math.sin'), 'the sine wave pane is generated when requested');

  const scene = await runTool(vectorScene, {
    vectors: [
      { x: 3, y: 1, z: 2, label: 'v1' },
      { x: -1, y: 3, z: 1, label: 'v2' },
    ],
    operations: ['sum', 'cross'],
  });
  check(scene.contents.includes('plotCross('), 'the requested operations are generated');
  check(scene.contents.includes('scene.capture('), 'each operation is captured as a toggleable layer');

  const generated = [plot, sweep, scene];
  console.log('\ngenerated:');
  for (const file of generated) console.log(`  ${file.relativePath} (${file.contents.length} bytes)`);

  if (keep) {
    console.log('\n--keep: leaving the generated files in place for inspection.');
    return;
  }
  for (const file of generated) await rm(file.absolutePath, { force: true });
  console.log('\ncleaned up; pass --keep to inspect the generated files.');
}

await main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
