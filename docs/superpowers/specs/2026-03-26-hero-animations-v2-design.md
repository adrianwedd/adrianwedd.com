# Hero Animations v2 — Design Spec

**Date:** 2026-03-26
**Status:** Approved (revised after Codex + Gemini QA)
**Goal:** Redesign all 16 hero canvas animations to be visually stunning, thematically perfect per page, and technically superior to the failure-first reference animations.

## Design Decisions

- **Rendering:** Hybrid — trail persistence for organic animations (7), clearRect for geometric (9)
- **Palette:** Copper primary `#c48b6e`, slate blue secondary `#6e8ec4` (fixed constants), sage green tertiary `#8eaa7e` (crystallise + terrain only)
- **Overlay:** Lightened gradient — 25%@40%, 55%@65%, solid@100% (from 40%@30%, 70%@60%)
- **Interactivity:** Mouse influence where it materially improves the animation (not mandatory on every animation). Mobile: touch position tracking. No gyroscope.
- **Emergent moments:** Every 15-30s, each animation has a surprising event. All events must be seizure-safe (see Accessibility).
- **Compositing:** 'lighter' blending for glow on select animations. No offscreen canvas or multi-pass blur (too expensive for Canvas 2D).

## Phased Delivery

### Phase 1: Infrastructure + 4 Flagship Animations
- Shared infrastructure: trail persistence system, mouse tracking, color constants, pointer smoothing, adaptive quality
- Overlay gradient change
- 4 flagship animations: **terrain** (homepage), **flow** (gallery), **forge** (services), **pulse** (activity)
- QA pass after phase 1

### Phase 2: Remaining Clear-Frame Animations (6)
- **strata**, **blueprint**, **radar**, **entropy**, **cipher**, **orbit**
- QA pass after phase 2

### Phase 3: Trail-Persistence Animations + Polish (5)
- **ink**, **signal**, **loom**, **crystallise**, **stream**
- **soundwave** harmonic upgrade
- Emergent event tuning, pointer smoothing polish
- Final QA pass

## Accessibility

### Reduced Motion
When `prefers-reduced-motion: reduce` is active:
- Canvas does NOT initialize. No animation runs.
- The `hero-glow` CSS class remains as a static decorative fallback.
- Dynamic `matchMedia('prefers-reduced-motion')` change listener stops/starts animations live.

### Seizure Safety (WCAG 2.3.1)
All emergent events must comply:
- **No full-canvas flash.** Events affect at most 25% of the canvas area at peak brightness.
- **Max event frequency:** No more than 3 brightness changes per second in any region.
- **Flash intensity cap:** Emergent events must not exceed `globalAlpha = 0.6` at peak. No white/full-brightness flashes.
- **Minimum event interval:** 10 seconds between emergent events on any single animation.
- Specific caps:
  - Seismic flash (strata): limited to fault line area, alpha 0.4, 500ms duration
  - Resonance cascade (signal): gradual swell over 1s, not instant
  - Decryption sweep (cipher): scanline is narrow (2px glow), not full-screen
  - Glitch teleport (entropy): max 3 tiles per frame, no full-grid glitch
  - Thread snap (loom): single point flash at alpha 0.5, 200ms
  - Collision flash (crystallise): localized to intersection point, alpha 0.4
  - Radar bloom: gradual radial expansion, not instant

### Screen Readers
- Canvas remains `aria-hidden="true"` — purely decorative
- All text rendered on canvas (blueprint annotations, cipher characters, radar readouts) is ornamental, not content
- No `role="img"` needed since canvas is explicitly hidden from AT

## Shared Techniques

### Trail Persistence (organic animations: flow, ink, signal, forge, loom, crystallise, stream)
Replace `ctx.clearRect(0,0,w,h)` with semi-transparent surface fill:
```js
ctx.fillStyle = 'rgba(surface_r, surface_g, surface_b, fadeRate)';
ctx.fillRect(0, 0, w, h);
```
Fade rates per animation: 0.01 (slow/crystallise) to 0.025 (fast/loom). Surface RGB parsed from `--color-surface` at init.

