# Hero Animations v2 — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Goal:** Redesign all 16 hero canvas animations to be visually stunning, thematically perfect per page, and technically superior to the failure-first reference animations.

## Design Decisions

- **Rendering:** Hybrid — trail persistence for organic animations (7), clearRect for geometric (9)
- **Palette:** Copper primary `#c48b6e`, slate blue secondary `#6e8ec4`, sage green tertiary `#8eaa7e` (sparingly)
- **Overlay:** Lightened gradient — 25%@40%, 55%@65%, solid@100% (from 40%@30%, 70%@60%)
- **Interactivity:** Mouse parallax/influence on every animation. Mobile: gyroscope tilt fallback.
- **Emergent moments:** Every 15-30s, each animation has a surprising event that rewards viewers who stay.
- **Multi-pass compositing:** 'lighter' blending for glow, offscreen canvas for blur where needed.

## Shared Techniques

### Trail Persistence (organic animations)
Replace `ctx.clearRect(0,0,w,h)` with semi-transparent surface fill:
```js
ctx.fillStyle = 'rgba(surface_r, surface_g, surface_b, fadeRate)';
ctx.fillRect(0, 0, w, h);
```
Fade rates per animation: 0.01 (slow/crystallise) to 0.025 (fast/loom).

### Mouse Influence
Track `mousemove` on the section. Store normalized position (0-1). Each animation reads it differently:
- Gravity well (terrain, flow)
- Vortex (flow)
- Dissolution seed (entropy)
- Decryption radius (cipher)
- Emitter shift (signal)
- Attractor node (pulse)
- Rock/obstacle (stream)
- Frequency modulator (soundwave)
- Bleed accelerator (ink)

Mobile: use `DeviceOrientationEvent` for tilt-based parallax. iOS requires permission prompt (`DeviceOrientationEvent.requestPermission()`). If permission denied or API unavailable, mouse influence is simply disabled — animations run without interactivity, which is fine.

### Color System
Read CSS custom properties at init. Secondary and tertiary colors defined as constants:
```js
var SECONDARY = '#6e8ec4';  // slate blue
var TERTIARY = '#8eaa7e';   // sage green (crystallise, terrain only)
```
Parse to RGB for canvas `rgba()` usage.

## Animation Specifications

### 1. TERRAIN (Homepage) — Clear Frame
**Living topographic map with tectonic events.**
- Marching-squares contours as filled elevation bands: copper (ridges) → sage (mid) → blue (valleys)
- Contour-hugging particles trace ridgelines (40 particles)
- Ridge intersections: tiny radial glow halos
- Mouse: gravity well warps the noise field origin
- Emergent: tectonic event every ~20s — noise field shifts rapidly, contours morph and resettle
- Reuse cached Float32Array grid across frames

### 2. STRATA (About) — Clear Frame
**Deep geological cross-section with compression waves.**
- 12 horizontal bands, alternating copper/slate tones
- Each band: unique procedural texture (stipple, crosshatch, wavy, crystalline)
- Slow sinusoidal compression makes bands breathe
- Mineral sparkle particles drift upward from deepest layers
- Mouse: no direct effect (geological patience)
- Emergent: fault event every ~15s — lateral shear with bright seismic flash along fault line
- Core glow at bottom pulses between copper and sage

### 3. INK (Blog) — Trail Persistence
**Sumi-e ink wash with capillary bleeding.**
- Fade rate: 0.02
- 5 simultaneous drops, maxRadius 60-140
- Drops fall from top third, splatter on impact (radial particle burst)
- Bleed outward through noise-modulated capillary tendrils
- Chromatography: drop center copper, bleed tendrils in slate blue
- 'lighter' compositing on bleed layer
- When bleed zones overlap: intersection brightens briefly
- Mouse: proximity accelerates bleed speed

### 4. BLUEPRINT (Projects) — Clear Frame
**Architect's drafting table with auto-drawing hand.**
- Slate blue precision grid background (20px spacing, 0.15 alpha)
- Copper lines draw progressively: floor plans, elevations, cross-sections, detail circles
- Line overshoot-and-settle (slight wobble on endpoint)
- Dimension annotations: tick marks, dashed leaders, tiny measurement text
- Two drawings simultaneously in different canvas regions
- Crosshair cursor follows smooth Bézier path between drawing points
- Completed sets hold 2s then fade, new sets begin
- Shapes 2x larger than current, lineWidth 2.5

