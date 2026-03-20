# Hero Canvas Animations

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Add canvas-based generative animations behind the homepage hero section with a pill switcher to cycle between 8 organic-technical animation modes.

---

## Motivation

Inspired by the animated canvas splash on sybilsolutions.ai. Rather than a splash gate, the animations render as a background layer behind the existing hero content — maximum visual impact, zero added friction. Animations are thematically tied to Adrian's identity: botanical forms, systems thinking, adversarial evaluation, Tasmania.

## Architecture

### New file

`src/components/HeroCanvas.astro` — contains the `<canvas>`, switcher HTML, overlay gradient, and a single `<script is:inline>` block with all animation logic.

### Integration

In `src/pages/index.astro`, the hero `<section>` is modified:

1. Add `relative overflow-hidden` to the hero section classes.
2. Insert `<HeroCanvas />` as the first child inside the hero section.
3. Add `relative z-10` to all existing hero content (h1, paragraphs, buttons, Personalisation island) so they float above the canvas.

No new dependencies. Pure Canvas 2D API. No Preact island — render-only with no managed state beyond active animation index.

## Animations

All animations render using the site's CSS custom property palette, reading `--color-accent`, `--color-surface`, and `--color-text-muted` from `getComputedStyle(document.documentElement)` at init and on theme change. The hex values below are current defaults for reference only — implementation must always read from CSS custom properties at runtime.

**Noise implementation:** Animations 3 (Flow Field), 6 (Terrain Contours), and 8 (Erosion Channels) require a 2D/3D noise function. Include a compact simplex noise implementation inline (~1.5KB minified). This is shared across all three animations.

### 1. Mycelium Network

Hyphae grow from random seed points, branching at probabilistic angles (15-45 degrees, weighted toward smaller deflections). When two branch tips come within a threshold distance, they fuse (anastomosis). Copper filaments with 0.3-0.6 alpha. Canvas slowly fills, then fades out and regrows from new seeds.

**Key parameters:** 5-8 seed points, branch probability 0.03/frame, max depth 12, anastomosis radius 15px, regrowth cycle ~10s.

### 2. Fractal Fern

Barnsley fern via iterated affine transforms, plotted point-by-point at ~200 points/frame so the fern visibly materializes. Copper-to-muted color gradient mapped to iteration count. Subtle wind sway via a slow sinusoidal rotation of the base transform (~0.02 rad amplitude, 8s period).

**Key parameters:** 4 affine transforms with standard Barnsley probabilities (0.01, 0.85, 0.07, 0.07), scale to fill ~60% of canvas height, centered horizontally.

### 3. Flow Field

2D Perlin noise (simplex approximation) generates a vector field across the canvas at grid resolution ~20px. 300-500 particles follow the field, leaving fading trails (canvas not fully cleared each frame — instead filled with `surface` color at 0.02 alpha). Noise field z-offset increments slowly for temporal evolution.

**Key parameters:** particle count 400, trail alpha 0.02, noise scale 0.003, z-speed 0.0005, particle speed 1.5px/frame, respawn at random position when off-canvas.

### 4. Root Tendrils

3-5 roots emerge from the top edge at random x positions. Each grows downward via biased random walk (70% gravity bias + 30% lateral wander). Branches spawn probabilistically with decreasing thickness (parent thickness * 0.7). Completed root systems fade to 0.15 alpha as new ones begin growing.

**Key parameters:** initial thickness 3px, min thickness 0.5px, branch probability 0.02/frame, growth speed 1.2px/frame, max concurrent root systems 3.

### 5. Neural Garden

40-60 nodes placed with organic spacing (Poisson disk sampling, min distance 80px). Edges connect nodes within 150px range. Activation pulses originate from random nodes every 2-3s and propagate along edges at ~100px/s. Nodes glow (radial gradient, copper color, radius pulse) when activation arrives. Edges brighten as pulse traverses them.

