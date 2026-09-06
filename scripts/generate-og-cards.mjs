#!/usr/bin/env node
/**
 * Generate branded OG share cards for static/index pages — deterministic rebuild.
 *
 * Two layers, composited with sharp:
 *
 *  1. Botanical plate (procedural SVG) — a dense engraved-style arrangement of
 *     Tasmanian flora motifs (eucalyptus branches, gum blossoms, gumnuts, fern
 *     fronds, wattle sprays, reeds, berry sprigs) drawn at three depth layers,
 *     seeded by the page slug so every card differs but the set reads as one
 *     folio: same palette, same stroke language, same double hairline border.
 *  2. Type (satori + vendored Fraunces) — real glyph outlines with shaping, so
 *     typography doesn't depend on librsvg font matching. Minimal text: the
 *     page title and the full URL, nothing else.
 *
 * No model in the loop: no quota, instant re-runs, pixel-identical output every
 * time, and by construction the card cannot say anything the page doesn't.
 *
 * Usage:
 *   node scripts/build-page-og-sources.mjs            # writes .og-sources/
 *   node scripts/generate-og-cards.mjs [outDir]       # default public/og/pages
 *   node scripts/generate-og-cards.mjs --only home
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import satori from 'satori';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200;
const H = 630;

// Brand palette — CLAUDE.md / global.css dark theme, plus two muted botanical
// tones that stay inside the "moody earth, nothing neon" brief.
const C = {
  bgTop: '#201d24',
  bgBottom: '#161419',
  text: '#e2ddd8',
  accent: '#c48b6e', // dusty copper
  umber: '#8a5e42',
  sage: '#8d9a84', // muted eucalypt green
  cream: '#e2ddd8',
};

const FONT_DIR = path.join(ROOT, 'scripts/og-fonts');
const fonts = [
  { name: 'Fraunces', data: fs.readFileSync(path.join(FONT_DIR, 'Fraunces72ptSoft-SemiBold.ttf')), weight: 600, style: 'normal' },
  { name: 'Fraunces', data: fs.readFileSync(path.join(FONT_DIR, 'Fraunces72ptSoft-Light.ttf')), weight: 300, style: 'normal' },
  { name: 'FrauncesText', data: fs.readFileSync(path.join(FONT_DIR, 'Fraunces9ptSoft-SemiBold.ttf')), weight: 600, style: 'normal' },
];

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : '';
const positional = args.filter((a, i) => onlyIdx === -1 || (i !== onlyIdx && i !== onlyIdx + 1));
const outDir = positional[0] || path.join(ROOT, 'public/og/pages');

const manifestPath = path.join(ROOT, '.og-sources/manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('No manifest at .og-sources/manifest.json — run: node scripts/build-page-og-sources.mjs');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

/* ------------------------------------------------------------------ RNG -- */