### 5. FORGE (Services) — Trail Persistence
**Metalwork cooling with crystallisation fracture cascades.**
- Fade rate: 0.018
- Hot copper molten streams (8 bands, 24px height)
- Cooling front moves left to right
- Behind the front: fracture networks branch outward (failure-first cascade technique)
  - Noise-driven angle deviation: `n3(x*0.004, y*0.004, time*0.15) * 1.2`
  - Probabilistic forking: 0.8% per frame per branch
  - Generation-based thinning: `lineWidth = max(0.5, (1-lifeRatio) * (2 - gen*0.3))`
- Fractures in slate blue against warm cooling metal
- Bright sparks travel along fresh fracture lines
- Embers float upward from hottest region with radial glow
- Cycle: accumulate 10-15s, then reset with new pour

### 6. SIGNAL (Contact) — Trail Persistence
**Radio telescope interference with resonance events.**
- Fade rate: 0.012
- 3 emitters, spawn wavefront every 30 frames
- Copper primary waves, slate blue secondary
- Wavefront line width modulated by `sin(angle * 4)` for organic thickness
- Constructive interference: bright resonance nodes with radial glow + orbiting satellite particles
- Destructive interference: subtle voids in the trail
- Mouse: shifts one emitter's position
- Emergent: simultaneous fire every ~20s → resonance cascade, standing wave pattern decays

### 7. CIPHER (Privacy) — Clear Frame
**Encryption state machine with decryption sweeps.**
- Slate blue encrypted characters at 0.15 alpha, slowly scrolling
- Plaintext windows in copper at 0.6 alpha, drift through field
- Character cycling every 5 frames (readable, not flickering)
- Horizontal decryption sweep every ~5s: bright copper scanline with glow trail
  - Characters resolve to plaintext in wake, scramble back behind
- Lock icons pulse at random positions
- Mouse: proximity temporarily decrypts nearby characters (radial area)

### 8. RADAR (Search) — Clear Frame
**Deep-space radar with target acquisition.**
- Slate blue range rings and crosshair grid
- Copper sweep arm with wide phosphor-glow wedge trail
- Targets: pulsing copper dots that BLOOM on sweep hit (radial expansion, exponential decay over 3 sweeps)
- Target clusters connected by faint copper constellation lines
- Occasional target "moves" with brief trail arc
- Bearing/range readout text near newly acquired targets
- Center transmitter heartbeat: persistent warm glow pulse

### 9. ENTROPY (404) — Clear Frame
**Digital material dissolution with glitch physics.**
- 15px copper tile grid, assembles then dissolves
- Dissolution from seed points: crack (slate blue fracture lines) → fragment → fall
- Fragment physics: gravity pull down, horizontal drift, rotation
- Glitch events: random tiles teleport ±30px for one frame
- Some fragments float UPWARD (anti-gravity glitch)
- Mouse: creates dissolution seed (hover near intact tiles → crack)
- Cycle: at 80% dissolved, reverse — fragments magnetically reassemble from edges inward
- Reassembly snap-into-place feel

### 10. ORBIT (Now) — Clear Frame
**Orrery with gravitational lensing.**
- 7 orbiting bodies on elliptical paths, sizes 3-8px with radial halo glow
- Central warm glow (the star)
- Copper trails that gradient-fade (not discrete segments)
- Conjunction events: slate blue connecting line + subtle gravitational lensing distortion
- Closest-approach triggers brief flare
- Lagrange points: tiny pulsing dots
- Whole system has gentle precession — orbital tilts rotate over 60s

### 11. PULSE (Activity) — Clear Frame
**Neural network with visible signal propagation.**
- 50 drifting nodes, connected by proximity (failure-first neural technique)
- Nodes bounce gently off edges (`vx/vy` with reflection)
- Copper connections at rest
- Signal fires: bright pulse TRAVELS along edge (visible moving dot, not instant)
- Node flares on receive, propagates to neighbors with attenuation
- Failed nodes (stochastic 0.3%/frame): turn slate blue, connections dim, pulses reroute
- Recovery after 2-3s
- Mouse: temporary attractor node, nearby nodes drift toward it

