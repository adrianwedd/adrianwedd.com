# Hero Visualisations Redesign

**Date:** 2026-03-23
**Status:** Approved (pending implementation plan)

## Summary

Replace and expand the site's hero section canvas animations. Every page gets a full-viewport hero with a thematically relevant, content-inspired animation. Gallery (flow) and Audio (soundwave) stay as-is. Terrain moves to Home and gets refined. Three existing animations are replaced with new ones (fern → Signal, neural → Ink, mycelium on Services → Forge). Mycelium on Projects is replaced with Blueprint. The auto-rotate behaviour on Home is replaced with a fixed terrain animation. Three unused animations (roots, spores, erosion) are removed. Eight new animations are added for pages that currently have no hero section.

## Motivation

Current animations are competent but samey — mostly organic growth patterns (mycelium, fern, roots) that blur together. Home auto-rotates through all animations, giving it no visual identity. Both Services and Projects use the same mycelium animation. Eight pages (Search, 404, Privacy, Now, Colophon, Activity, Analytics, New) have no hero section at all. Three animations (roots, spores, erosion) are defined in HeroCanvas.astro but unused by any page.

The goal: every page should have a distinctive, content-inspired animation that reinforces what the page is about. More visual variety across the site. Gallery (flow) is the gold standard — fluid, distinctive, thematically appropriate.

## Design Principles

- **Content-driven:** Each animation's visual metaphor should connect to the page's purpose, not just look pretty
- **Palette-consistent:** All animations derive colours from existing CSS custom properties (accent copper, muted tones, surface background). Derived tints/shades (e.g., brighter accent for heat, dimmer accent for depth) are computed at runtime from the theme values — no hardcoded hex colours.
- **Same architecture:** Every animation follows the existing `{ init, frame, cleanup }` pattern in HeroCanvas.astro. No WebGL, no external libraries — pure Canvas 2D.
- **Performance:** Adaptive quality scaling already exists. New animations must respect the `quality` parameter (0–1) by reducing particle counts, iteration steps, or visual detail. Guidance per animation: Entropy — reduce tile count and skip fragment physics below 0.5; Forge — reduce stream count and skip fracture drawing; Strata — reduce band count and skip procedural textures (use flat fills); Cipher — reduce column count; Pulse — reduce node/edge count; all others — reduce particle/point counts proportionally.
- **Accessibility:** All canvases are `aria-hidden`. Must respect `prefers-reduced-motion` (existing infrastructure handles this).
- **Theme-aware:** Animations read colours from CSS custom properties via `readColors()`. Must work in both dark and light mode.

## Animation Specifications

### 1. Terrain (Home) — REFINE

**Move from:** About → Home
**Concept:** Topographic contour map of a living landscape. Not static lines — the elevation field evolves slowly, as if watching tectonic plates shift over geological time.

**Refinements over current implementation:**
- Contour lines should shift and breathe — the noise field animates slowly (current implementation may already do this, but needs to feel more alive)
- Add elevation-dependent colour intensity: higher ridges = brighter accent, valleys = dimmer
- Particles (sparse, 30-50) that trace along contour lines like water finding its level — flowing downhill, pooling in valleys, drifting over ridges
- Occasional subtle "tectonic event" — a section of the field shifts more rapidly for 2-3 seconds, then settles
- Contour line thickness varies with gradient steepness (tight contours = steep terrain = thinner lines for density)

**Why Home:** The contour map is the most "portfolio overview" animation — it shows depth, layers, landscape. It's a map of territory. The homepage is a map of the site.

### 2. Forge (Services) — NEW

**Replaces:** Mycelium
**Concept:** Molten metal streams cooling into crystalline solid structures. The services page is about transformation — taking raw ideas and forging them into working systems.

