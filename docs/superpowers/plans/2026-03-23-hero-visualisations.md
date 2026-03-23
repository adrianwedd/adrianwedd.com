# Hero Visualisations Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace and expand hero section canvas animations across the site — 10 new animations, 6 removed, 8 pages gain full-viewport heroes.

**Architecture:** All animations live in `src/components/HeroCanvas.astro` as IIFEs in an `ANIMATIONS` registry. Each returns `{ init, frame, cleanup }`. Pages include `<HeroCanvas animation="name" />` inside a `<section class="relative flex min-h-[100dvh] items-center">` wrapper. The `is:inline` script pattern is required for Astro View Transitions compatibility.

**Tech Stack:** Astro 5, Canvas 2D API, CSS custom properties for theming, no external libraries.

**Spec:** `docs/superpowers/specs/2026-03-23-hero-visualisations-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/HeroCanvas.astro` | Modify | Remove 6 animations, add 10 new, update Props + ANIM_KEYS |
| `src/pages/index.astro:128` | Modify | Add `animation="terrain"` prop (was auto-rotating) |
| `src/pages/about.astro:53` | Modify | Change `animation="terrain"` → `animation="strata"` |
| `src/pages/services.astro:198` | Modify | Change `animation="mycelium"` → `animation="forge"` |
| `src/pages/contact.astro:18` | Modify | Change `animation="fern"` → `animation="signal"` |
| `src/pages/blog/index.astro:41` | Modify | Change `animation="neural"` → `animation="ink"` |
| `src/pages/projects/index.astro:88` | Modify | Change `animation="mycelium"` → `animation="blueprint"` |
| `src/pages/search.astro` | Modify | Add full-viewport hero with `animation="radar"` |
| `src/pages/404.astro` | Modify | Add full-viewport hero with `animation="entropy"` |
| `src/pages/privacy.astro` | Create | New page with hero (`animation="cipher"`) + placeholder content |
| `src/pages/colophon.astro` | Modify | Add full-viewport hero with `animation="loom"` |
| `src/pages/now.astro` | Modify | Add full-viewport hero with `animation="orbit"` |
| `src/pages/activity/index.astro` | Modify | Add full-viewport hero with `animation="pulse"` |
| `src/pages/analytics/index.astro` | Modify | Add full-viewport hero with `animation="stream"` |
| `src/pages/new/index.astro` | Modify | Add full-viewport hero with `animation="crystallise"` |

## Key References

- **Animation pattern:** Each animation is an IIFE at `ANIMATIONS.<name> = (function () { ... })();` returning `{ init, frame, cleanup }`.
- **init signature:** `function init(cw, ch, colors)` — CSS-pixel dimensions + theme colours object
- **frame signature:** `function frame(ctx, cw, ch, t, colors, quality)` — context (pre-scaled by dpr), CSS-pixel dims, timestamp (ms), colours, quality (0–1)
- **colours object:** `{ accent, surface, muted, border }` — read from CSS custom properties via `readColors()`
- **Hero markup pattern** (from `about.astro`):
  ```html
  <section class="relative flex min-h-[100dvh] items-center px-4 sm:px-6 lg:px-8">
    <div class="relative z-10 mx-auto max-w-3xl">
      <h1 class="text-text">Title</h1>
    </div>
    <HeroCanvas animation="name" />
  </section>
  ```
- **Noise function:** `noise3D(x, y, z)` is available globally within the HeroCanvas script (lines 44–97).
- **Existing animation line ranges:** mycelium 114–225, fern 227–315, flow 316–383, roots 384–478, neural 479–642, terrain 643–736, spores 737–823, erosion 824–947, soundwave 948–990.

---

## Task 1: Remove unused animations (roots, spores, erosion)

**Files:**
- Modify: `src/components/HeroCanvas.astro:384-478` (roots), `:737-823` (spores), `:824-947` (erosion)
- Modify: `src/components/HeroCanvas.astro:992` (ANIM_KEYS)

