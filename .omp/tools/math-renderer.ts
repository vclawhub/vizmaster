/**
 * OMP project tool entry point.
 *
 * OMP discovers executable custom tools in `.omp/tools/` (and in the user agent
 * directory, `~/.omp/agent/tools`), so this module exists to put the generator
 * factory where discovery looks for it. The implementation lives next to the
 * rest of the project's TypeScript in `src/tools/math-renderer.ts`, where it is
 * typechecked with everything else.
 */
export { default } from '../../src/tools/math-renderer.ts';