**Visual language:**
- 6-10 horizontal streams of varying width flowing across the canvas
- Colour gradient per stream: hot = accent at high lightness/opacity → cooling = accent at normal saturation → cooled = accent at low opacity blended toward surface colour. Compute all from `colors.accent` by manipulating alpha and mixing with `colors.surface` — no hardcoded hex values.
- Cooling progresses left-to-right along each stream, with the cooling front advancing at different rates
- Where streams have fully cooled: hairline fracture patterns appear, occasionally revealing a glow beneath (still hot inside)
- Crystallisation texture on cooled sections — subtle geometric grain
- Cycle: streams flow, cool, crack. After fully cooled, the whole field slowly fades and new streams begin
- Overall palette stays within the site's copper/earth tones but pushes toward the bright end during the "hot" phase

### 3. Strata (About) — NEW

**Replaces:** Terrain (moved to Home)
**Concept:** Animated geological cross-section. Horizontal sedimentary layers slowly compressing, shifting, occasionally faulting. Each stratum has a different visual texture — some crystalline, some organic fibres, some compressed shells.

**Visual language:**
- 8-12 horizontal bands spanning the viewport width
- Each band has a distinct texture drawn procedurally (stipple, cross-hatch, wavy lines, dot patterns)
- Bands slowly compress downward (newer layers depositing on top)
- Occasional fault line event: a vertical crack appears and one side shifts vertically relative to the other (2-4px), then settles
- Colour variation per band using the theme palette — some warmer (copper), some cooler (muted grey-brown)
- A subtle "core glow" at the very bottom edge — deep geological heat

**Why About:** The about page is biographical. Strata = accumulated experience, depth, what you're made of. Each layer is a career phase, a skill set, a lived experience compressed into the foundation.

### 4. Signal (Contact) — NEW

**Replaces:** Fern
**Concept:** Electromagnetic wave propagation. Concentric ripples emanating from a point, interfering with each other. The visual language of reaching out, making contact.

**Visual language:**
- Primary emitter point (slightly off-centre, left third of canvas)
- Concentric circular wavefronts expanding outward, fading with distance (inverse square)
- Each wavefront is a thin arc (not full circle) — partial visibility adds elegance
- Wavefronts carry subtle amplitude modulation (thickness varies sinusoidally along the arc)
- Secondary emitter point (right third) — its wavefronts create interference patterns where they meet the primary
- Where constructive interference occurs: bright nodes. Destructive: dim gaps.
- Wavefronts slowly shift frequency (wavelength gets longer, then shorter, cycling)
- Optional: tiny carrier dots moving along wavefronts at the speed of propagation

**Why Contact:** Contact = signal transmission. You're sending a message. This is what that looks like in physics.

### 5. Ink (Blog) — NEW

**Replaces:** Neural
**Concept:** Ink drops falling onto paper, bleeding through fibres, forming shapes that almost resolve into letters then dissolve. The medium of writing made visceral.

**Visual language:**
- Start with 2-3 ink drops at random positions
- Each drop expands outward with fractal edges (use noise-modulated radius) — not perfect circles
- Ink density varies: darker centre, lighter bleeding edges (radial gradient with noise)
- Rorschach effect: mirror each drop across the vertical centre axis (slightly offset, not perfectly symmetrical)
- When drops grow large enough to overlap, their edges merge naturally (use `globalCompositeOperation = 'lighter'` for additive blending, then reset to `'source-over'` after drawing drops)
- After reaching maximum spread, drops slowly fade (evaporation/absorption)
- New drops fall at staggered intervals — always 2-4 active drops at once
- Colour: accent at maybe 15-25% opacity layered multiple times for depth. Never solid fills.
- Optional subtle paper texture: very faint noise grain across the entire canvas

**Why Blog:** Blog = writing = ink on paper. This is the moment of creation — thought becoming visible mark.

### 6. Blueprint (Projects) — NEW

**Replaces:** Mycelium (Projects currently uses mycelium, same as Services)
**Concept:** Technical/architectural drawings animating themselves into existence. Grid snaps, measurements annotate, cross-sections reveal structure.

**Visual language:**
- Background: subtle grid (fine lines every 15-20px) in very dim accent
- Primary colour: derive a cooler tint from `colors.muted` or `colors.border` at runtime (desaturate the accent toward the muted tone). The "blueprint" feel comes from using the cooler end of the existing palette, not from injecting new hex values.
- Animated "drawing" sequences: lines extend from points, snap to grid intersections
- Sequence: floor plan → elevation → cross-section → detail callout → fade → new drawing
- Each sequence takes ~8 seconds, overlapping transitions
- Dimension lines with tick marks appear alongside drawn elements
- Small annotation text (very dim, almost subliminal) — numbers, labels
- Circle callouts that zoom-link to detail areas
- All lines draw with a visible "pen" progression — not instant appearance