### Mouse Influence
Sentinel-guarded `mousemove` listener on `document` (event delegation). Store normalized position (0-1). Pointer smoothing via lerp: `mouseSmooth += (mouseRaw - mouseSmooth) * 0.08` per frame. Dead zone: no effect when cursor is outside the hero section. Exit behavior: smoothly lerp back to center (0.5, 0.5) over 30 frames.

Animations with mouse interaction:
- **terrain:** gravity well warps noise field origin
- **flow:** vortex — particles swirl around cursor
- **ink:** proximity accelerates bleed speed
- **signal:** shifts one emitter's position
- **entropy:** creates dissolution seed near cursor
- **cipher:** proximity decrypts nearby characters
- **pulse:** temporary attractor node
- **stream:** rock/obstacle — streams split around cursor
- **soundwave:** Y position modulates fundamental frequency

Animations WITHOUT mouse interaction (passive is better):
- **strata** (geological patience)
- **blueprint** (the invisible draughtsman draws autonomously)
- **radar** (autonomous sweep)
- **orbit** (celestial mechanics don't respond to mortals)
- **loom** (the loom weaves on its own)
- **crystallise** (crystal growth is physics, not input)
- **forge** (the metal cools regardless)

Mobile: `touchmove` on the section provides the same normalized position. No gyroscope (too much UX friction for too little value). If no touch/mouse, animations run without interactivity — they're designed to look great either way.

### Color System
Primary color read from CSS custom property `--color-accent` at init via `getComputedStyle`. Re-read on theme toggle via existing MutationObserver.

Secondary and tertiary are **fixed constants** (not CSS vars):
```js
var SECONDARY_RGB = [110, 142, 196];  // #6e8ec4 slate blue
var TERTIARY_RGB = [142, 170, 126];   // #8eaa7e sage green
```
These are intentionally fixed because they serve as contrast colors that must work with both dark and light theme accent colors. Parsed to RGB arrays for `rgba()` string construction.

### Shared Helper Contracts
Each animation IIFE must export: `{ init, frame, cleanup, fadeRate? }`
- `init(w, h, colors)` — set up state for given canvas dimensions
- `frame(ctx, w, h, t, colors, quality, mouse)` — draw one frame. `mouse` is `{x, y, active}` (normalized 0-1, active = cursor in section)
- `cleanup()` — release all state (arrays, cached buffers). Called on animation switch and destroyCanvas.
- `fadeRate` (optional) — if present, the render loop applies trail persistence instead of clearRect before calling `frame()`

Quality adapter contract: `quality` is 0.25-1.0 (existing adaptive system). Each animation must define its own degradation:
- At quality < 0.5: reduce particle counts by 50%, skip secondary color elements, skip glow passes
- At quality < 0.3: minimal rendering — essential shapes only, no mouse interaction

## Per-Animation Performance Budgets

| Animation | Max Particles | Max Draw Calls/Frame | Max Path Vertices | Mobile Cap | Compositing |
|---|---|---|---|---|---|
| terrain | 40 | 300 | 10,000 | 20 particles, 2x grid | none |
| strata | 20 sparkle | 150 | 5,000 | skip textures | none |
| ink | 5 drops | 200 | 2,000 | 3 drops, no mirror | lighter (bleed) |
| blueprint | 0 | 100 | 3,000 | 1 drawing | none |
| forge | 200 branches | 400 | 8,000 | 100 branches | none |
| signal | 30 wavefronts | 250 | 4,000 | 15 wavefronts | none |
| cipher | 0 | colCount × rows | 0 | 60% columns | none |
| radar | 30 targets | 150 | 2,000 | 15 targets | none |
| entropy | 500 fragments | 300 | 0 | 250 fragments | none |
| orbit | 0 | 100 | 1,000 | skip conjunctions | none |
| pulse | 50 nodes | 200 | 0 | 25 nodes | none |
| loom | 0 | 200 | 5,000 | wider spacing | none |
| crystallise | 300 branches | 300 | 6,000 | 150 branches | none |
| stream | 80 particles | 200 | 5,000 | 40 particles | none |
| soundwave | 0 | 300 | 0 | skip harmonic | lighter (resonance) |
| flow | 2000 particles | 2000 | 0 | 1000 particles | none |

## Animation Specifications

### 1. TERRAIN (Homepage) — Clear Frame — Phase 1
**Living topographic map with tectonic events.**
- Marching-squares contours as filled elevation bands: copper (ridges) → sage (mid) → blue (valleys)
- Contour-hugging particles trace ridgelines (40 particles, 1px, 0.4 alpha)
- Ridge intersections: tiny radial glow halos (6px radius, 0.2 alpha)
- Mouse: gravity well warps the noise field origin (strength 0.3, radius 200px)
- Emergent: tectonic event every ~20s — noise z-offset jumps by 0.1 over 150 frames, contours morph and resettle
- Reuse cached Float32Array grid across frames

### 2. STRATA (About) — Clear Frame — Phase 2
**Deep geological cross-section with compression waves.**
- 12 horizontal bands, alternating copper (even) / slate blue (odd) tones
- Each band: unique procedural texture (stipple, crosshatch, wavy, crystalline). Textures static per band, not re-randomized each frame.
- Slow sinusoidal compression: `yOffset = sin(frameCount * 0.002 + bandIndex * 0.5) * 3`
- Mineral sparkle particles (20): drift upward from bottom at 0.2px/frame, alpha 0.3, respawn at bottom
- Mouse: none
- Emergent: fault event every ~15s — bands shear ±4px laterally over 30 frames, alpha-0.4 copper flash line along fault (500ms fade)
- Core glow at bottom: 30px gradient, alpha 0.18, pulses between copper and sage over 10s cycle

### 3. INK (Blog) — Trail Persistence — Phase 3
**Sumi-e ink wash with capillary bleeding.**
- Fade rate: 0.02
- 5 simultaneous drops, maxRadius 60-140
- Drops spawn in top third, grow with noise-modulated edges (36 arc steps)
- Bleed phase: after reaching maxRadius, tendrils extend via noise-driven angle (8-12 tendrils per drop, max length 80px)
- Chromatography: drop center copper at 0.35 alpha, tendrils in slate blue at 0.2 alpha
- 'lighter' compositing on bleed layer only
- Overlap brightening: when two drops' bleed zones intersect, alpha += 0.1 at intersection (capped at 0.5)
- Mouse: proximity (within 150px) accelerates bleed speed by 2x
- Drop lifecycle: grow (3s) → bleed (5s) → fade via trail persistence → respawn

### 4. BLUEPRINT (Projects) — Clear Frame — Phase 2
**Architect's drafting table with auto-drawing hand.**
- Slate blue precision grid background (20px spacing, 0.15 alpha, 0.5px lineWidth)
- Shape library: 4 types (floor plan rectangles, elevation stepped profile, nested cross-section, detail circle with radiating lines)
- Copper lines draw progressively at 2px/frame, lineWidth 2.5, alpha 0.7
- Line overshoot: extend 3px past endpoint, then retract over 5 frames
- Dimension annotations: tick marks (4px, 0.5 alpha) + dashed leader lines (2px dash, 0.3 alpha). No text rendering (too small on mobile).
- Two drawings simultaneously: canvas split into left/right halves, each runs an independent sequence
- Crosshair cursor (10px arms, 0.4 alpha) follows Bézier path between draw points
- Completed sets hold 60 frames then fade over 60 frames (alpha 0.7 → 0)
- Shape sizes: rectangles 50-170px wide, 35-125px tall. Detail circles 50-90px radius.
- Mouse: none (the draughtsman draws autonomously)

### 5. FORGE (Services) — Trail Persistence — Phase 1
**Metalwork cooling with crystallisation fracture cascades.**
- Fade rate: 0.018
- 8 hot copper molten streams (24px height, evenly spaced vertically)
- Cooling front speed: 0.003-0.007 * canvasWidth per frame per stream (randomized)
- Behind the front: fracture branches spawn (failure-first cascade technique)
  - Noise-driven angle deviation: `noise3D(x*0.004, y*0.004, time*0.15) * 1.2 * 0.03` per frame
  - Probabilistic forking: 0.8% per frame per branch, max gen 4
  - Generation-based thinning: `lineWidth = max(0.5, (1-lifeRatio) * (2 - gen*0.3))`
  - Max 200 branches (swap-and-pop removal)
  - Branch color: slate blue at `alpha = (1-lifeRatio) * 0.4`
- Sparks: 10 particles traveling along fresh fracture lines at 2px/frame, copper at 0.6 alpha, 3px radius
- Embers: 8 particles floating upward from hottest region, 2px, 0.3 alpha, radial glow via lighter compositing
- Cycle: when all streams fully cooled, fade over 60 frames then reset with new pour
- Mouse: none (the metal cools regardless)

### 6. SIGNAL (Contact) — Trail Persistence — Phase 3
**Radio telescope interference with resonance events.**
- Fade rate: 0.012
- 3 emitters at positions: (w*0.25, h*0.5), (w*0.75, h*0.5), (w*0.5, h*0.3)
- Spawn wavefront every 30 frames per emitter (max 30 wavefronts total, swap-and-pop)
- Copper primary waves at alpha `0.5 / (1 + radius * 0.008)`
- Wavefront arc: `startAngle` random, `sweep` 200-280°, lineWidth `1.5 + sin(angle*4) * 0.5`
- Constructive interference detection: when two wavefront radii intersect within 10px tolerance
  - Resonance node: copper dot at 0.8 alpha, 3px, radial glow 8px at 0.15 alpha
- Mouse: shifts emitter[0] position toward cursor (lerped, max displacement 100px)
- Emergent: resonance cascade every ~20s — all emitters fire simultaneously, amplitude swell over 60 frames (alpha peaks at 0.6), then decays over 120 frames

### 7. CIPHER (Privacy) — Clear Frame — Phase 2
**Encryption state machine with decryption sweeps.**
- Columns: `floor(w / 16)`, rows: `floor(h / charSize)`, charSize 12px
- Slate blue encrypted characters at 0.15 alpha, `12px monospace`
- Plaintext windows: 3-5 char sequences ('seal', 'lock', 'hash', 'gate', 'key') in copper at 0.6 alpha
- Character cycling: random chars refreshed every 5 frames (not every frame)
- Decryption sweep every ~300 frames: horizontal copper scanline at y position, 2px glow trail (alpha 0.4), characters in wake resolve to plaintext for 10 frames then re-encrypt
- Lock icon: copper `[ ]` characters pulse at 3 random positions, alpha oscillates 0.3-0.6 over 60 frames
- Mouse: characters within 80px of cursor temporarily show as plaintext (copper, 0.5 alpha)

### 8. RADAR (Search) — Clear Frame — Phase 2
**Deep-space radar with target acquisition.**
- 3 slate blue range rings at r/3, 2r/3, r (where r = `min(w,h) * 0.4`), alpha 0.12, lineWidth 1
- Copper sweep arm: rotation speed `t * 0.001`, wedge trail 20°, 20 trail lines with decreasing alpha (0.25 → 0)
- Main sweep line: copper, alpha 0.5, lineWidth 2
- 30 targets: random positions within radar radius
  - On sweep hit: target blooms — radius expands from 3px to 8px over 10 frames, then exponential decay over 3 sweep cycles
  - Brightness: `0.8 * exp(-(t - lastHit) * 0.003)`
- Target clusters: when 3+ targets within 40px, faint copper lines connect them (0.1 alpha)
- Target movement: 1 target per 5s relocates with brief arc trail (10 frames)
- Center heartbeat: 6px warm glow, alpha oscillates 0.3-0.5 over 2s
- Mouse: none (autonomous sweep)

### 9. ENTROPY (404) — Clear Frame — Phase 2
**Digital material dissolution with glitch physics.**
- 15px tile grid: `floor(w/15) * floor(h/15)` tiles, copper at 0.2 alpha
- 2 dissolution seed points at (w*0.3, h*0.4) and (w*0.7, h*0.6)
- Erosion rate: `stability -= 0.002 / (1 + dist * 0.01)` per frame per seed
- States: intact → cracked (slate blue fracture diagonal, 0.25 alpha) → fragmenting (spawn 3 fragments) → dissolved
- Fragment physics: gravity 0.05px/frame², horizontal drift ±0.5px, rotation 0.02 rad/frame, alpha decay 0.003/frame
- Glitch: max 3 tiles per frame teleport ±30px for 1 frame. 5% of fragments float upward (vy = -0.3).
- Mouse: cursor within 50px of intact tiles sets them to cracked state
- Cycle: at 80% dissolved, fragments reassemble — reverse velocity, snap into grid from edges inward over 120 frames. Then restart.

### 10. ORBIT (Now) — Clear Frame — Phase 2
**Orrery with gravitational lensing.**
- 7 orbiting bodies on elliptical paths
  - Semi-major: `baseRadius * (i + 1.5)` where baseRadius = `min(w,h) * 0.08`
  - Eccentricity: 0.1-0.3, tilt: ±0.15 rad, period: 2000-16000ms
  - Body sizes: 3-8px, copper fill at 0.85 alpha, halo glow: 12px radial gradient at 0.15 alpha
- Central star: 10px warm glow, alpha 0.3
- Trails: 30-point ring buffer per orbit, drawn as gradient path (alpha fades from 0.5 to 0)
- Conjunction: when angular difference < 15°, slate blue connecting line at `0.3 * (1 - angleDiff/15°)` alpha
- Lensing: visual fake — when conjunction active, nearby orbit guide ellipses shift by ±3px toward the conjunction line. Not pixel warping.
- Lagrange points: 2 per orbit (L4, L5 at ±60° from body), 1.5px dots at 0.1 alpha
- Precession: orbital tilts rotate at 0.001 rad/s
- Mouse: none

### 11. PULSE (Activity) — Clear Frame — Phase 1
**Neural network with visible signal propagation.**
- 50 nodes, initially placed randomly within 80% of canvas area
  - Drift: `vx/vy` = ±0.5, bounce off edges
  - Connection distance: `180 * max(0.6, quality)`
- Copper connections at rest: alpha = `(1 - dist/maxDist) * 0.15`
- Signal fire: random node fires every 30-90 frames
  - Pulse dot (3px, copper, alpha 0.8) travels along edge at 3px/frame
  - On arrival: target node flares (alpha 0.3 → 0.8 over 5 frames, decays over 30 frames)
  - Propagates to 2-3 connected neighbors with attenuation (* 0.7), max 3 hops
- Node failure: 0.3% per frame per node. Failed = slate blue fill, connections at 0.08 alpha. Recovery after 150 frames.
- Pulses reroute around failed nodes (skip in propagation)
- Node rendering: 4px + brightness*3px radius, alpha = 0.3 + brightness*0.6
- Edge rendering: lineWidth 1.5, alpha = base + `max(nodeA.brightness, nodeB.brightness) * 0.35`
- Mouse: attractor — nodes within 200px drift toward cursor at 0.3px/frame

### 12. LOOM (Colophon) — Trail Persistence — Phase 3
**Jacquard loom weaving with pattern emergence.**
- Fade rate: 0.025
- Warp threads: slate blue vertical lines, 15px spacing, alpha 0.15, lineWidth 1.5
- Weft shuttle: visible copper thread crossing at 2px/frame
  - Over/under: y-offset ±2px based on weave pattern + thread row
  - Shuttle head: bright copper dot (4px, 0.6 alpha)
  - Pattern cycle: plain (row%2) → twill (row%3) → satin (row%5), advances every 15 rows
- New weft every 60 frames, stacked at 6px vertical intervals
- Moiré: emerges naturally from overlapping copper/blue at different spacings
- Thread snap: 1% chance per weft completion. Single point flash at shuttle position (alpha 0.5, 4px radius, 200ms decay). Thread re-ties (weft continues from break point).
- Reset when weft count exceeds 70% of canvas height / 6px, fade over 60 frames
- Mouse: none

### 13. CRYSTALLISE (What's New) — Trail Persistence — Phase 3
**Dendritic crystal growth with phase transitions.**
- Fade rate: 0.01
- 3 nucleation points, randomly placed in center 60% of canvas
- Branch growth: 2px/frame, angle = parent angle + noise deviation (±0.1 rad)
- Hexagonal branching: sub-branches spawn every 18px at ±60° from parent angle
  - Max generation: 4, child maxLength = parent * 0.7
  - Max 300 branches (swap-and-pop on completion)
- Colors: growing tips sage green (alpha 0.6), established copper (alpha 0.35)
- Grain boundary: when branches from different seeds are within 15px, draw slate blue line between (alpha 0.4)
  - Localized flash at intersection: 8px radius, alpha 0.4, 300ms decay
- Shimmer wave: every 5s, a brightness pulse travels through established branches at 5px/frame (+0.15 alpha, decays over 30px)
- Coverage = totalLength / (w*h) * 500. At 40%: dissolve wave from center outward (radius expands at 3px/frame, trail persistence handles fade)
- New seeds nucleate when dissolve wave reaches 80% of canvas

### 14. STREAM (Analytics) — Trail Persistence — Phase 3
**Data river with turbulence and confluence.**
- Fade rate: 0.02
- 10 streams, baseY evenly spaced, baseWidth 25-45px
- Stream path: noise-modulated `y = baseY + noise3D(x*0.005, streamIdx, t*0.0003) * 30`
- Width modulation: `baseWidth + noise3D(x*0.003, streamIdx+10, t*0.0005) * baseWidth * 0.5`
- Copper flow particles (8 per stream): ride the current at stream speed (0.5-1.5 px/frame)
- Confluence: where streams overlap (baseY within 40px), particle velocity adds lateral component (±0.3px)
- Data burst: every ~10s, bright pulse (alpha 0.7, 5px radius) travels along one random stream at 4x normal speed
- Anomaly particles: 1 per stream in slate blue, moves at -0.3x speed (upstream)
- Mouse: streams split around cursor (add ±30px y-offset when stream path is within 60px of cursor)

### 15. SOUNDWAVE (Audio) — Clear Frame — Phase 3
**Harmonic spectrogram with resonance peaks.**
- Primary copper waveform (existing 4-wave superposition, 0.25-0.7 alpha range)
- Ghost harmonic: slate blue, same wave math but phase-shifted by π, alpha 0.15, lineWidth 1
- Resonance peak: every ~480 frames (8s), amplitude multiplier ramps 1→2 over 30 frames, holds 30 frames, decays over 60 frames
  - At peak: bars get 'lighter' compositing (adds glow)
- Spectral shimmer: brightness wave travels left to right at 2px/frame, +0.1 alpha in 20px window
- Center bars: barWidth * 1.5, alpha + 0.1. Edge bars: barWidth * 0.7, alpha - 0.05
- Mouse Y: maps to frequency multiplier on wave1 (0.02-0.06 range, default 0.04)

### 16. FLOW (Gallery) — Trail Persistence — Phase 1
**2000-particle turbulent flow with vortex shedding.**
- Fade rate: 0.015
- 2000 particles (mobile: 1000), each with age-based lifecycle
  - Spawn: random position, age 0, maxAge 200-500
  - Per frame: angle from `noise3D(x * 0.003, y * 0.003, zOff) * PI * 4`, move at 1.5px * cos/sin
  - Fade: alpha = `0.5 * min(1, age/20) * min(1, (maxAge-age)/40)` (fade in 20 frames, fade out 40)
  - Respawn when age > maxAge or off-canvas
- 80% copper particles, 20% slate blue with noise z-offset + 10 (creates visible shear between layers)
- Trail drawing: `ctx.strokeStyle`, lineWidth 1.5, stroke from prev position to current
- Mouse vortex: within 150px of cursor, add tangential velocity component (perpendicular to cursor-particle vector, strength 2px/frame)
- Vortex shedding: when vortex active for 60+ frames, particles in a 50px radius region get coherent rotational velocity that persists for 120 frames after cursor leaves
- zOff increment: 0.0005/frame

## Overlay Gradient Change

```css
/* Old */
background: linear-gradient(to bottom,
  transparent 0%,
  color-mix(in srgb, var(--color-surface) 40%, transparent) 30%,
  color-mix(in srgb, var(--color-surface) 70%, transparent) 60%,
  var(--color-surface) 100%);

/* New */
background: linear-gradient(to bottom,
  transparent 0%,
  color-mix(in srgb, var(--color-surface) 25%, transparent) 40%,
  color-mix(in srgb, var(--color-surface) 55%, transparent) 65%,
  var(--color-surface) 100%);
```

Fallback via `@supports` preserved (existing pattern).

## Performance Budget

- Target: 60fps on 2020 MacBook Air (M1). Floor: 30fps on 2018 Intel MacBook (quality degrades gracefully).
- Adaptive quality system retained: `quality` ranges 0.25-1.0
  - `dt > 20ms` (below 50fps): quality *= 0.8, min 0.25
  - `dt < 10ms` (above 100fps): quality *= 1.1 after 10 consecutive fast frames, max 1.0
- Per-animation budgets in table above
- Trail persistence: fade rates tuned so trails don't saturate over 30s continuous viewing
- Mouse handlers: single sentinel-guarded `mousemove` on document, RAF-throttled reads
- IntersectionObserver pauses RAF when hero section not visible
- Mobile: 50% particle counts, skip 'lighter' compositing, skip secondary color elements at quality < 0.5
- Object pooling: flow and forge use pre-allocated arrays, swap-and-pop removal (no splice in hot paths)

## Architecture

Single `HeroCanvas.astro` component (is:inline constraint). Expected final size: ~3500-4500 lines.

### Internal Structure
```
IIFE
├── Shared state (rafId, observers, timers, mouse, quality)
├── Noise function (noise3D)
├── Color system (readColors, SECONDARY_RGB, TERTIARY_RGB, parseHex)
├── Canvas lifecycle (sizeCanvas, destroyCanvas, initCanvas)
├── Pointer system (mousemove handler, lerp smoother, dead zone)
├── Animation registry (ANIMATIONS object)
│   ├── Each animation: { init, frame, cleanup, fadeRate? }
│   └── 16 animation IIFEs
├── Render loop (startLoop with adaptive quality + trail persistence dispatch)
├── Animation switching (switchAnimation with fade transition)
└── Sentinel-guarded global listeners (resize, VT swap, reduced-motion)
```

### Cleanup Contract
Every `cleanup()` must:
1. Set all arrays to `[]`
2. Set all cached buffers to `null`
3. Reset all counters/timers to 0
4. No lingering references to canvas or context

## Test Plan

- [ ] All 16 animations render visibly on desktop Chrome, Firefox, Safari
- [ ] `prefers-reduced-motion: reduce` → no canvas initialization, hero-glow fallback
- [ ] Dynamic reduced-motion toggle (OS setting change) → live stop/start
- [ ] View Transitions: navigate between pages → clean teardown/init, no double RAF
- [ ] Theme toggle (dark ↔ light): colors update live via MutationObserver
- [ ] Mobile Safari: resize from toolbar → no jank (200ms debounce)
- [ ] Mouse interaction: smooth lerp, no twitchiness, dead zone works
- [ ] Emergent events: no full-canvas flash, no rapid strobing
- [ ] Performance: 60fps on M1 MacBook Air for all animations
- [ ] Trail persistence: trails don't saturate after 60s continuous viewing
- [ ] `@supports` fallback: overlay gradient degrades gracefully without color-mix
- [ ] Build passes, Lighthouse performance ≥ 0.7 on homepage

## Not In Scope

- WebGL / GPU shaders (stay on Canvas 2D for compatibility)
- Audio reactivity (no microphone access)
- Gyroscope / DeviceOrientation (UX friction too high)
- Per-page color customization (palette is site-wide)
- Offscreen canvas / multi-pass blur (too expensive)
- Canvas text rendering for annotations (too small on mobile, not accessible)