**Key parameters:** node count 50, connection radius 150px, pulse speed 100px/s, pulse interval 2-3s (random), node base radius 3px, glow radius 12px.

### 6. Terrain Contours

2D noise field sampled at fine resolution. Marching squares algorithm extracts contour lines at 8-10 threshold levels. Noise field z-offset animates slowly, making contours shift like a living topographic map. Lines rendered in copper at varying opacity (higher elevation = higher opacity).

**Key parameters:** grid resolution 8px, contour levels 10, noise scale 0.005, z-speed 0.0003, line width 1px, opacity range 0.15-0.5.

### 7. Spore Drift

80-120 particles of varying radius (1-4px) with trailing filaments (3-5 segments, bezier-curved). Brownian motion with subtle downward drift (0.1px/frame). Depth illusion: larger particles are more opaque and drift faster. Soft glow halos via radial gradient (6-12px radius, 0.1 alpha).

**Key parameters:** particle count 100, radius range 1-4px, filament segments 4, drift speed 0.1px/frame, brownian magnitude 0.3px, glow radius 2-3x particle radius.

### 8. Erosion Channels

Noise-generated heightmap. From 8-12 random seed points, water flows downhill following steepest descent (8-neighbor lookup). Channels are drawn as lines that widen with accumulated flow (sqrt scaling). When channels reach canvas edge or a local minimum (all 8 neighbors are higher or equal — fill the basin by raising height to lowest neighbor + epsilon and continue), they continue flowing. This prevents premature termination from noise artifacts. After all channels complete, hold for 3s, then fade and regenerate with new terrain.

**Key parameters:** heightmap resolution 4px, seed points 10, line width range 0.5-3px, flow accumulation sqrt-scaled, hold duration 3s, fade duration 1s, basin fill epsilon 0.001.

## Switcher UI

A horizontal row of pill-shaped labels at the bottom of the hero section, centered:

```
[ Mycelium ] [ Fern ] [ Flow ] [ Roots ] [ Neural ] [ Terrain ] [ Spores ] [ Erosion ]
```

### Styling

- **Active pill:** `bg-accent` background, `text-surface` text, `rounded-full`.
- **Inactive pills:** `bg-transparent`, `text-text-muted`, `border border-border`, `rounded-full`.
- **Hover:** `text-accent` with `border-accent` transition.
- **Font:** `text-xs`, `px-3 py-1`.
- **Container:** `flex gap-2 justify-center flex-wrap` on mobile (pills wrap to second row). On desktop (`sm:` and up), single row. If wrapping produces more than 2 rows, consider shortening labels.
- **Mobile affordance:** On narrow screens where pills wrap, left/right edge pills get subtle fade-mask indicators if horizontally scrollable (CSS `mask-image` gradient).

### Behaviour

- Clicking a pill switches the active animation. Canvas fades to 0 opacity over 150ms, animation swaps, canvas fades back in.
- First animation on page load is chosen randomly from the 8 options.
- Active animation index stored in `sessionStorage('adrianwedd_heroAnimation')` so back-navigation preserves the choice. Fresh sessions get a new random pick.

### Semantics

- Switcher container: `role="tablist"`, `aria-label="Background animation"`.
- Each pill: `<button role="tab">`, `aria-selected="true|false"`.
- Active pill: `tabindex="0"`. Inactive pills: `tabindex="-1"`.
- Arrow keys move focus and activate (auto-activation pattern per WAI-ARIA tabs). Left/Right cycle through pills with wrapping. Home/End jump to first/last.
- Canvas: `aria-hidden="true"`.

## Readability Overlay

A CSS pseudo-element or `<div>` between canvas and hero content:

```css
background: linear-gradient(
  to bottom,
  transparent 0%,
  color-mix(in srgb, var(--color-surface) 40%, transparent) 30%,
  color-mix(in srgb, var(--color-surface) 70%, transparent) 60%,
  var(--color-surface) 100%
);
```

Ensures hero text remains readable regardless of animation density. The gradient is stronger toward the bottom where the text and buttons sit.