**Why Projects:** Projects = things being built. Blueprints are the plan before the thing. The visual language of engineering and making.

### 7. Flow (Gallery) — KEEP

Untouched. User's favourite. Fluid particle motion with custom noise field.

### 8. Soundwave (Audio) — KEEP

Untouched. Animated waveform with frequency visualisation. Thematically perfect.

### 9. Radar (Search) — NEW

**Concept:** A rotating radar sweep beam illuminating scattered signal points as it passes. Points glow briefly then fade back to dark.

**Visual language:**
- Centre point slightly above centre of canvas
- Thin radial line (the sweep beam) rotating clockwise at ~6 seconds per revolution
- Trailing glow behind the beam: a wedge-shaped gradient (10-15 degrees wide) that fades
- 20-40 static points scattered across the canvas at random positions (seeded per page load)
- As the beam passes over each point, it flares bright then decays exponentially over ~2 seconds
- Points have varying sizes (1-3px) — some are strong signals, some weak
- Faint concentric range rings (3-4) at equal intervals from centre, very dim
- Optional: a few points slowly drift position (the content you're looking for isn't fixed)

**Why Search:** Search = scanning for signals in a field of possibilities. Radar is the mechanical version of "looking for something."

### 10. Entropy (404) — NEW

**Concept:** A perfect geometric grid that's disintegrating. Tiles crack, fragment, drift apart, dissolve into particles. The page you wanted was here, once.

**Visual language:**
- Start with a perfect grid of small square tiles (8-12px, filling the canvas)
- Each tile has a "stability" value. Over time, stability decays from a random seed point outward
- Unstable tiles: first crack (a line across the tile), then split into 2-4 fragments, then fragments drift outward with slight rotation, then fragments dissolve into particles
- The dissolution wave spreads outward from 2-3 seed points, creating organic holes in the grid
- Fragments occasionally glitch: flicker between positions, show scan lines, invert briefly
- Some tiles at the edge of dissolution try to reassemble — slide back toward grid position, then fail and scatter
- After ~80% dissolution, the whole field slowly resets (tiles reform from particles) and the cycle repeats
- Grid lines in muted tone, fragments in accent

**Why 404:** The page is broken. The structure that held it has failed. This is what structural failure looks like — orderly to disordered.

### 11. Cipher (Privacy) — NEW

**Concept:** Columns of characters continuously encrypting and decrypting. Not Matrix green — copper characters on dark surface.

**Visual language:**
- 20-30 columns of monospace characters, each column independently cycling
- Characters: mix of alphanumeric, symbols, and occasional Unicode glyphs
- Each column has a "plaintext window" — a 3-5 character section that briefly resolves to readable text (fragments of words: "priv", "lock", "safe", "hash", "key") then scrambles back
- The plaintext window moves down each column at varying speeds
- Character colour: accent at varying opacity (brighter for "resolving" characters, dimmer for scrambled)
- Occasionally a full row briefly locks: all columns show a coherent character simultaneously, with a subtle horizontal line connecting them (the locked state)
- Speed varies per column — some cycling fast, some slow, some pausing
- Overall effect: data being protected. Encryption in motion.

**Why Privacy:** Privacy policy = data protection. This is what encryption looks like at the character level.

### 12. Orbit (Now) — NEW

**Concept:** Concentric orbital rings at different speeds. Inner rings fast, outer rings slow. Objects trace elliptical paths leaving comet-like trails.

**Visual language:**
- Centre point at canvas centre
- 4-6 concentric elliptical orbits (slightly eccentric, not perfect circles — eccentricity 0.1-0.3)
- Each orbit tilted at a slightly different angle (simulating 3D orbital planes viewed from above)
- One object per orbit: a bright dot (2-4px) with a fading trail (20-40 frames of history)
- Inner orbits: fast (2-3 second period), bright, short trails
- Outer orbits: slow (8-12 second period), dimmer, longer trails
- Orbit paths drawn as very faint ellipses (barely visible guide lines)
- When two objects align radially (conjunction): a brief connecting line flashes between them
- Trail colour: accent fading to transparent

