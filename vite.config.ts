import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  // `vectorplay` ships ESM sources under `src/` and points its `module` field there,
  // but its `main` field references a `dist/vectorplay.js` that the tarball does not
  // contain. Pre-bundling keeps the dependency resolution to the working ESM entry.
  optimizeDeps: {
    include: ['three', 'vectorplay', '@elucim/core', 'react', 'react-dom', 'react-dom/client'],
  },
});
