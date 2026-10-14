# Security policy

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** (Security → Advisories → New
draft security advisory) rather than a public issue. You can expect a response
within a week.

## Scope and posture

VizMaster is a static, client-side application. The shipped bundle:

- contains no secrets and reads none from the environment;
- talks to no backend — the dev server and `vite preview` only serve assets;
- renders all mathematics through React text nodes and KaTeX
  (`throwOnError`-safe markup generated from validated numbers and fixed
  strings), never through `innerHTML`.

### OMP generator tools

`src/tools/math-renderer.ts` defines agent-callable tools, and
`.omp/tools/math-renderer.ts` makes OMP auto-discover them when this repository
is opened as a project. Their constraints:

- equations are compiled by a whitelisted recursive-descent parser; the parser
  never `eval`s and rejects any token outside its allow-list, so generated
  files cannot contain unreviewed expressions;
- vector labels and all other free-text inputs reach generated files only
  through `JSON.stringify` string literals or braced JSX string expressions,
  never as raw JSX/interpolation;
- the tools write only into `src/tutorials/`, and file names are slugified
  (`[^a-z0-9]+` → `-`), so no path can escape that directory;
- `scripts/tools-smoke.ts` exercises the tools through the real SDK loader,
  including hostile-input rejection.

## Dependency policy

`npm audit` (including `--omit=dev`) is expected to stay clean. katex is pinned
with a `package.json` override (`^0.18.2`) so the tree does not pull the
advisory-affected 0.16 line that `@elucim/core` still declares; rendering is
verified after every dependency change.