- [ ] **Step 1:** Delete `ANIMATIONS.roots` IIFE block (lines 384–478)
- [ ] **Step 2:** Delete `ANIMATIONS.spores` IIFE block (lines 737–823, adjusted after step 1)
- [ ] **Step 3:** Delete `ANIMATIONS.erosion` IIFE block (lines 824–947, adjusted after steps 1–2)
- [ ] **Step 4:** Remove `'erosion'` from the `ANIM_KEYS` array (roots and spores weren't in it)
- [ ] **Step 5:** Run `npm run build` to verify no errors

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 6:** Commit

```bash
git add src/components/HeroCanvas.astro
git commit -m "refactor: remove unused hero animations (roots, spores, erosion)"
```

---

## Task 2: Remove replaced animations (mycelium, fern, neural)

**Files:**
- Modify: `src/components/HeroCanvas.astro` — remove IIFE blocks for mycelium, fern, neural
- Modify: `src/components/HeroCanvas.astro` — remove from ANIM_KEYS

- [ ] **Step 1:** Delete `ANIMATIONS.mycelium` IIFE block (originally lines 114–225)
- [ ] **Step 2:** Delete `ANIMATIONS.fern` IIFE block (originally lines 227–315)
- [ ] **Step 3:** Delete `ANIMATIONS.neural` IIFE block (originally lines 479–642)
- [ ] **Step 4:** Remove `'mycelium'`, `'fern'`, `'neural'` from `ANIM_KEYS`

After this step, `ANIM_KEYS` should be: `['terrain', 'flow', 'soundwave']`

- [ ] **Step 5:** Update `Props` interface to remove old names:

```typescript
interface Props {
  animation?: 'terrain' | 'flow' | 'soundwave';
}
```

(This is temporary — we'll expand it as we add new animations.)

- [ ] **Step 6:** Temporarily update page props to prevent build errors (pages still referencing removed animations):

In `src/pages/services.astro:198`: Change `animation="mycelium"` → remove the animation prop entirely (will use placeholder/terrain fallback until forge is built)

In `src/pages/contact.astro:18`: Change `animation="fern"` → remove animation prop

In `src/pages/blog/index.astro:41`: Change `animation="neural"` → remove animation prop

In `src/pages/projects/index.astro:88`: Change `animation="mycelium"` → remove animation prop

- [ ] **Step 7:** Run `npm run build` to verify no errors

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 8:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/services.astro src/pages/contact.astro src/pages/blog/index.astro src/pages/projects/index.astro
git commit -m "refactor: remove replaced hero animations (mycelium, fern, neural)"
```

---

## Task 3: Refine terrain + lock Home to terrain

**Files:**
- Modify: `src/components/HeroCanvas.astro` — enhance terrain animation
- Modify: `src/pages/index.astro:128` — add `animation="terrain"`

- [ ] **Step 1:** Read the current terrain implementation (should be around line 643 area, adjusted for deletions from tasks 1–2). Understand what it currently does.

- [ ] **Step 2:** Enhance the terrain animation per spec. The refined terrain should add:
  - Elevation-dependent colour intensity (higher ridges = brighter accent)
  - 30–50 particles tracing contour lines (flowing downhill)
  - Occasional tectonic shift event (2–3 seconds of faster noise evolution)
  - Contour line thickness varying with gradient steepness

Key implementation detail: The existing terrain uses `noise3D` noise. Add a time dimension to the noise sampling (`noise3D(x * scale, y * scale, t * 0.0001)`) to make contours breathe. Add particles as an array of `{x, y, vx, vy}` that follow the gradient field downhill.

- [ ] **Step 3:** In `src/pages/index.astro:128`, change:

```html
<!-- Before -->
<HeroCanvas />
<!-- After -->
<HeroCanvas animation="terrain" />
```

- [ ] **Step 4:** Run `npm run dev`, visit `localhost:4321`, verify terrain animation is visible and locked (no auto-rotation). Toggle light/dark mode. Check it looks refined.

- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/index.astro
git commit -m "feat: refine terrain animation, lock to homepage"
```

---

## Task 4: Add Strata animation (About page)

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.strata` IIFE
- Modify: `src/components/HeroCanvas.astro` — add `'strata'` to Props + ANIM_KEYS
- Modify: `src/pages/about.astro:53` — change prop

- [ ] **Step 1:** Add `ANIMATIONS.strata` IIFE after the terrain animation block. Structure:

```javascript
ANIMATIONS.strata = (function () {
  var w, h, col;
  var bands = [];    // { y, thickness, textureType, hue, faultOffset }
  var faultX = -1;   // x position of active fault, -1 = none
  var faultTimer = 0;

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    bands = [];
    var bandCount = 10;
    var bandH = h / bandCount;
    for (var i = 0; i < bandCount; i++) {
      bands.push({
        y: i * bandH,
        thickness: bandH,
        textureType: i % 4,  // 0=stipple, 1=crosshatch, 2=wavy, 3=dots
        opacity: 0.08 + Math.random() * 0.12,
        faultOffset: 0
      });
    }
    faultX = -1; faultTimer = 0;
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    ctx.clearRect(0, 0, w, h);

    var bandCount = Math.floor(bands.length * Math.max(0.5, quality));

    // Slow compression animation
    var compress = Math.sin(t * 0.0002) * 0.02;

    for (var i = 0; i < bandCount; i++) {
      var b = bands[i];
      var by = b.y + compress * i * 3;
      var bh = b.thickness - compress * 2;

      // Fault displacement
      var offset = b.faultOffset;

      ctx.save();
      ctx.globalAlpha = b.opacity;

      // Draw band fill
      ctx.fillStyle = col.accent;
      ctx.fillRect(0, by + offset, w, bh);

      // Draw procedural texture per band type
      if (quality > 0.5) {
        ctx.strokeStyle = col.accent;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = b.opacity * 0.5;

        if (b.textureType === 0) {
          // Stipple
          for (var sx = 0; sx < w; sx += 8) {
            for (var sy = by + offset; sy < by + offset + bh; sy += 6) {
              if (Math.random() > 0.6) {
                ctx.fillRect(sx, sy, 1, 1);
              }
            }
          }
        } else if (b.textureType === 1) {
          // Cross-hatch
          for (var cx = -bh; cx < w; cx += 12) {
            ctx.beginPath();
            ctx.moveTo(cx, by + offset);
            ctx.lineTo(cx + bh, by + offset + bh);
            ctx.stroke();
          }
        } else if (b.textureType === 2) {
          // Wavy lines
          for (var wy = by + offset + 4; wy < by + offset + bh - 4; wy += 8) {
            ctx.beginPath();
            for (var wx = 0; wx < w; wx += 3) {
              var wvy = wy + Math.sin(wx * 0.05 + t * 0.001 + i) * 2;
              wx === 0 ? ctx.moveTo(wx, wvy) : ctx.lineTo(wx, wvy);
            }
            ctx.stroke();
          }
        } else {
          // Dot pattern
          for (var dx = 3; dx < w; dx += 10) {
            for (var dy = by + offset + 3; dy < by + offset + bh - 3; dy += 8) {
              ctx.beginPath();
              ctx.arc(dx, dy, 1, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.restore();
    }

    // Fault line event (every ~15 seconds)
    faultTimer++;
    if (faultTimer > 900 && faultX < 0) {
      faultX = Math.random() * w;
      faultTimer = 0;
      // Shift some bands
      for (var fi = 0; fi < bands.length; fi++) {
        if (fi % 2 === 0) bands[fi].faultOffset = (Math.random() - 0.5) * 4;
      }
    }
    // Settle fault offsets back to 0
    for (var si = 0; si < bands.length; si++) {
      bands[si].faultOffset *= 0.98;
    }

    // Core glow at bottom
    var glow = ctx.createLinearGradient(0, h - 30, 0, h);
    glow.addColorStop(0, 'transparent');
    glow.addColorStop(1, col.accent);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = glow;
    ctx.fillRect(0, h - 30, w, 30);
    ctx.globalAlpha = 1;
  }

  function cleanup() { bands = []; }
  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2:** Add `'strata'` to `ANIM_KEYS` and the `Props` interface type union.

- [ ] **Step 3:** In `src/pages/about.astro:53`, change `animation="terrain"` → `animation="strata"`

- [ ] **Step 4:** Run `npm run dev`, visit `/about`, verify strata renders with visible geological layers, textures, and occasional fault shifts. Toggle theme.

- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/about.astro
git commit -m "feat: add strata animation for about page hero"
```

---

## Task 5: Add Forge animation (Services page)

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.forge`
- Modify: `src/pages/services.astro:198` — add `animation="forge"`

- [ ] **Step 1:** Add `ANIMATIONS.forge` IIFE. Key structure:

- Array of 6–10 stream objects: `{ y, width, coolProgress, speed }`
- Each stream draws as a horizontal band with colour transitioning from bright accent (high alpha, lighter) to dim accent (low alpha, mixed with surface)
- `coolProgress` advances left-to-right per frame at `speed`
- When fully cooled, draw hairline fracture lines (random angles) on cooled sections
- After all streams fully cool, fade out and reinitialise
- Quality scaling: reduce stream count below quality 0.7

Colour derivation — all from `colors.accent`:
- Hot: `colors.accent` at alpha 0.8
- Cooling: `colors.accent` at alpha 0.4
- Cooled: `colors.accent` at alpha 0.1 blended toward `colors.surface`
- Parse accent RGB with a helper: `function parseRGB(c) { ... }` to extract r,g,b for interpolation

- [ ] **Step 2:** Add `'forge'` to ANIM_KEYS and Props.

- [ ] **Step 3:** In `src/pages/services.astro:198`, add `animation="forge"`

- [ ] **Step 4:** Visual test: `npm run dev`, visit `/services`. Verify molten streams animate and cool. Toggle theme.

- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/services.astro
git commit -m "feat: add forge animation for services page hero"
```

---

## Task 6: Add Signal animation (Contact page)

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.signal`
- Modify: `src/pages/contact.astro:18` — add `animation="signal"`

- [ ] **Step 1:** Add `ANIMATIONS.signal` IIFE. Key structure:

- Two emitter points (1/3 and 2/3 width)
- Array of wavefront objects: `{ emitter, radius, maxRadius, born }`
- New wavefront spawned every ~60 frames per emitter
- Each wavefront draws as a partial arc (randomised start/end angles, ~120–240 degree arcs)
- Alpha decreases with radius (inverse square approximation: `alpha = baseAlpha / (1 + radius * 0.01)`)
- Line thickness modulated sinusoidally along the arc
- Where wavefronts from different emitters overlap within ~5px: draw brighter node point
- Quality scaling: reduce max active wavefronts

- [ ] **Step 2:** Add `'signal'` to ANIM_KEYS and Props.
- [ ] **Step 3:** In `src/pages/contact.astro:18`, add `animation="signal"`
- [ ] **Step 4:** Visual test at `/contact`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/contact.astro
git commit -m "feat: add signal animation for contact page hero"
```

---

## Task 7: Add Ink animation (Blog page)

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.ink`
- Modify: `src/pages/blog/index.astro:41` — add `animation="ink"`

- [ ] **Step 1:** Add `ANIMATIONS.ink` IIFE. Key structure:

- Array of drop objects: `{ x, y, radius, maxRadius, age, seed }`
- 2–4 active drops at a time
- Radius grows each frame with noise-modulated edge: `r + noise3D(angle * 3, seed, t * 0.001) * r * 0.3`
- Draw each drop as radial gradient: accent at 20% opacity centre → transparent edge
- Use `globalCompositeOperation = 'lighter'` when drawing drops, reset to `'source-over'` after
- Mirror each drop across canvas vertical midpoint (slightly offset ±10px for imperfection)
- When drop reaches maxRadius, begin fading (reduce alpha over 120 frames)
- Spawn new drop when an old one fully fades
- Quality scaling: reduce drop count, skip mirroring below 0.5

- [ ] **Step 2:** Add `'ink'` to ANIM_KEYS and Props.
- [ ] **Step 3:** In `src/pages/blog/index.astro:41`, add `animation="ink"`
- [ ] **Step 4:** Visual test at `/blog`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/blog/index.astro
git commit -m "feat: add ink animation for blog page hero"
```

---

## Task 8: Add Blueprint animation (Projects page)

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.blueprint`
- Modify: `src/pages/projects/index.astro:88` — add `animation="blueprint"`

- [ ] **Step 1:** Add `ANIMATIONS.blueprint` IIFE. Key structure:

- Background grid: thin lines every 20px in `colors.border` at alpha 0.15
- Drawing sequence state machine: `{ lines: [{x1,y1,x2,y2,progress}], phase, timer }`
- 4 sequence types cycling: floor plan (rectangles), elevation (stepped profile), cross-section (nested shapes), detail callout (circle + lines)
- Each line has a `progress` (0–1) that advances per frame — draw only `progress` fraction of the line (pen drawing effect)
- Colour: derive a cooler tone from `colors.muted` at alpha 0.5
- Dimension lines: short perpendicular ticks at each end, very dim
- After sequence completes (~8s), fade out over 1s, start next sequence
- Quality scaling: reduce grid density, skip dimension lines below 0.5

- [ ] **Step 2:** Add `'blueprint'` to ANIM_KEYS and Props.
- [ ] **Step 3:** In `src/pages/projects/index.astro:88`, add `animation="blueprint"`
- [ ] **Step 4:** Visual test at `/projects`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/projects/index.astro
git commit -m "feat: add blueprint animation for projects page hero"
```

---

## Task 9: Add Radar animation + Search page hero

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.radar`
- Modify: `src/pages/search.astro` — add full-viewport hero section

- [ ] **Step 1:** Add `ANIMATIONS.radar` IIFE. Key structure:

- Centre point at `(w/2, h*0.45)`
- 30 scattered signal points: `{ x, y, size, lastHit }` — positions seeded in init
- Sweep angle advances: `angle = t * 0.001` (~6s per revolution)
- Draw sweep beam: line from centre to edge at `angle`, with wedge gradient trailing 12 degrees behind
- For each point, check if sweep angle just passed over it — if so, set `lastHit = t`
- Point brightness: `Math.exp(-(t - lastHit) * 0.003)` (exponential decay over ~2s)
- 3 faint range rings at equal intervals: `ctx.arc(cx, cy, r, 0, 2*PI)` at alpha 0.05
- Quality scaling: reduce point count

- [ ] **Step 2:** Add `'radar'` to ANIM_KEYS and Props.

- [ ] **Step 3:** Modify `src/pages/search.astro` — add hero section. Add `import HeroCanvas from '../components/HeroCanvas.astro';` at top. Wrap existing content, adding hero section before the search box:

```html
<section class="relative flex min-h-[100dvh] items-center px-4 sm:px-6 lg:px-8">
  <div class="relative z-10 mx-auto max-w-3xl">
    <h1 class="text-text">Search</h1>
    <p class="mt-2 text-text-muted">Find anything across the site.</p>
  </div>
  <HeroCanvas animation="radar" />
</section>
```

Keep the existing search box / Pagefind content below the hero section.

- [ ] **Step 4:** Visual test at `/search`. Verify hero renders + search still functions below.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/search.astro
git commit -m "feat: add radar animation + hero section for search page"
```

---

## Task 10: Add Entropy animation + 404 page hero

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.entropy`
- Modify: `src/pages/404.astro` — add full-viewport hero section

- [ ] **Step 1:** Add `ANIMATIONS.entropy` IIFE. Key structure:

- Grid of tile objects: `{ x, y, size, stability, fragments, state }` — state: 'intact'|'cracked'|'fragmenting'|'dissolved'
- Tile size: 10px, count scaled by quality
- 2–3 seed points that erode outward (stability decreases by proximity to seeds)
- Per frame: tiles with stability < 0.7 → 'cracked' (draw diagonal line), < 0.3 → 'fragmenting' (split into 2–4 sub-rects that drift outward with rotation), < 0 → 'dissolved' (skip drawing)
- Fragments drift: each has `{dx, dy, rotation, alpha}` — drift velocity, spin, fading
- Glitch effect: 5% of fragmenting tiles per frame flicker (draw at offset position for 1 frame)
- After 80% dissolved, slowly reform (reverse the process over ~5s), then restart
- Quality scaling: increase tile size (fewer tiles), skip fragment physics below 0.5

- [ ] **Step 2:** Add `'entropy'` to ANIM_KEYS and Props.

- [ ] **Step 3:** Modify `src/pages/404.astro` — wrap existing 404 content in hero section:

```html
<section class="relative flex min-h-[100dvh] items-center px-4 sm:px-6 lg:px-8">
  <div class="relative z-10 mx-auto max-w-3xl text-center">
    <!-- existing 404 content (heading, description, links) -->
  </div>
  <HeroCanvas animation="entropy" />
</section>
```

- [ ] **Step 4:** Visual test at any non-existent URL (e.g., `/nonexistent`). Verify grid dissolves and 404 content is readable.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/404.astro
git commit -m "feat: add entropy animation + hero section for 404 page"
```

---

## Task 11: Add Cipher animation + Privacy page

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.cipher`
- Create: `src/pages/privacy.astro` — new page with hero + placeholder content

- [ ] **Step 1:** Add `ANIMATIONS.cipher` IIFE. Key structure:

- Column count: `Math.floor(w / 16)`, each column independently cycling
- Character set: `'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(){}[]<>?'`
- Plaintext fragments: `['priv', 'lock', 'safe', 'hash', 'key', 'seal', 'gate', 'mask']`
- Each column: `{ chars: [], speed, plaintextWindow, plaintextPos }`
- Per frame: cycle characters by advancing each column's char index at its speed
- Plaintext window: 3–5 consecutive chars briefly resolve to a fragment, then scramble
- Draw with `ctx.fillText` using monospace sizing — `colors.accent` at varying alpha (bright for resolving, dim for scrambled)
- Occasional row lock: every ~300 frames, one row flashes brighter with a horizontal line
- Quality scaling: reduce column count, increase character size

- [ ] **Step 2:** Add `'cipher'` to ANIM_KEYS and Props.

- [ ] **Step 3:** Create `src/pages/privacy.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import HeroCanvas from '../components/HeroCanvas.astro';
---

<BaseLayout title="Privacy" description="How this site handles your data.">
  <section class="relative flex min-h-[100dvh] items-center px-4 sm:px-6 lg:px-8">
    <div class="relative z-10 mx-auto max-w-3xl">
      <h1 class="text-text">Privacy</h1>
      <p class="mt-2 text-text-muted">How this site handles your data.</p>
    </div>
    <HeroCanvas animation="cipher" />
  </section>

  <article class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="space-y-6 leading-relaxed text-text">
      <h2>Data Collection</h2>
      <p class="text-text-muted">
        This site uses Google Analytics 4, gated behind a consent banner.
        No tracking occurs before you grant consent. No data is sold or shared
        with third parties beyond Google Analytics.
      </p>

      <h2>Cookies</h2>
      <p class="text-text-muted">
        Two cookies are used: a theme preference (localStorage) and an analytics
        consent flag (localStorage). GA4 sets its own cookies only after consent.
      </p>

      <h2>Contact</h2>
      <p class="text-text-muted">
        Questions about privacy? <a href="/contact" class="text-accent hover:underline">Get in touch</a>.
      </p>
    </div>
  </article>
</BaseLayout>
```

- [ ] **Step 4:** Visual test at `/privacy`. Verify cipher animation renders and page content is readable.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/privacy.astro
git commit -m "feat: add cipher animation + privacy page with hero"
```

---

## Task 12: Add Orbit animation + Now page hero

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.orbit`
- Modify: `src/pages/now.astro` — add hero section

- [ ] **Step 1:** Add `ANIMATIONS.orbit` IIFE. Key structure:

- 5 orbits: `{ semiMajor, eccentricity, tilt, period, trailHistory: [] }`
- Parametric ellipse: `x = cx + semiMajor * cos(angle) * cos(tilt) - semiMinor * sin(angle) * sin(tilt)`
- Inner orbits: period 2–3s, outer: 8–12s
- Each orbit's object traces a trail (store last 30 positions)
- Draw orbit guide as very faint ellipse (alpha 0.04)
- Draw trail as connected line segments fading from bright to transparent
- Draw object as bright dot (3px) at current position
- Conjunction detection: when two objects are within 15 degrees of radial alignment, flash a faint connecting line
- Quality scaling: reduce trail length, skip conjunction detection below 0.5

- [ ] **Step 2:** Add `'orbit'` to ANIM_KEYS and Props.
- [ ] **Step 3:** Modify `src/pages/now.astro` — add hero section before existing content (same pattern as other pages). Import HeroCanvas, wrap heading in hero section.
- [ ] **Step 4:** Visual test at `/now`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/now.astro
git commit -m "feat: add orbit animation + hero section for now page"
```

---

## Task 13: Add Loom animation + Colophon page hero

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.loom`
- Modify: `src/pages/colophon.astro` — add hero section

- [ ] **Step 1:** Add `ANIMATIONS.loom` IIFE. Key structure:

- Warp threads: `warpCount = Math.floor(w / 25)` vertical lines, very faint
- Weft threads: array of `{ y, progress, pattern, colour }` — progress 0→1 across width
- New weft added every ~60 frames at the next y position
- Each weft draws over/under warp threads: offset y by ±2px at each crossing based on pattern
- Patterns cycle: plain (alternate every warp), twill (shift by 1 each row), satin (over 4, under 1)
- Thread colour alternates between `colors.accent` and `colors.muted` at alpha 0.2
- When fabric reaches ~70% of height, fade all threads and restart
- Quality scaling: reduce warp density

- [ ] **Step 2:** Add `'loom'` to ANIM_KEYS and Props.
- [ ] **Step 3:** Modify `src/pages/colophon.astro` — add hero section.
- [ ] **Step 4:** Visual test at `/colophon`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/colophon.astro
git commit -m "feat: add loom animation + hero section for colophon page"
```

---

## Task 14: Add Pulse animation + Activity page hero

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.pulse`
- Modify: `src/pages/activity/index.astro` — add hero section

- [ ] **Step 1:** Add `ANIMATIONS.pulse` IIFE. Key structure:

- 20 nodes: `{ x, y, brightness, cooldown }` — positions seeded in init (spread across canvas)
- Edges: compute in init — connect nodes within proximity threshold (~200px), store as `{ from, to }`
- Active fires: array of `{ node, startTime, hops }` — propagation events
- Every 30–90 frames (random), pick a random node and fire it (set brightness = 1)
- Fire propagates along edges: spawn new fire at connected node after 15 frames, with dimmer intensity (0.7× per hop), max 3 hops
- Draw edges as thin lines (alpha 0.06), nodes as circles
- Node brightness decays: `brightness *= 0.97` per frame
- Quality scaling: reduce node count, max hops

- [ ] **Step 2:** Add `'pulse'` to ANIM_KEYS and Props.
- [ ] **Step 3:** Modify `src/pages/activity/index.astro` — add hero section.
- [ ] **Step 4:** Visual test at `/activity`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/activity/index.astro
git commit -m "feat: add pulse animation + hero section for activity page"
```

---

## Task 15: Add Stream animation + Analytics page hero

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.stream`
- Modify: `src/pages/analytics/index.astro` — add hero section

- [ ] **Step 1:** Add `ANIMATIONS.stream` IIFE. Key structure:

- 6 streams: `{ y, width, speed, particles: [] }`
- Each stream's y and width modulated by noise: `y + noise3D(x * 0.005, streamIdx, t * 0.0003) * 30`
- Width modulated: `baseWidth + noise3D(x * 0.003, streamIdx + 10, t * 0.0005) * baseWidth * 0.5`
- Draw each stream as filled path (top edge + bottom edge, both noise-modulated)
- 4–5 particles per stream riding the flow: advance x by speed, wrap around
- Colour: `colors.accent` at alpha proportional to width (wider = brighter)
- Streams occasionally merge (two streams' y values converge) — detect proximity and draw connecting fill
- Quality scaling: reduce particle count, simplify noise (fewer octaves)

- [ ] **Step 2:** Add `'stream'` to ANIM_KEYS and Props.
- [ ] **Step 3:** Modify `src/pages/analytics/index.astro` — add hero section.
- [ ] **Step 4:** Visual test at `/analytics`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/analytics/index.astro
git commit -m "feat: add stream animation + hero section for analytics page"
```

---

## Task 16: Add Crystallise animation + New page hero

**Files:**
- Modify: `src/components/HeroCanvas.astro` — add `ANIMATIONS.crystallise`
- Modify: `src/pages/new/index.astro` — add hero section

- [ ] **Step 1:** Add `ANIMATIONS.crystallise` IIFE. Key structure:

- Crystal objects: `{ seeds: [{ x, y, branches }] }`
- Each branch: `{ x, y, angle, length, maxLength, children, generation }`
- Growth: extend branch by 2px/frame along angle until maxLength reached
- Sub-branches spawn at ±60° every 18px, maxLength decreases with generation
- Branch thickness: `2 - generation * 0.4` (min 0.5)
- Colour: accent at `0.2 + 0.3 * (length / maxLength)` (brighter at growing tips)
- When crystal fills ~30% of canvas, begin fading (global alpha decreases over 120 frames)
- New seed nucleates when old crystal reaches ~50% fade
- Quality scaling: reduce max generation depth, increase spawn interval

- [ ] **Step 2:** Add `'crystallise'` to ANIM_KEYS and Props.
- [ ] **Step 3:** Modify `src/pages/new/index.astro` — add hero section.
- [ ] **Step 4:** Visual test at `/new`. Toggle theme.
- [ ] **Step 5:** Commit

```bash
git add src/components/HeroCanvas.astro src/pages/new/index.astro
git commit -m "feat: add crystallise animation + hero section for new page"
```

---

## Task 17: Final verification + cleanup

**Files:**
- Modify: `src/components/HeroCanvas.astro` — verify final ANIM_KEYS and Props

- [ ] **Step 1:** Verify `ANIM_KEYS` contains exactly these 16 entries in order:

```javascript
var ANIM_KEYS = ['terrain', 'forge', 'strata', 'signal', 'ink', 'blueprint', 'flow', 'soundwave', 'radar', 'entropy', 'cipher', 'orbit', 'loom', 'pulse', 'stream', 'crystallise'];
```

- [ ] **Step 2:** Verify `Props` interface matches:

```typescript
interface Props {
  animation?: 'terrain' | 'forge' | 'strata' | 'signal' | 'ink' | 'blueprint' | 'flow' | 'soundwave' | 'radar' | 'entropy' | 'cipher' | 'orbit' | 'loom' | 'pulse' | 'stream' | 'crystallise';
}
```

- [ ] **Step 3:** Run full build:

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [ ] **Step 4:** Run `npm run dev` and manually verify every page:

| URL | Expected Animation |
|-----|-------------------|
| `/` | terrain (refined, with particles) |
| `/services` | forge (molten streams cooling) |
| `/about` | strata (geological layers) |
| `/contact` | signal (ripple propagation) |
| `/blog` | ink (fluid ink drops) |
| `/projects` | blueprint (technical drawings) |
| `/gallery` | flow (unchanged) |
| `/audio` | soundwave (unchanged) |
| `/search` | radar (sweep beam) |
| `/nonexistent` | entropy (dissolving grid) |
| `/privacy` | cipher (encrypting columns) |
| `/now` | orbit (concentric rings) |
| `/colophon` | loom (weaving threads) |
| `/activity` | pulse (network graph) |
| `/analytics` | stream (data rivers) |
| `/new` | crystallise (crystal growth) |

For each page, verify:
- Animation renders and is visually distinctive
- Light/dark mode toggle works (colours update)
- Content is readable over the canvas (z-index layering correct)
- Gradient overlay fades canvas to surface colour at bottom

- [ ] **Step 5:** Test View Transitions — navigate between pages using links (not browser refresh). Verify animations cleanly initialise on each navigation.

- [ ] **Step 6:** Test reduced motion — in macOS System Settings → Accessibility → Display → Reduce motion. Verify all canvas animations are suppressed.

- [ ] **Step 7:** Commit any final fixes.

```bash
git add -A
git commit -m "feat: complete hero visualisation redesign — 16 animations across all pages"
```