**Why Now:** "Now" = the current moment in multiple timescales. Orbital mechanics = things happening at different speeds simultaneously. What you're doing today (inner orbit) vs. this quarter (outer orbit).

### 13. Loom (Colophon) — NEW

**Concept:** Warp and weft threads interlacing in real-time. The colophon is about how the site is made — this is fabrication made literal.

**Visual language:**
- Vertical warp threads: 20-30 thin lines spanning the canvas height, evenly spaced, very faint
- Horizontal weft threads: animated, appearing from the left edge and weaving through the warp
- Each weft thread goes over-under-over-under the warp threads (visible displacement)
- New weft threads appear every ~1 second, building up the textile from top to bottom
- Different weave patterns cycle: plain (over 1, under 1), twill (over 2, under 1, shifting), satin (over 4, under 1)
- Thread colours alternate between accent and muted in the weft; warp is always very dim
- When the fabric is ~70% complete, it slowly fades and a new pattern begins
- Subtle: thread tension visible — slight curves where threads cross, not perfectly straight

**Why Colophon:** The colophon tells you how the thing was made. Weaving is the most fundamental form of fabrication — thread by thread, warp and weft, the structure emerges from simple rules.

### 14. Pulse (Activity) — NEW

**Concept:** A network graph where nodes pulse with activity. Bright flares propagate along edges to connected nodes. A living nervous system viewed from above.