## Canvas Resize

On `window.resize` (debounced 200ms via `requestAnimationFrame` guard):

1. Read the hero section's `clientWidth` and `clientHeight`.
2. Update `canvas.width` and `canvas.height` scaled by `Math.min(devicePixelRatio, 2)`.
3. Update `canvas.style.width` and `canvas.style.height` to CSS dimensions.
4. Call the current animation's `init()` to reset state for new dimensions (e.g., regenerate Poisson disk nodes, recalculate noise grid).

This handles responsive hero sizing (`py-20 sm:py-28`) and orientation changes on mobile.

## `hero-glow` Class

The existing hero section has a `hero-glow` class that applies a subtle radial glow effect. When `HeroCanvas` is present, `hero-glow` is removed from the section — the canvas animations replace this visual treatment. On pages without the canvas (or with `prefers-reduced-motion`), `hero-glow` remains.

## Performance

- Canvas: `position: absolute; inset: 0; z-index: 0`. No layout impact.
- Renders at `devicePixelRatio`, capped at 2x.
- `IntersectionObserver` on the hero section: animation pauses (cancels RAF) when scrolled out of viewport, resumes when visible.
- Adaptive quality: if a frame exceeds 20ms, particle/branch counts reduce by 20% (floor: 25% of initial count). If 10 consecutive frames are under 10ms, counts recover by 10% up to the initial value. This prevents permanent degradation from transient spikes.
- Offscreen entities are culled (no draw calls outside canvas bounds).
- Target total JS: <20KB minified across all 8 animations (includes ~1.5KB shared simplex noise).
- Canvas uses `will-change: opacity` only during the 150ms fade transition, then removed.

## Accessibility

- `prefers-reduced-motion: reduce`: canvas and switcher are hidden entirely via CSS (`display: none`). Hero renders clean.
- Canvas is `aria-hidden="true"`, never receives focus.
- Switcher pills are keyboard-navigable (arrow keys within tablist).
- All existing hero content (h1, paragraphs, CTAs, Personalisation island) remains fully accessible and unchanged in DOM order.

## Theme Awareness

- At animation init, colors are read from CSS custom properties via `getComputedStyle(document.documentElement)`.
- `--color-accent` for primary drawing color.
- `--color-surface` for background/fade color.
- `--color-text-muted` for secondary/faded elements.
- On theme toggle, the script listens for mutations on `document.documentElement.classList` (MutationObserver on `class` attribute) to detect `.light` being added/removed. When detected, re-read all CSS custom properties immediately and apply to the current animation's next frame. No animation restart needed — just update the color variables used by the render loop.

## View Transitions Compatibility

Follows the established project pattern:

- `<script is:inline>` (not module) so it re-executes on VT swap.
- `documentElement.dataset.heroCanvasInit` sentinel prevents duplicate global listeners.
- Event delegation on `document` for switcher clicks.
- `astro:after-swap` handler cancels any existing RAF loop (via stored `rafId`) and disconnects the IntersectionObserver before re-initializing canvas and animation. This prevents duplicate render loops.
- Lazy DOM lookups (functions, not cached references) since elements get replaced on VT.

## Error Handling

- If `canvas.getContext('2d')` returns null, component silently does not render. Hero works fine without it.
- Each animation's `frame()` function is wrapped in try/catch. A broken animation logs to console and skips to the next one — never crashes the switcher or blocks other animations.
- If all animations fail, switcher hides itself.

## Files Changed

| File | Change |
|------|--------|
| `src/components/HeroCanvas.astro` | **New.** Canvas, switcher, overlay, all animation logic. |
| `src/pages/index.astro` | Add `relative overflow-hidden` to hero section. Import and insert `<HeroCanvas />`. Add `relative z-10` to hero content elements. |
| `src/styles/global.css` | Add `scrollbar-hide` utility if not present (for mobile switcher scroll). |

No other files changed. No new dependencies.
