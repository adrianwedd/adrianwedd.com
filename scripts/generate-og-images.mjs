#!/usr/bin/env node

/**
 * Generate OG images for blog posts at build time.
 * Uses satori (SVG from markup) + sharp (SVG → PNG).
 * Run before `astro build` or as part of the build pipeline.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

// Load system font for text rendering
const FONT_PATHS = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',           // macOS
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',        // Linux
  'C:\\Windows\\Fonts\\arial.ttf',                           // Windows
];

let fontData;
for (const fp of FONT_PATHS) {
  try {
    fontData = fs.readFileSync(fp);
    break;
  } catch { /* try next */ }
}

let boldFontData;
const BOLD_PATHS = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  'C:\\Windows\\Fonts\\arialbd.ttf',
];
for (const fp of BOLD_PATHS) {
  try {
    boldFontData = fs.readFileSync(fp);
    break;
  } catch { /* try next */ }
}

if (!fontData) {
  console.error('No system font found. Install Arial or DejaVu Sans.');
  process.exit(1);
}

const CONTENT_DIR = 'src/content/blog';
const OUTPUT_DIR = 'public/og';
const WIDTH = 1200;
const HEIGHT = 630;

// Parse frontmatter from markdown files
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let val = rest.join(':').trim();
      // Strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Parse arrays
      if (val.startsWith('[')) {
        try {
          val = JSON.parse(val.replace(/'/g, '"'));
        } catch {
          val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/"/g, ''));
        }
      }
      fm[key.trim()] = val;
    }
  }
  return fm;
}

async function generateOGImage(title, description, tags, date, outputPath) {
  const tagList = Array.isArray(tags) ? tags.slice(0, 3) : [];
  const dateStr = date || '';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: '#1a181c',
          padding: '60px',
          fontFamily: 'sans-serif',
        },
        children: [
          // Top: site name
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: '12px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#c48b6e',
                    },
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: { color: '#968e96', fontSize: '20px' },
                    children: 'adrianwedd.com',
                  },
                },
              ],
            },
          },
          // Middle: title + description
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '16px' },
              children: [
                {
                  type: 'h1',
                  props: {
                    style: {
                      color: '#e2ddd8',
                      fontSize: title.length > 60 ? '36px' : '48px',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      margin: 0,
                    },
                    children: title,
                  },
                },
                description
                  ? {
                      type: 'p',
                      props: {
                        style: {
                          color: '#968e96',
                          fontSize: '22px',
                          lineHeight: 1.4,
                          margin: 0,
                        },
                        children: description.length > 120 ? description.slice(0, 117) + '...' : description,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // Bottom: tags + date
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', gap: '8px' },
                    children: tagList.map((tag) => ({
                      type: 'span',
                      props: {
                        style: {
                          color: '#c48b6e',
                          fontSize: '16px',
                          border: '1px solid #3a3540',
                          borderRadius: '999px',
                          padding: '4px 12px',
                        },
                        children: tag,
                      },
                    })),
                  },
                },
                dateStr
                  ? {
                      type: 'span',
                      props: {
                        style: { color: '#968e96', fontSize: '16px' },
                        children: dateStr,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'sans-serif', data: fontData, weight: 400, style: 'normal' },
        ...(boldFontData ? [{ name: 'sans-serif', data: boldFontData, weight: 700, style: 'normal' }] : []),
      ],
    },
  );

  const png = await sharp(Buffer.from(svg)).png({ quality: 85 }).toBuffer();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
}

async function main() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));

  let generated = 0;
  let skipped = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm || fm.draft === 'true') {
      skipped++;
      continue;
    }

    const slug = file.replace(/\.mdx?$/, '');
    const outputPath = path.join(OUTPUT_DIR, `${slug}.png`);

    // Skip if already generated
    if (fs.existsSync(outputPath)) {
      skipped++;
      continue;
    }

    const dateStr = fm.date
      ? new Date(fm.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    try {
      await generateOGImage(fm.title || slug, fm.description || '', fm.tags || [], dateStr, outputPath);
      generated++;
      console.log(`  ✓ ${slug}`);
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }

  console.log(`\nGenerated ${generated} OG images, skipped ${skipped}`);
}

main();
