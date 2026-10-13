import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Elucim's <LaTeX> renders KaTeX markup, and KaTeX ships its metrics as CSS.
// Without this import, fractions and radicals collapse to unstyled HTML.
import 'katex/dist/katex.min.css';
import './styles.css';

import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