function seedFrom(str) {
  let h = 2166136261 >>> 0;
  for (const ch of str) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const makeRng = (seed) => {
  const r = mulberry32(seed);
  return {
    f: (min, max) => min + r() * (max - min),
    i: (min, max) => Math.floor(min + r() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
  };
};

/* --------------------------------------------------------------- geometry -- */

const n1 = (x) => Number(x.toFixed(1));

/** Point + tangent angle along a cubic bezier. */
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const bezPath = (p0, p1, p2, p3) =>
  `M ${n1(p0[0])} ${n1(p0[1])} C ${n1(p1[0])} ${n1(p1[1])}, ${n1(p2[0])} ${n1(p2[1])}, ${n1(p3[0])} ${n1(p3[1])}`;

/* ----------------------------------------------------------------- motifs -- */
/* Every motif is drawn in a local frame growing from the origin along +x,
 * returns { svg, length } and inherits stroke colour from its parent group. */

function leaf(x, y, angle, len, rng) {
  const w = len * rng.f(0.22, 0.3);
  const veins = [];
  const nv = len > 34 ? 3 : 2;
  for (let v = 1; v <= nv; v++) {
    const vx = (len * v) / (nv + 1);
    const vw = w * (1 - v / (nv + 1.4));
    veins.push(`M ${n1(vx)} 0 L ${n1(vx + len * 0.12)} ${n1(-vw)} M ${n1(vx)} 0 L ${n1(vx + len * 0.12)} ${n1(vw)}`);
  }
  return `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(angle)})">
    <path d="M 0 0 Q ${n1(len * 0.38)} ${n1(-w)} ${n1(len)} 0 Q ${n1(len * 0.38)} ${n1(w)} 0 0 Z" fill="currentColor" fill-opacity="0.2"/>
    <path d="M 0 0 Q ${n1(len * 0.38)} ${n1(-w)} ${n1(len)} 0 Q ${n1(len * 0.38)} ${n1(w)} 0 0 Z M 0 0 L ${n1(len)} 0"/>
    <path d="${veins.join(' ')}" stroke-width="0.9" opacity="0.75"/>
  </g>`;
}

/** Eucalyptus branch — tapering curved stem, alternating veined leaves,
 * optional gumnut cluster near the tip. */
function eucalyptus(rng) {
  const L = rng.f(240, 380);
  const c = rng.f(0.5, 1.1) * (rng.chance(0.5) ? 1 : -1);
  const p0 = [0, 0];
  const p1 = [L * 0.33, -L * 0.05 * c];
  const p2 = [L * 0.66, -L * 0.16 * c];
  const p3 = [L, -L * 0.3 * c];
  const parts = [`<path d="${bezPath(p0, p1, p2, p3)}" stroke-width="2.6"/>`];
  const nLeaves = Math.round(L / 22);
  for (let i = 1; i <= nLeaves; i++) {
    const t = i / (nLeaves + 0.5);
    const pt = cubic(p0, p1, p2, p3, t);
    const side = i % 2 ? 1 : -1;
    const len = (1 - t * 0.45) * rng.f(46, 66);
    const a = pt.angle + side * rng.f(30, 55) + rng.f(-6, 6);
    parts.push(leaf(pt.x, pt.y, a, len, rng));
    if (rng.chance(0.6)) {
      // second, shorter leaf on the same node, other side
      parts.push(leaf(pt.x, pt.y, pt.angle - side * rng.f(28, 50), len * 0.75, rng));
    }
  }
  if (rng.chance(0.65)) {
    const pt = cubic(p0, p1, p2, p3, rng.f(0.78, 0.95));
    parts.push(gumnuts(pt.x, pt.y, pt.angle + rng.f(60, 120), rng));
  }
  return { svg: parts.join('\n'), length: L };
}

/** Cluster of 2-3 gumnut cups on short stalks. */
function gumnuts(x, y, angle, rng) {
  const nuts = [];
  const n = rng.i(2, 3);
  for (let i = 0; i < n; i++) {
    const a = ((i - (n - 1) / 2) * 34 * Math.PI) / 180;
    const d = 16;
    const nx = n1(Math.sin(a) * d);
    const ny = n1(Math.cos(a) * d);
    nuts.push(`<line x1="0" y1="0" x2="${nx}" y2="${ny}" stroke-width="1.4"/>
      <circle cx="${nx}" cy="${ny}" r="5.6" fill="currentColor" fill-opacity="0.14"/>
      <circle cx="${nx}" cy="${ny}" r="5.6"/>
      <circle cx="${nx}" cy="${ny}" r="2.2" fill="currentColor" fill-opacity="0.5" stroke="none"/>`);
  }
  return `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(angle)})">${nuts.join('\n')}</g>`;
}

/** Flowering gum blossom — cup with a radial fan of stamens, dot-tipped. */
function gumBlossom(rng) {
  const parts = [
    `<path d="M 0 0 L 26 0" stroke-width="2.2"/>`,
    `<path d="M 26 -7 L 26 7 L 40 10 L 40 -10 Z" fill="currentColor" fill-opacity="0.15"/>`,
    `<path d="M 26 -7 L 26 7 L 40 10 L 40 -10 Z"/>`,
  ];
  const nS = rng.i(34, 44);
  const spread = rng.f(70, 84);
  for (let i = 0; i < nS; i++) {
    const a = ((i / (nS - 1)) * 2 - 1) * spread;
    const r = rng.f(24, 36);
    const rad = (a * Math.PI) / 180;
    const sx = 40 + Math.cos(rad) * r;
    const sy = Math.sin(rad) * r;
    parts.push(
      `<line x1="40" y1="0" x2="${n1(sx)}" y2="${n1(sy)}" stroke-width="1.1"/>
       <circle cx="${n1(sx)}" cy="${n1(sy)}" r="2.3" fill="currentColor" stroke="none"/>`
    );
  }
  return { svg: parts.join('\n'), length: 80 };
}

/** Fern frond — curved rachis, shrinking pinnae, spiral fiddlehead tip. */
function fern(rng) {
  const L = rng.f(200, 300);
  const c = rng.f(0.7, 1.2) * (rng.chance(0.5) ? 1 : -1);
  const p0 = [0, 0];
  const p1 = [L * 0.4, -L * 0.06 * c];
  const p2 = [L * 0.75, -L * 0.22 * c];
  const p3 = [L, -L * 0.46 * c];
  const parts = [`<path d="${bezPath(p0, p1, p2, p3)}" stroke-width="2"/>`];
  const nP = Math.round(L / 9);
  for (let i = 1; i <= nP; i++) {
    const t = i / (nP + 2);
    const pt = cubic(p0, p1, p2, p3, t);
    const len = (1 - t * 0.85) * rng.f(26, 36) + 6;
    for (const side of [1, -1]) {
      const aDeg = pt.angle + side * rng.f(55, 70);
      const a = (aDeg * Math.PI) / 180;
      const ex = pt.x + Math.cos(a) * len;
      const ey = pt.y + Math.sin(a) * len;
      const w = len * 0.16;
      const px = -Math.sin(a) * w;
      const py = Math.cos(a) * w;
      // filled tapering pinna — a thin leaflet, not a wire
      parts.push(
        `<path d="M ${n1(pt.x)} ${n1(pt.y)} Q ${n1(pt.x + Math.cos(a) * len * 0.45 + px)} ${n1(pt.y + Math.sin(a) * len * 0.45 + py)} ${n1(ex)} ${n1(ey)} Q ${n1(pt.x + Math.cos(a) * len * 0.45 - px)} ${n1(pt.y + Math.sin(a) * len * 0.45 - py)} ${n1(pt.x)} ${n1(pt.y)} Z" fill="currentColor" fill-opacity="0.28" stroke-width="0.8"/>`
      );
    }
  }
  // fiddlehead spiral at the tip
  const tip = cubic(p0, p1, p2, p3, 1);
  const turns = 2.2;
  const maxR = rng.f(9, 13);
  const pts = [];
  for (let s = 0; s <= 26; s++) {
    const th = (s / 26) * turns * 2 * Math.PI;
    const r = maxR * (1 - s / 30);
    pts.push(`${n1(tip.x + Math.cos(th + ((tip.angle - 90) * Math.PI) / 180) * r)} ${n1(tip.y + Math.sin(th + ((tip.angle - 90) * Math.PI) / 180) * r)}`);
  }
  parts.push(`<polyline points="${pts.join(' ')}" stroke-width="1.6"/>`);
  return { svg: parts.join('\n'), length: L };
}

/** Wattle spray — fine branching stems ending in fluffy ball clusters. */
function wattle(rng) {
  const L = rng.f(180, 260);
  const parts = [`<path d="M 0 0 Q ${n1(L * 0.5)} ${n1(-L * 0.08)} ${n1(L)} ${n1(-L * 0.22)}" stroke-width="2"/>`];
  const nB = rng.i(4, 6);
  for (let i = 0; i < nB; i++) {
    const t = 0.3 + (i / nB) * 0.75;
    const bx = L * t;
    const by = -L * 0.22 * t * t;
    const a = (rng.f(-80, -20) * Math.PI) / 180;
    const bl = rng.f(24, 48);
    const ex = bx + Math.cos(a) * bl;
    const ey = by + Math.sin(a) * bl;
    parts.push(`<path d="M ${n1(bx)} ${n1(by)} Q ${n1(bx + Math.cos(a) * bl * 0.5)} ${n1(by + Math.sin(a) * bl * 0.5 - 4)} ${n1(ex)} ${n1(ey)}" stroke-width="1.2"/>`);
    // fluffy ball: ring of small circles + centre dots
    const nDots = rng.i(7, 9);
    const ballR = rng.f(6, 9);
    for (let d = 0; d < nDots; d++) {
      const da = (d / nDots) * 2 * Math.PI;
      const dr = ballR * rng.f(0.55, 1);
      parts.push(`<circle cx="${n1(ex + Math.cos(da) * dr)}" cy="${n1(ey + Math.sin(da) * dr)}" r="${n1(rng.f(1.6, 2.6))}" fill="currentColor" fill-opacity="0.7" stroke="none"/>`);
    }
    parts.push(`<circle cx="${n1(ex)}" cy="${n1(ey)}" r="${n1(ballR * 0.5)}" fill="currentColor" fill-opacity="0.35" stroke="none"/>`);
  }
  return { svg: parts.join('\n'), length: L };
}

/** Reed / grass tuft — long S-curved blades with seed-head ticks. */
function reeds(rng) {
  const parts = [];
  const nBlades = rng.i(4, 6);
  const L = rng.f(180, 280);
  for (let i = 0; i < nBlades; i++) {
    const bl = L * rng.f(0.6, 1);
    const sweep = rng.f(-70, 70);
    const p0 = [0, 0];
    const p1 = [bl * 0.4, -bl * 0.02];
    const p2 = [bl * 0.7, sweep * 0.5];
    const p3 = [bl, sweep];
    parts.push(`<path d="${bezPath(p0, p1, p2, p3)}" stroke-width="${n1(rng.f(1.2, 2))}"/>`);
    if (rng.chance(0.6)) {
      // seed head: short ticks along the last quarter
      for (let s = 0; s < 5; s++) {
        const t = 0.78 + s * 0.05;
        const pt = cubic(p0, p1, p2, p3, t);
        const a = ((pt.angle - 40) * Math.PI) / 180;
        parts.push(`<line x1="${n1(pt.x)}" y1="${n1(pt.y)}" x2="${n1(pt.x + Math.cos(a) * 9)}" y2="${n1(pt.y + Math.sin(a) * 9)}" stroke-width="1.1"/>`);
      }
    }
  }
  return { svg: parts.join('\n'), length: L };
}

/** Berry sprig — forking stems tipped with filled berries. */
function berries(rng) {
  const parts = [];
  const nStems = rng.i(3, 5);
  const L = rng.f(90, 150);
  for (let i = 0; i < nStems; i++) {
    const a = ((i - (nStems - 1) / 2) * rng.f(16, 24) * Math.PI) / 180;
    const sl = L * rng.f(0.65, 1);
    const ex = Math.cos(a) * sl;
    const ey = Math.sin(a) * sl;
    parts.push(`<path d="M 0 0 Q ${n1(ex * 0.5)} ${n1(ey * 0.5 - 8)} ${n1(ex)} ${n1(ey)}" stroke-width="1.4"/>
      <circle cx="${n1(ex)}" cy="${n1(ey)}" r="${n1(rng.f(3.4, 5.2))}" fill="currentColor" fill-opacity="0.55"/>`);
  }
  return { svg: parts.join('\n'), length: L };
}

// Pools per placement zone: gum blossoms only work at larger scales, reeds
// only as soft background bleed — both read as clutter when small and sharp.
const CORNER_POOL = [eucalyptus, fern, wattle, berries, gumBlossom];
const EDGE_POOL = [eucalyptus, fern, wattle, berries];
const ACCENT_POOL = [berries, wattle];

/* ------------------------------------------------------------ composition -- */

/** Weighted palette pick — copper leads, sage seconds, cream is rare. */
function pickColor(rng) {
  const x = rng.f(0, 1);
  if (x < 0.42) return C.accent;
  if (x < 0.78) return C.sage;
  if (x < 0.9) return C.umber;
  return C.cream;
}

/** Place one motif at an anchor, growing toward `towardDeg`. */
function place(motifFn, rng, x, y, towardDeg, scale, opacity) {
  const { svg } = motifFn(rng);
  const rot = towardDeg + rng.f(-16, 16);
  const color = pickColor(rng);
  return `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(rot)}) scale(${n1(scale)})"
    color="${color}" stroke="${color}" fill="none" stroke-linecap="round" stroke-linejoin="round"
    stroke-width="1.8" opacity="${opacity}">${svg}</g>`;
}

function botanicalLayer(slug) {
  const rng = makeRng(seedFrom(slug));
  const els = [];

  // Background layer — two oversized motifs bleeding in from the sides.
  for (const side of [0, 1]) {
    const fn = rng.pick([eucalyptus, fern, reeds]);
    const x = side ? W + 30 : -30;
    const toward = side ? rng.f(150, 210) : rng.f(-30, 30);
    els.push(place(fn, rng, x, rng.f(120, H - 120), toward, rng.f(1.7, 2.1), 0.13));
  }

  // Corner clusters — 3 motifs each, growing inward. This is the dense frame.
  const corners = [
    { x: 60, y: 70, toward: 38 },
    { x: W - 60, y: 70, toward: 142 },
    { x: 60, y: H - 70, toward: -38 },
    { x: W - 60, y: H - 70, toward: -142 },
  ];
  for (const corner of corners) {
    // one anchoring eucalyptus or fern, always, then supporting motifs
    els.push(
      place(rng.pick([eucalyptus, fern]), rng, corner.x, corner.y, corner.toward + rng.f(-14, 14), rng.f(0.85, 1.1), rng.f(0.45, 0.6))
    );
    const n = rng.i(3, 4);
    for (let i = 0; i < n; i++) {
      const fn = rng.pick(CORNER_POOL);
      const jx = corner.x + rng.f(-45, 100) * (corner.x < W / 2 ? 1 : -1);
      const jy = corner.y + rng.f(-30, 80) * (corner.y < H / 2 ? 1 : -1);
      const toward = corner.toward + rng.f(-35, 35);
      const scale = fn === gumBlossom ? rng.f(0.8, 1.05) : rng.f(0.6, 0.9);
      els.push(place(fn, rng, jx, jy, toward, scale, rng.f(0.4, 0.55)));
    }
  }

  // Edge accents — mid-left and mid-right, smaller.
  for (const side of [0, 1]) {
    const n = rng.i(1, 2);
    for (let i = 0; i < n; i++) {
      const fn = rng.pick(EDGE_POOL);
      const x = side ? W - rng.f(30, 60) : rng.f(30, 60);
      const toward = side ? rng.f(160, 200) : rng.f(-20, 20);
      els.push(place(fn, rng, x, H / 2 + rng.f(-70, 70), toward, rng.f(0.55, 0.8), rng.f(0.38, 0.5)));
    }
  }

  // Top/bottom centre accents — small sprigs pointing along the edge.
  for (const [x, y, toward] of [
    [W / 2 + rng.f(-180, 180), 34, rng.f(0, 180)],
    [W / 2 + rng.f(-220, 220), H - 30, rng.f(-180, 0)],
  ]) {
    const fn = rng.pick(ACCENT_POOL);
    els.push(place(fn, rng, x, y, toward, rng.f(0.45, 0.6), rng.f(0.25, 0.36)));
  }

  // Scattered specks for engraved texture.
  const specks = [];
  for (let i = 0; i < 40; i++) {
    const x = rng.f(30, W - 30);
    const y = rng.f(30, H - 30);
    const inCore = x > 220 && x < W - 220 && y > 180 && y < H - 150;
    if (inCore && rng.chance(0.7)) continue;
    specks.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rng.f(0.8, 1.8))}" fill="${pickColor(rng)}" opacity="${n1(rng.f(0.12, 0.3))}"/>`);
  }
  els.push(specks.join('\n'));

  return els.join('\n');
}

