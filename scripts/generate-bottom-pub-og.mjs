#!/usr/bin/env node
/**
 * Bespoke OG card for /case-studies/bottom-pub-project/ — a desaturated
 * render of the conditions field (the page's hero), with the H1 over it.
 * Formulas mirror src/lib/bottom-pub-charts.ts; kept as plain JS here so this
 * script has no TypeScript/Astro build dependency.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'og', 'case-studies', 'bottom-pub-project.png');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'bottom-pub-cohort-findings.json'), 'utf-8'));

const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = { bg: '#1a181c', accent: '#c48b6e', text: '#e2ddd8', muted: '#968e96', border: '#3d3844' };

const N90 = DATA.meta.pledge_linked_n;
const N55 = DATA.meta.no_linked_pledge_n;
const NFIN = DATA.meta.financial_survey_n;
const conditions = DATA.pairs
  .filter((p) => p.group === 'conditions')
  .map((p) => {
    const p90 = (p.pledged / N90) * 100;
    const p55 = (p.not_pledged / N55) * 100;
    return { ...p, p90, p55, delta: p90 - p55, pooled: ((p.pledged + p.not_pledged) / NFIN) * 100 };
  });
const pooledMax = Math.max(...conditions.map((p) => p.pooled));
const pooledMin = Math.min(...conditions.map((p) => p.pooled));

const FRAME = { cx: WIDTH / 2, half: 520, yTop: 90, yBot: 480 };
const nodes = conditions.map((p) => ({
  ...p,
  x: FRAME.cx + (p.delta / 16) * FRAME.half,
  y: FRAME.yTop + ((pooledMax - p.pooled) / (pooledMax - pooledMin)) * (FRAME.yBot - FRAME.yTop),
}));
const pole = {
  pledge: { x: FRAME.cx + FRAME.half + 40, y: (FRAME.yTop + FRAME.yBot) / 2 },
  noLink: { x: FRAME.cx - FRAME.half - 40, y: (FRAME.yTop + FRAME.yBot) / 2 },
};

const threads = nodes
  .map((n) => {
    const hot = n.slug === 'grant-cofunding';
    const stroke = hot ? COLORS.accent : COLORS.border;
    const opacity = hot ? 0.9 : 0.5;
    return `<line x1="${pole.pledge.x}" y1="${pole.pledge.y}" x2="${n.x}" y2="${n.y}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${n.p90 / 18}" />
<line x1="${pole.noLink.x}" y1="${pole.noLink.y}" x2="${n.x}" y2="${n.y}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${n.p55 / 18}" />`;
  })
  .join('\n');

const dots = nodes
  .map((n) => {
    const hot = n.slug === 'grant-cofunding';
    return `<circle cx="${n.x}" cy="${n.y}" r="${hot ? 7 : 4}" fill="${hot ? COLORS.accent : COLORS.muted}" />`;
  })
  .join('\n');

const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" />
  ${threads}
  ${dots}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" fill-opacity="0.42" />
  <text x="80" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="54" font-weight="700" fill="${COLORS.text}">We tried to buy the Bottom Pub.</text>
  <text x="80" y="298" font-family="system-ui, -apple-system, sans-serif" font-size="54" font-weight="700" fill="${COLORS.text}">We didn’t.</text>
  <text x="80" y="350" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="${COLORS.accent}">Cygnet, Tasmania · May–August 2026</text>
  <text x="80" y="560" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="18" fill="${COLORS.muted}">adrianwedd.com/case-studies/bottom-pub-project</text>
</svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log(`[bottom-pub-og] wrote ${path.relative(ROOT, OUT)}`);
