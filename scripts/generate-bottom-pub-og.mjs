#!/usr/bin/env node
/** Bespoke OG card for /case-studies/bottom-pub-project/. */
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const output = path.join(root, 'public', 'og', 'case-studies', 'bottom-pub-project.png');
const width = 1200;
const height = 630;
const colors = { bg: '#1a181c', accent: '#c48b6e', text: '#e2ddd8', muted: '#968e96', border: '#3d3844' };

const layers = [
  ['SITE', 950, 90, 170, 64],
  ['RESEARCH', 870, 170, 250, 64],
  ['DATA', 995, 250, 125, 64],
  ['PRIVACY', 800, 330, 320, 64],
  ['AUTOMATION', 720, 410, 400, 64],
]
  .map(
    ([label, x, y, layerWidth, layerHeight], index) =>
      `<rect x="${x}" y="${y}" width="${layerWidth}" height="${layerHeight}" rx="8" fill="none" stroke="${index === 4 ? colors.accent : colors.border}" stroke-width="2" />
     <text x="${Number(x) + 18}" y="${Number(y) + 39}" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="16" fill="${index === 4 ? colors.accent : colors.muted}">${label}</text>`,
  )
  .join('\n');

const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${colors.bg}" />
  ${layers}
  <text x="80" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="58" font-weight="700" fill="${colors.text}">There was no brief.</text>
  <text x="80" y="302" font-family="system-ui, -apple-system, sans-serif" font-size="58" font-weight="700" fill="${colors.text}">There was a pub.</text>
  <text x="80" y="355" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="21" fill="${colors.accent}">THREE MONTHS · ONE WORKING SYSTEM</text>
  <text x="80" y="560" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="18" fill="${colors.muted}">adrianwedd.com/case-studies/bottom-pub-project</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(output);
console.log(`[bottom-pub-og] wrote ${path.relative(root, output)}`);
