#!/usr/bin/env node
// Uses the site's established Sharp/SVG card workflow; no downloaded artwork.
import sharp from 'sharp';
for (const closed of [false, true]) {
  const subtitle = closed
    ? 'Practical questions for your website provider.'
    : '10 free local website exposure reviews.';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#1a181c"/>
    <path d="M80 80H1120" stroke="#3d3844" stroke-width="2"/>
    <text x="80" y="128" fill="#c48b6e" font-family="sans-serif" font-size="20" letter-spacing="3">A NOTE TO OUR NEIGHBOURS</text>
    <g font-family="sans-serif" font-size="88" font-weight="700"><text x="74" y="260" fill="#e2ddd8">THE INTERNET</text><text x="74" y="360" fill="#c48b6e">IS ON FIRE.</text></g>
    <text x="80" y="425" fill="#e2ddd8" font-family="sans-serif" font-size="32">Your business doesn't have to be.</text>
    <text x="80" y="500" fill="#e2ddd8" font-family="sans-serif" font-size="25">${subtitle}</text>
    <path d="M80 536H1120" stroke="#3d3844" stroke-width="2"/>
    <text x="80" y="580" fill="#c48b6e" font-family="sans-serif" font-size="20">Adrian Wedd · Huon Valley &amp; southern Tasmania</text>
    <text x="925" y="580" fill="#e2ddd8" font-family="sans-serif" font-size="20">/on-fire/</text>
  </svg>`;
  const target = `public/og/on-fire${closed ? '-closed' : ''}.png`;
  await sharp(Buffer.from(svg)).png().toFile(target);
  console.log(target);
}