### 12. LOOM (Colophon) — Trail Persistence
**Jacquard loom weaving with pattern emergence.**
- Fade rate: 0.025
- Slate blue warp threads (vertical, structural, 15px spacing)
- Copper weft thread visibly shuttles across (you see the thread traveling)
- Over/under interlacing creates real weave patterns: plain → twill → satin
- Each pattern cycle more complex than the last
- Moiré interference patterns emerge in overlap zones as fabric accumulates
- Shuttle leaves warm trail
- Fabric fills 70% → fade and reset with new pattern
- Thread snap: occasional bright flash + re-tie

### 13. CRYSTALLISE (What's New) — Trail Persistence
**Dendritic crystal growth with phase transitions.**
- Fade rate: 0.01
- 3-4 simultaneous nucleation points
- 60° hexagonal symmetry branching (like real ice crystals)
- Growing tips: sage green glow. Established structure: copper
- Sub-branches at regular intervals → fractal dendritic patterns
- When branches from different seeds MEET: bright collision flash, slate blue grain boundary
- Shimmer wave: slow travelling brightness through established branches
- Coverage at 40%: dissolve wave from center outward, new seeds nucleate

### 14. STREAM (Analytics) — Trail Persistence
**Data river with turbulence and confluence.**
- Fade rate: 0.02
- 10 noise-modulated streams, left to right
- Copper flow particles ride the current
- Confluence zones: turbulent eddies (particles spiral briefly)
- Data burst: bright pulse travels along one stream faster than flow speed
- Anomaly particles in slate blue flow UPSTREAM
- Stream width modulates: narrows (rapids), widens (pools)
- Mouse: creates "rock" — streams split around cursor position

### 15. SOUNDWAVE (Audio) — Clear Frame
**Harmonic spectrogram with resonance peaks.**
- Primary copper waveform (existing) + ghost harmonic in slate blue at half-phase, 0.2 alpha
- Resonance peak every ~8s: amplitude doubles, bars flare with 'lighter' glow
- Spectral shimmer: travelling standing-wave node along waveform
- Center bars wider/brighter (fundamental), edges narrower (overtones)
- Mouse Y: modulates fundamental frequency

### 16. FLOW (Gallery) — Trail Persistence
**2000-particle turbulent flow with vortex shedding.**
- Fade rate: 0.015
- 2000 particles with age-based lifecycle (200-500 frames, then fade and respawn)
- 3D simplex noise drives angle per particle
- Copper particles at 0.5 alpha, 20% slate blue particles with different noise z-offset (visible shear)
- Mouse: vortex — particles swirl around cursor
- Vortex shedding: region of coherent rotation breaks off and drifts downstream
- Age-based fade prevents trail saturation

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

Fallback via `@supports` preserved.

## Performance Budget

- All animations must maintain 60fps on 2020 MacBook Air (M1)
- Adaptive quality system retained: reduce particle counts, grid resolution, detail when frame time > 20ms
- Trail persistence animations: fade rate tuned so trails don't saturate canvas over time
- Mouse handlers throttled to RAF
- IntersectionObserver pauses when hero not visible
- Mobile: reduce particle counts by 50%, skip multi-pass compositing

## Architecture

Single `HeroCanvas.astro` component retained (is:inline constraint prevents modularization).
All 16 animations in IIFE registry pattern. Shared helpers:
- `noise3D` (existing)
- `readColors` + secondary/tertiary constants
- `sizeCanvas`, `destroyCanvas`, `initCanvas` (existing lifecycle)
- New: `mouseX`, `mouseY` normalized state read in sentinel-guarded mousemove handler
- Trail persistence: per-animation `fadeRate` property, frame function checks and applies

## Not In Scope

- WebGL / GPU shaders (stay on Canvas 2D for compatibility)
- Audio reactivity (no microphone access)
- Touch gesture interactions beyond basic position tracking
- Per-page color customization (palette is site-wide)
