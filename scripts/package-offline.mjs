import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const SRC = join(__dirname, '..', 'public');
const OUTPUT = join(DIST, 'calculator.html');

const htmlPath = join(DIST, 'index.html');
if (!existsSync(htmlPath)) {
  console.error('Run `npm run build` first — dist/index.html not found');
  process.exit(1);
}

let html = readFileSync(htmlPath, 'utf-8');

// Inline favicon as data URI
const faviconPath = join(SRC, 'favicon.svg');
if (existsSync(faviconPath)) {
  const svg = readFileSync(faviconPath, 'utf-8').trim();
  const dataUri = 'data:image/svg+xml,' + encodeURIComponent(svg);
  html = html.replace(/<link[^>]*rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${dataUri}" />`);
}

// Inline CSS
html = html.replace(
  /<link[^>]*rel="stylesheet"[^>]*href="\.\/assets\/(index-[^"]+\.css)"[^>]*>/,
  (_, filename) => {
    const css = readFileSync(join(DIST, 'assets', filename), 'utf-8');
    return `<style>${css}</style>`;
  }
);

// Inline JS and remove type="module" + crossorigin
let inlineScript = '';
html = html.replace(
  /<script[^>]*src="\.\/assets\/(index-[^"]+\.js)"[^>]*><\/script>/,
  (_, filename) => {
    const js = readFileSync(join(DIST, 'assets', filename), 'utf-8');
    inlineScript = `<script>${js}</script>`;
    return '';
  }
);

// Move inline script to end of body so DOM is ready before React mounts
if (inlineScript) {
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) {
    html = html.slice(0, idx) + inlineScript + '\n' + html.slice(idx);
  }
}

writeFileSync(OUTPUT, html, 'utf-8');
console.log(`Wrote ${OUTPUT}  (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
