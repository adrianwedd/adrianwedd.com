#!/usr/bin/env node
/**
 * Build the hero for "The Compiler Said Yes. The Agent Said It Was Ugly."
 *
 * The hero is a specimen, not an illustration. The base layer is an unretouched
 * screenshot Fable banked itself in the final commit of the 12 August one-shot
 * (simviz@e4756bd0, docs/media/preset-failure-first.png): the WORLD_TRUTH Go2
 * collapsed on the floor while the PUBLISHED_STATE ghost walks on, with the
 * falsifier tripping in the corner. Nothing in the frame is generated art and
 * nothing has been repainted — the sidebar still lists the three presets that
 * were deleted thirty-six hours later, which is most of the point.
 *
 * Two things are added, both deliberately quiet:
 *
 *  1. A provenance stamp burned INSIDE the frame — not in the caption band.
 *     twitter:card=summary_large_image centre-crops to ~1.91:1, which eats the
 *     band; a provenance mark that a social scraper can crop off is not a
 *     provenance mark. The article is about presentation outrunning evidence,
 *     so its own hero has to survive the crop still declaring what it is.
 *  2. A caption band carrying one line of the actual agent trace, set in mono
 *     so it reads as a crop of the log rather than a pull quote.
 *
 * Deterministic: same inputs, same bytes. No model in the loop.
 *
 * Usage: node scripts/build-simviz-hero.mjs [--line aesthetic|falsification]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import satori from 'satori';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SRC = '/Users/adrian/repos/simviz/docs/media/preset-failure-first.png';
const SLUG = 'the-compiler-said-yes-the-agent-said-it-was-ugly';
const OUT_DIR = path.join(ROOT, 'public/notebook-assets', SLUG);

const W = 1600;
const FRAME_H = 900;
const BAND_H = 140;
const H = FRAME_H + BAND_H;

// global.css dark theme.
const C = {
  band: '#15131a',
  rule: '#3a3340',
  cream: '#e2ddd8',
  accent: '#c48b6e',
  muted: '#8b8289',
};

// Both verbatim from simvis-fable-oneshot.log. The falsification line is the
// default: the frame shows a world that fell and a telemetry track that says
// otherwise, and this is the moment in the run where the agent measured instead
// of patching its own hypothesis. The aesthetic line sells harder; it also has
// nothing to do with what is on screen.
const LINES = {
  falsification: 'Travel and facing both +X — consistent.',
  aesthetic: 'the horizon is pitch black and the stage floats in a void',
};

const lineArg = process.argv.includes('--line') ? process.argv[process.argv.indexOf('--line') + 1] : 'falsification';
const TRACE_LINE = LINES[lineArg];
if (!TRACE_LINE) {
  console.error(`Unknown --line ${lineArg}. Expected: ${Object.keys(LINES).join(' | ')}`);
  process.exit(1);
}

// Two lines, not one: a single-line stamp is wide enough to run through the
// transport bar, and a provenance mark you have to squint past a play button to
// read is decoration.
const STAMP = ['12 AUG 2026 · SYNTHETIC DEMO', 'DERIVED VISUALISATION'];

const fonts = [
  {
    name: 'Mono',
    data: fs.readFileSync('/System/Library/Fonts/Supplemental/Andale Mono.ttf'),
    weight: 400,
    style: 'normal',
  },
];

/* ------------------------------------------------------------------- svg -- */

// Stamp: bottom-right, in the gutter right of the transport bar (which ends
// x≈1180) and below the event-badge stack (which ends y≈780). Inside the 1.91:1
// centre-crop safe band (y 101–939), so it survives the social crop.
const stampNode = {
  type: 'div',
  props: {
    style: {
      display: 'flex',
      width: `${W}px`,
      height: `${FRAME_H}px`,
      padding: '0 48px 34px 0',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    },
    children: {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          fontFamily: 'Mono',
          fontSize: '15px',
          letterSpacing: '2.2px',
          color: C.accent,
          borderRight: `2px solid ${C.accent}`,
          paddingRight: '14px',
        },
        children: STAMP.map((t) => ({
          type: 'div',
          props: { style: { display: 'flex', marginTop: '6px' }, children: t },
        })),
      },
    },
  },
};

const bandNode = {
  type: 'div',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      width: `${W}px`,
      height: `${BAND_H}px`,
      backgroundColor: C.band,
      borderTop: `1px solid ${C.rule}`,
      padding: '0 48px',
      fontFamily: 'Mono',
    },
    children: [
      {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', fontSize: '27px', color: C.cream },
          children: [
            // The trace marks agent turns with U+23FA. Andale Mono has no glyph
            // for it, and a tofu box in the hero of an article about provenance
            // would be its own small joke — so it is drawn, not typeset.
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  width: '13px',
                  height: '13px',
                  borderRadius: '7px',
                  backgroundColor: C.accent,
                  marginRight: '16px',
                },
                children: '',
              },
            },
            { type: 'div', props: { style: { display: 'flex' }, children: TRACE_LINE } },
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: { display: 'flex', fontSize: '16px', color: C.muted, marginTop: '14px' },
          children: 'Fable · SimViz one-shot trace · 37m 42s · 104.4k tokens · one turn',
        },
      },
    ],
  },
};

async function render(node, width, height) {
  const svg = await satori(node, { width, height, fonts });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/* ------------------------------------------------------------------ main -- */

if (!fs.existsSync(SRC)) {
  console.error(`Source frame not found: ${SRC}`);
  console.error('Expected simviz@e4756bd0 checked out at ~/repos/simviz.');
  process.exit(1);
}

const meta = await sharp(SRC).metadata();
if (meta.width !== W || meta.height !== FRAME_H) {
  console.error(`Source frame is ${meta.width}x${meta.height}, expected ${W}x${FRAME_H}.`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const [stamp, band] = await Promise.all([render(stampNode, W, FRAME_H), render(bandNode, W, BAND_H)]);

const composed = await sharp({
  create: { width: W, height: H, channels: 4, background: C.band },
})
  .composite([
    { input: await sharp(SRC).toBuffer(), top: 0, left: 0 },
    { input: stamp, top: 0, left: 0 },
    { input: band, top: FRAME_H, left: 0 },
  ])
  .png()
  .toBuffer();

const webp = path.join(OUT_DIR, 'hero.webp');
const jpg = path.join(OUT_DIR, 'hero.jpg');

await sharp(composed).webp({ quality: 88 }).toFile(webp);
// The deploy gate swaps heroImage.webp -> .jpg for og:image, so the twin is
// mandatory, not a nicety.
await sharp(composed).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(jpg);

for (const f of [webp, jpg]) {
  const { width, height } = await sharp(f).metadata();
  console.log(`${path.relative(ROOT, f)} — ${width}x${height}, ${(fs.statSync(f).size / 1024).toFixed(0)} KB`);
}
console.log(`trace line: ${lineArg} — "${TRACE_LINE}"`);