function buildPlateSvg(slug) {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${C.bgTop}"/>
      <stop offset="1" stop-color="${C.bgBottom}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.44" r="0.65">
      <stop offset="0" stop-color="${C.accent}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${C.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="backing" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.bgTop}" stop-opacity="0.88"/>
      <stop offset="0.72" stop-color="${C.bgTop}" stop-opacity="0.62"/>
      <stop offset="1" stop-color="${C.bgTop}" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.88  0 0 0 0 0.85  0 0 0 0 0.82  0 0 0 0.6 0"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${botanicalLayer(slug)}
  <ellipse cx="${W / 2}" cy="${H * 0.46}" rx="450" ry="185" fill="url(#backing)"/>
  <ellipse cx="${W / 2}" cy="${H - 58}" rx="290" ry="52" fill="url(#backing)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${C.accent}" stroke-opacity="0.5" stroke-width="1.6"/>
  <rect x="33" y="33" width="${W - 66}" height="${H - 66}" fill="none" stroke="${C.accent}" stroke-opacity="0.22" stroke-width="1"/>
</svg>`;
}

/* ------------------------------------------------------------------ type -- */

async function typeLayer({ title, route }) {
  const url = route ? `adrianwedd.com/${route}` : 'adrianwedd.com';
  let size = 96;
  if (title.length > 12) size = 84;
  if (title.length > 22) size = 70;
  if (title.length > 34) size = 58;
  if (title.length > 48) size = 48;

  return satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontFamily: 'Fraunces',
                fontWeight: 600,
                fontSize: size,
                lineHeight: 1.1,
                color: C.text,
                textAlign: 'center',
                maxWidth: 880,
                marginTop: -36,
                textWrap: 'balance',
                letterSpacing: -0.5,
              },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: 52,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                fontFamily: 'FrauncesText',
                fontWeight: 600,
                fontSize: 30,
                letterSpacing: 3,
                color: C.accent,
              },
              children: url,
            },
          },
        ],
      },
    },
    { width: W, height: H, fonts }
  );
}

/* ------------------------------------------------------------------ main -- */

fs.mkdirSync(outDir, { recursive: true });
let generated = 0;
for (const entry of manifest) {
  if (only && entry.slug !== only) continue;
  const plate = sharp(Buffer.from(buildPlateSvg(entry.slug))).png();
  const text = await sharp(Buffer.from(await typeLayer(entry))).png().toBuffer();
  const dest = path.join(outDir, `${entry.slug}.png`);
  const info = await sharp(await plate.toBuffer())
    .composite([{ input: text }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(dest);
  console.log(`${entry.slug.padEnd(14)} ${info.width}x${info.height}  ${String(Math.round(info.size / 1024)).padStart(4)}KB`);
  generated++;
}
console.log(`\n${generated} cards -> ${path.relative(ROOT, outDir)}`);