**Visual language:**
- 15-25 nodes scattered across the canvas (positions seeded, not random per frame)
- Edges connect nearby nodes (Delaunay-ish, or simple proximity threshold)
- Nodes are small circles (3-5px), edges are thin lines (0.5-1px), both in muted accent
- Periodically (every 0.5-2 seconds), a random node "fires": it flares bright (scale up to 8px, full accent opacity) then decays
- The firing propagates along connected edges: a bright dot travels along the edge to the connected node, which then fires with slightly reduced intensity
- Propagation depth: 2-3 hops from the initial fire, each hop dimmer
- Multiple fires can be active simultaneously, creating rippling cascades
- Some nodes fire more frequently than others (they're "hotter" — more active repos)
- Occasionally a new edge appears (connection forming) or an old edge fades (connection going quiet)

**Why Activity:** Activity = contribution pulses across repos. This is a living system — things firing, signals propagating, work happening across a connected network.

### 15. Stream (Analytics) — NEW

**Concept:** Parallel horizontal streams of varying width flowing left to right. Streams split, merge, narrow, widen. A living Sankey diagram.

**Visual language:**
- 5-8 horizontal streams flowing left to right across the canvas
- Each stream is a filled band (not a line) with soft edges
- Stream width varies smoothly over time (sinusoidal modulation + noise)
- Streams occasionally split: one stream becomes two thinner ones that drift apart vertically
- Streams occasionally merge: two nearby streams converge and combine width
- Flow speed is visible via subtle particle dots riding the streams (20-30 particles total)
- Colour intensity correlates with stream width (wider = brighter = more traffic)
- Vertical position of each stream drifts slowly (the rivers meander)
- Overall flow direction is left-to-right, but individual particles have slight vertical wobble

**Why Analytics:** Analytics = traffic flow, user journeys, data moving through the system. Streams are the visual metaphor for flow volume over time.

### 16. Crystallise (New/Recent) — NEW

**Concept:** Crystal structures nucleating from seed points and growing outward in geometric dendritic patterns. Things coming into being.

**Visual language:**
- Start with 1-2 seed points at random positions
- From each seed, branches grow outward at 60-degree angles (hexagonal crystal system)
- Growth is incremental — extend 2-3px per frame along a branch, with slight random deviation
- Sub-branches spawn at regular intervals (every 15-20px) at ±60 degrees
- Branch thickness decreases with each generation (main stem 2px, first branch 1.5px, second 1px, tips 0.5px)
- Colour: accent with opacity increasing toward the growth tips (bright where it's actively growing, settled where it's done)
- When a crystal reaches ~30% of canvas area, growth slows and the structure begins to fade
- A new seed nucleates elsewhere before the old one fully dissolves — always something forming
- Optional: tiny sparkle points at the active growth tips

**Why New:** The "New" page shows recent content. Crystallisation = emergence, things forming from nothing, structure appearing where there was none. New content nucleating.

## Pages Requiring Layout Changes

The following pages currently have **no hero section** and need the full-viewport hero wrapper added:

- `src/pages/search.astro` — add hero with Radar animation + search box below
- `src/pages/404.astro` — add hero with Entropy animation + error message overlay
- `src/pages/privacy.astro` — **page does not exist yet**; create it with hero (Cipher animation) + privacy policy content (separate content task — the animation implementer creates the page shell with placeholder text, content is filled in a follow-up)
- `src/pages/colophon.astro` — add hero with Loom
- `src/pages/now.astro` — add hero with Orbit
- `src/pages/activity/index.astro` — add hero with Pulse
- `src/pages/analytics/index.astro` — add hero with Stream
- `src/pages/new/index.astro` — add hero with Crystallise

Each follows the existing pattern:
```html
<div class="flex min-h-[100dvh] items-center relative">
  <HeroCanvas animation="radar" />
  <div class="relative z-10 ...">
    <!-- page title + subtitle -->
  </div>
</div>
```

## Implementation Approach

### HeroCanvas.astro Changes

1. Update the `Props` interface to include all new animation names
2. **Remove** three unused animations: `roots`, `spores`, `erosion` (defined but not used by any page — dead code)
3. **Remove** `mycelium` and `fern` and `neural` (replaced by forge, signal, ink)
4. Add each new animation as an IIFE in the `ANIMATIONS` registry
5. Update `ANIM_KEYS` array to list only active animations: `terrain`, `forge`, `strata`, `signal`, `ink`, `blueprint`, `flow`, `soundwave`, `radar`, `entropy`, `cipher`, `orbit`, `loom`, `pulse`, `stream`, `crystallise`
6. Home page (`index.astro`) gets `animation="terrain"` instead of no prop (which triggers auto-rotate)
7. Projects page (`projects/index.astro`) gets `animation="blueprint"` replacing `animation="mycelium"`
8. Services page (`services.astro`) gets `animation="forge"` replacing `animation="mycelium"`

### Canvas Coordinate Note

The `frame` function receives CSS-pixel `w`/`h` but the canvas is scaled by `dpr`. All pixel sizes in animation specs (e.g., "8-12px tiles", "15-20px grid") refer to CSS pixels. Implementations must account for `dpr` when drawing (the existing `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` in `initCanvas` handles this — draw in CSS pixels and the transform scales to device pixels).

### File Size Consideration

HeroCanvas.astro is currently 1,191 lines. Removing 6 animations (~600 lines) and adding 10 new ones (~100-200 lines each, with complex animations like Entropy and Forge at the higher end) nets to roughly 1,600-2,500 lines. Consider:

- **Option A:** Keep everything in one file (simpler, current pattern, inline script)
- **Option B:** Split animation definitions into a separate `hero-animations.js` file imported by the inline script

Recommend **Option A** for now — the inline script pattern is critical for View Transitions compatibility, and splitting introduces module loading complexity. If the file becomes unwieldy during implementation, refactor then.

### Testing

- Visual testing: run `npm run dev` and visit every page
- Performance: check frame rate stays above 30fps on M1 8GB (the adaptive quality system handles this, but verify)
- Theme: toggle light/dark mode on every page
- Reduced motion: verify animations respect `prefers-reduced-motion`
- View Transitions: navigate between pages and verify animations initialise correctly on swap

## Out of Scope

- Detail pages (blog/project/gallery/audio slug pages) — these use breadcrumb headers, not hero sections. Adding heroes would push content below the fold on content-focused pages.
- Blog tag pages — same reasoning as detail pages
- WebGL / Three.js — staying with Canvas 2D for consistency and bundle size
