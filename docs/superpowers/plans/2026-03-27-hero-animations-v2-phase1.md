# Hero Animations v2 — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement shared animation infrastructure and 3 flagship animations (terrain, flow, pulse). Forge is already done.

**Architecture:** Single `HeroCanvas.astro` component with `is:inline` IIFE. Add shared infrastructure (color constants, mouse tracking, surface RGB, render loop trail dispatch) then rewrite terrain, flow, and pulse animations to v2 spec quality. All changes are in one file plus the overlay CSS.

**Tech Stack:** Astro 5, Canvas 2D API, vanilla JS (ES5, `var` only — `is:inline` constraint)

**Spec:** `docs/superpowers/specs/2026-03-26-hero-animations-v2-design.md`

**Current state:** `src/components/HeroCanvas.astro` is 2177 lines. Forge already rewritten with cascade fractures + trail persistence. 15 other animations exist but need upgrading. No test suite — verification is `npm run build` + manual browser check via preview server.

---

### Task 1: Overlay Gradient — Lighten to Let Animations Breathe

**Files:**
- Modify: `src/components/HeroCanvas.astro:15-24` (the `<style>` block)

- [ ] **Step 1: Update the overlay CSS**

Change the `<style>` block from:
```html
<style>
  .hero-canvas-overlay {
    background: linear-gradient(to bottom, transparent 0%, var(--color-surface) 100%);
  }
  @supports (background: color-mix(in srgb, red 50%, blue)) {
    .hero-canvas-overlay {
      background: linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-surface) 40%, transparent) 30%, color-mix(in srgb, var(--color-surface) 70%, transparent) 60%, var(--color-surface) 100%);
    }
  }
</style>
```

To:
```html
<style>
  .hero-canvas-overlay {
    background: linear-gradient(to bottom, transparent 0%, var(--color-surface) 100%);
  }
  @supports (background: color-mix(in srgb, red 50%, blue)) {
    .hero-canvas-overlay {
      background: linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-surface) 25%, transparent) 40%, color-mix(in srgb, var(--color-surface) 55%, transparent) 65%, var(--color-surface) 100%);
    }
  }
</style>
```

Key change: gradient starts later (40% not 30%) and is less opaque (25%/55% not 40%/70%). The `@supports` fallback remains the same simple gradient.

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Visual verification**

Run: `npm run preview -- --port 4322`
Open `http://localhost:4322/` in browser. The terrain animation should be more visible in the middle zone of the hero (where the gradient previously obscured it at 40% opacity, now only 25%).

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "style: lighten hero overlay gradient (25%@40%, 55%@65%)

Let animations breathe — gradient starts later and is less opaque.
Fallback for browsers without color-mix() unchanged."
```

---

### Task 2: Shared Infrastructure — Color Constants, Surface RGB, Mouse System

**Files:**
- Modify: `src/components/HeroCanvas.astro` — shared state section (after line ~43) and render loop

This task adds the shared infrastructure that all v2 animations depend on. Three additions:
1. Color constants (`SECONDARY_RGB`, `TERTIARY_RGB`)
2. Surface RGB parsing (for trail persistence — currently duplicated inside forge)
3. Mouse tracking system with lerp smoothing

- [ ] **Step 1: Add color constants and surface RGB**

After the existing `var resizeTimeout = null;` line (~43), add:

```js
  // --- v2 Color constants ---
  var SECONDARY_RGB = [110, 142, 196];  // #6e8ec4 slate blue
  var TERTIARY_RGB = [142, 170, 126];   // #8eaa7e sage green
  var surfaceR = 26, surfaceG = 24, surfaceB = 28; // parsed from --color-surface

  // --- Mouse tracking ---
  var mouseRawX = 0.5, mouseRawY = 0.5;
  var mouseSmoothX = 0.5, mouseSmoothY = 0.5;
  var mouseActive = false;
  var mouseExitFrames = 0;
```

- [ ] **Step 2: Add surface RGB parsing to readColors()**

In the existing `readColors()` function (around line 45-51), after reading the four CSS properties, add surface RGB parsing:

```js
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors.accent = s.getPropertyValue('--color-accent').trim();
    colors.surface = s.getPropertyValue('--color-surface').trim();
    colors.muted = s.getPropertyValue('--color-text-muted').trim();
    colors.border = s.getPropertyValue('--color-border').trim();
    // Parse surface to RGB for trail persistence
    var sv = colors.surface;
    if (sv.charAt(0) === '#' && sv.length === 7) {
      surfaceR = parseInt(sv.substring(1,3), 16);
      surfaceG = parseInt(sv.substring(3,5), 16);
      surfaceB = parseInt(sv.substring(5,7), 16);
    }
  }
```

- [ ] **Step 3: Add mouse tracking to sentinel-guarded listeners**

Inside the `if (!document.documentElement.dataset.heroCanvasInit)` block, after the resize handler, add:

```js
    // Mouse tracking (sentinel-guarded, document-level for event delegation)
    document.addEventListener('mousemove', function (e) {
      var canvas = document.getElementById('hero-canvas');
      if (!canvas) return;
      var section = canvas.closest('section');
      if (!section) return;
      var rect = section.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        mouseRawX = (e.clientX - rect.left) / rect.width;
        mouseRawY = (e.clientY - rect.top) / rect.height;
        mouseActive = true;
        mouseExitFrames = 0;
      } else {
        mouseActive = false;
      }
    });

    // Touch tracking (same normalization)
    document.addEventListener('touchmove', function (e) {
      var canvas = document.getElementById('hero-canvas');
      if (!canvas) return;
      var section = canvas.closest('section');
      if (!section) return;
      var rect = section.getBoundingClientRect();
      var touch = e.touches[0];
      if (touch && touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        mouseRawX = (touch.clientX - rect.left) / rect.width;
        mouseRawY = (touch.clientY - rect.top) / rect.height;
        mouseActive = true;
        mouseExitFrames = 0;
      }
    }, { passive: true });

    document.addEventListener('touchend', function () {
      mouseActive = false;
    });
```

- [ ] **Step 4: Add mouse smoothing to render loop**

In `startLoop()`, before the `ctx.save()` call, add pointer smoothing:

```js
      // Pointer smoothing (lerp toward raw, decay toward center on exit)
      if (mouseActive) {
        mouseSmoothX += (mouseRawX - mouseSmoothX) * 0.08;
        mouseSmoothY += (mouseRawY - mouseSmoothY) * 0.08;
      } else {
        mouseExitFrames++;
        if (mouseExitFrames < 30) {
          mouseSmoothX += (0.5 - mouseSmoothX) * 0.05;
          mouseSmoothY += (0.5 - mouseSmoothY) * 0.05;
        }
      }
      var mouse = { x: mouseSmoothX, y: mouseSmoothY, active: mouseActive };
```

- [ ] **Step 5: Update render loop frame call to pass mouse**

Change the `anim.frame()` call from:
```js
        anim.frame(ctx, canvasW, canvasH, timestamp, colors, adaptiveQuality);
```
To:
```js
        anim.frame(ctx, canvasW, canvasH, timestamp, colors, adaptiveQuality, mouse);
```

- [ ] **Step 6: Add trail persistence dispatch to render loop**

Before the `ctx.save()` / `ctx.scale(dpr, dpr)` block, add trail persistence check:

```js
      // Trail persistence: if animation has fadeRate, use rgba fill instead of clearRect
      var anim = getAnim(ANIM_KEYS[currentIndex]);
      if (anim.fadeRate) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = 'rgba(' + surfaceR + ',' + surfaceG + ',' + surfaceB + ',' + anim.fadeRate + ')';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.restore();
      }
```

This goes right after the adaptive quality block, before the existing `ctx.save(); ctx.scale(dpr, dpr);`.

**Important:** Animations with `fadeRate` should NOT call `ctx.clearRect()` in their own `frame()` — the render loop handles it. Animations without `fadeRate` continue to call `ctx.clearRect()` themselves.

- [ ] **Step 7: Remove duplicate surface parsing from forge**

In the forge animation's `init()` function, remove the surface color parsing block (it now uses the shared `surfaceR/G/B`). Also remove forge's own trail persistence `ctx.fillRect` call from its `frame()` since the render loop now handles it. Add `fadeRate: 0.018` to the forge return object.

The forge `frame()` function should no longer contain:
```js
      ctx.fillStyle = 'rgba(' + surfaceR + ',' + surfaceG + ',' + surfaceB + ',0.018)';
      ctx.fillRect(0, 0, w, h);
```

And the forge `init()` should no longer contain the `getComputedStyle` / `parseInt` surface parsing block.

Update forge's return to:
```js
    return { init: init, frame: frame, cleanup: cleanup, fadeRate: 0.018 };
```

- [ ] **Step 8: Build and verify**

Run: `npm run build`
Expected: Build succeeds. Open preview, verify:
- Homepage terrain still renders (no regression)
- Activity page forge still renders with trail persistence (now via shared dispatch)
- No console errors

- [ ] **Step 9: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: add v2 shared infrastructure (colors, mouse, trail dispatch)

- SECONDARY_RGB (slate blue) and TERTIARY_RGB (sage green) constants
- Surface RGB parsed from CSS for trail persistence
- Mouse/touch tracking with lerp smoothing and dead zone
- Render loop dispatches trail persistence via animation fadeRate
- Forge migrated to shared trail dispatch"
```

---

### Task 3: Rewrite TERRAIN — Living Topographic Map

**Files:**
- Modify: `src/components/HeroCanvas.astro` — the `ANIMATIONS.terrain` IIFE (currently ~lines 193-355)

The current terrain has marching-squares contour lines + 40 particles. The v2 terrain adds:
- Colored elevation bands (copper ridges → sage mid → blue valleys)
- Mouse gravity well that warps the noise field
- Ridge glow halos at contour intersections

- [ ] **Step 1: Rewrite the terrain IIFE**

Replace the entire `ANIMATIONS.terrain = (function () { ... })();` block with:

```js
  ANIMATIONS.terrain = (function () {
    var w, h, col;
    var zOff = 0;
    var gridRes = 8;
    var particles = [];
    var cachedGrid = null;
    var cachedGridLen = 0;
    var tectonicTimer = 0;
    var tectonicActive = false;
    var TECTONIC_INTERVAL = 1200; // ~20s at 60fps
    var TECTONIC_DURATION = 150;
    var PARTICLE_COUNT = 40;

    function init(cw, ch, colors) {
      w = cw; h = ch; col = colors;
      particles = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({ x: Math.random() * w, y: Math.random() * h, life: Math.floor(Math.random() * 500) });
      }
    }

    function isoLerp(a, b, va, vb, threshold) { var t = (threshold - va) / (vb - va); return a + t * (b - a); }

    function frame(ctx, cw, ch, t, colors, quality, mouse) {
      w = cw; h = ch; col = colors;
      ctx.clearRect(0, 0, w, h);

      // Tectonic event logic
      tectonicTimer++;
      if (!tectonicActive && tectonicTimer >= TECTONIC_INTERVAL) {
        tectonicActive = true;
        tectonicTimer = 0;
      }
      if (tectonicActive) {
        zOff += 0.003;
        if (tectonicTimer >= TECTONIC_DURATION) {
          tectonicActive = false;
          tectonicTimer = 0;
        }
      } else {
        zOff += 0.0003;
      }

      // Mouse gravity well — shift noise origin
      var gravX = 0, gravY = 0;
      if (mouse && mouse.active) {
        gravX = (mouse.x - 0.5) * 0.3;
        gravY = (mouse.y - 0.5) * 0.3;
      }

      var noiseScale = 0.005;
      var levels = Math.floor(10 * quality);
      if (levels < 3) levels = 3;
      var actualRes = gridRes;
      if (quality < 0.5) actualRes = gridRes * 2;
      var cols = Math.ceil(w / actualRes) + 1;
      var rows = Math.ceil(h / actualRes) + 1;

      // Sample noise grid (reuse buffer)
      var gridLen = cols * rows;
      if (!cachedGrid || cachedGridLen < gridLen) {
        cachedGrid = new Float32Array(gridLen);
        cachedGridLen = gridLen;
      }
      var grid = cachedGrid;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          grid[r * cols + c] = noise3D(c * actualRes * noiseScale + gravX, r * actualRes * noiseScale + gravY, zOff);
        }
      }

      // Color bands by elevation: blue (valleys) → sage (mid) → copper (ridges)
      ctx.lineCap = 'round';

      for (var level = 0; level < levels; level++) {
        var levelFrac = level / levels;
        var threshold = -0.8 + levelFrac * 1.6;

        // Color by elevation
        var cr, cg, cb;
        if (levelFrac < 0.33) {
          // Valley: slate blue
          cr = SECONDARY_RGB[0]; cg = SECONDARY_RGB[1]; cb = SECONDARY_RGB[2];
        } else if (levelFrac < 0.66) {
          // Mid: sage green
          cr = TERTIARY_RGB[0]; cg = TERTIARY_RGB[1]; cb = TERTIARY_RGB[2];
        } else {
          // Ridge: copper (parse from accent)
          cr = 196; cg = 139; cb = 110; // fallback copper
          var av = col.accent;
          if (av.charAt(0) === '#' && av.length === 7) {
            cr = parseInt(av.substring(1,3), 16);
            cg = parseInt(av.substring(3,5), 16);
            cb = parseInt(av.substring(5,7), 16);
          }
        }

        ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.1 + levelFrac * 0.5) + ')';
        ctx.lineWidth = 1.5 - levelFrac * 0.8;

        ctx.beginPath();
        for (var r = 0; r < rows - 1; r++) {
          for (var c = 0; c < cols - 1; c++) {
            var tl = grid[r * cols + c];
            var tr = grid[r * cols + c + 1];
            var br = grid[(r + 1) * cols + c + 1];
            var bl = grid[(r + 1) * cols + c];

            var config = 0;
            if (tl > threshold) config |= 8;
            if (tr > threshold) config |= 4;
            if (br > threshold) config |= 2;
            if (bl > threshold) config |= 1;

            if (config === 0 || config === 15) continue;

            var x = c * actualRes, y = r * actualRes;
            var g = actualRes;

            var top = isoLerp(x, x + g, tl, tr, threshold);
            var right = isoLerp(y, y + g, tr, br, threshold);
            var bottom = isoLerp(x, x + g, bl, br, threshold);
            var left = isoLerp(y, y + g, tl, bl, threshold);

            switch (config) {
              case 1: case 14: ctx.moveTo(x, left); ctx.lineTo(bottom, y + g); break;
              case 2: case 13: ctx.moveTo(bottom, y + g); ctx.lineTo(x + g, right); break;
              case 3: case 12: ctx.moveTo(x, left); ctx.lineTo(x + g, right); break;
              case 4: case 11: ctx.moveTo(top, y); ctx.lineTo(x + g, right); break;
              case 5:
                ctx.moveTo(x, left); ctx.lineTo(top, y);
                ctx.moveTo(bottom, y + g); ctx.lineTo(x + g, right);
                break;
              case 6: case 9: ctx.moveTo(top, y); ctx.lineTo(bottom, y + g); break;
              case 7: case 8: ctx.moveTo(x, left); ctx.lineTo(top, y); break;
              case 10:
                ctx.moveTo(x, left); ctx.lineTo(bottom, y + g);
                ctx.moveTo(top, y); ctx.lineTo(x + g, right);
                break;
            }
          }
        }
        ctx.stroke();
      }

      // Ridge glow halos at high-elevation particles
      ctx.fillStyle = col.accent;
      var activeParticles = quality < 0.7 ? Math.floor(PARTICLE_COUNT * 0.5) : PARTICLE_COUNT;
      var eps = 0.5;
      for (var i = 0; i < activeParticles; i++) {
        var p = particles[i];
        p.life--;
        if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w; p.y = Math.random() * h; p.life = Math.floor(Math.random() * 500);
        }
        var nx = p.x * noiseScale + gravX, ny = p.y * noiseScale + gravY;
        var nv = noise3D(nx, ny, zOff);
        var dx = noise3D(nx + eps * noiseScale, ny, zOff) - nv;
        var dy = noise3D(nx, ny + eps * noiseScale, zOff) - nv;
        var mag = Math.sqrt(dx * dx + dy * dy) || 1;
        p.x += (-dy / mag) * 0.3;
        p.y += (dx / mag) * 0.3;

        // Particle glow — brighter at ridges
        var elevation = (nv + 1) * 0.5; // 0-1
        ctx.globalAlpha = 0.15 + elevation * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + elevation * 2, 0, 6.2832);
        ctx.fill();

        // Ridge halo
        if (elevation > 0.7 && quality >= 0.5) {
          ctx.globalAlpha = 0.1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, 6.2832);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    }

    function cleanup() { particles = []; cachedGrid = null; cachedGridLen = 0; }

    return { init: init, frame: frame, cleanup: cleanup };
  })();
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Visual verification**

Preview at `http://localhost:4322/`. Verify:
- Contour lines show blue (valleys), sage (mid), copper (ridges)
- Particles trace contours with glow at ridges
- Move mouse over hero — contours warp subtly around cursor
- Every ~20s: tectonic shift — contours morph visibly

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: rewrite terrain animation with elevation colors and mouse gravity

- Blue valleys → sage midlands → copper ridges (3-color elevation bands)
- Mouse gravity well warps noise field origin
- Ridge particles glow with halos at high elevation
- Tectonic events preserved (~20s cycle)"
```

---

### Task 4: Rewrite FLOW — 2000-Particle Turbulent Flow Field

**Files:**
- Modify: `src/components/HeroCanvas.astro` — the `ANIMATIONS.flow` IIFE (currently ~lines 114-190)

The current flow has 400 particles with simple trail. The v2 flow adds:
- 2000 particles with age-based lifecycle
- 80% copper / 20% slate blue dual-color population
- Trail persistence via `fadeRate`
- Mouse vortex with shedding

- [ ] **Step 1: Rewrite the flow IIFE**

Replace the entire `ANIMATIONS.flow = (function () { ... })();` block with:

```js
  ANIMATIONS.flow = (function () {
    var w, h, col;
    var particles = [];
    var zOff = 0;
    var BASE_COUNT = 2000;
    var vortexActive = 0; // frames vortex has been active
    var vortexX = 0, vortexY = 0; // last vortex center for shedding

    function spawnParticle(cw, ch, stagger) {
      return {
        x: Math.random() * cw,
        y: Math.random() * ch,
        prevX: 0, prevY: 0,
        age: stagger ? Math.floor(Math.random() * 300) : 0,
        maxAge: 200 + Math.floor(Math.random() * 300),
        isSecondary: Math.random() < 0.2,
        shedVx: 0, shedVy: 0, shedLife: 0
      };
    }

    function init(cw, ch, colors) {
      w = cw; h = ch; col = colors;
      zOff = 0;
      vortexActive = 0;
      particles = [];
      var isMobile = w < 768;
      var count = isMobile ? Math.floor(BASE_COUNT * 0.5) : BASE_COUNT;
      for (var i = 0; i < count; i++) {
        particles.push(spawnParticle(cw, ch, true));
      }
    }

    function frame(ctx, cw, ch, t, colors, quality, mouse) {
      w = cw; h = ch; col = colors;
      // No clearRect — trail persistence handled by render loop fadeRate

      var count = Math.floor(particles.length * quality);
      zOff += 0.0005;
      var noiseScale = 0.003;
      var speed = 1.5;

      // Mouse vortex
      var mx = mouse && mouse.active ? mouse.x * w : -9999;
      var my = mouse && mouse.active ? mouse.y * h : -9999;
      var vortexRadius = 150;
      if (mouse && mouse.active) {
        vortexActive++;
        vortexX = mx; vortexY = my;
      } else {
        // Vortex shedding: if was active 60+ frames, shed a rotating region
        if (vortexActive >= 60) {
          for (var i = 0; i < count; i++) {
            var p = particles[i];
            var dx = p.x - vortexX, dy = p.y - vortexY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50) {
              p.shedVx = -dy / (dist || 1) * 1.5;
              p.shedVy = dx / (dist || 1) * 1.5;
              p.shedLife = 120;
            }
          }
        }
        vortexActive = 0;
      }

      ctx.lineWidth = 1.5;

      for (var i = 0; i < count; i++) {
        var p = particles[i];
        p.prevX = p.x;
        p.prevY = p.y;
        p.age++;

        // Respawn
        if (p.age > p.maxAge || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          var np = spawnParticle(w, h, false);
          particles[i] = np;
          continue;
        }

        // Noise-driven angle
        var zLayer = p.isSecondary ? zOff + 10 : zOff;
        var angle = noise3D(p.x * noiseScale, p.y * noiseScale, zLayer) * Math.PI * 4;
        var vx = Math.cos(angle) * speed;
        var vy = Math.sin(angle) * speed;

        // Mouse vortex influence
        if (mouse && mouse.active) {
          var dx = p.x - mx, dy = p.y - my;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < vortexRadius && dist > 1) {
            var tangentX = -dy / dist * 2;
            var tangentY = dx / dist * 2;
            var influence = 1 - dist / vortexRadius;
            vx += tangentX * influence;
            vy += tangentY * influence;
          }
        }

        // Vortex shedding residual
        if (p.shedLife > 0) {
          vx += p.shedVx * (p.shedLife / 120);
          vy += p.shedVy * (p.shedLife / 120);
          p.shedLife--;
        }

        p.x += vx;
        p.y += vy;

        // Age-based alpha: fade in 20 frames, fade out 40 frames
        var fadeIn = p.age < 20 ? p.age / 20 : 1;
        var fadeOut = (p.maxAge - p.age) < 40 ? (p.maxAge - p.age) / 40 : 1;
        var alpha = 0.5 * fadeIn * fadeOut;
        if (alpha < 0.01) continue;

        // Draw trail segment
        if (p.isSecondary) {
          ctx.strokeStyle = 'rgba(' + SECONDARY_RGB[0] + ',' + SECONDARY_RGB[1] + ',' + SECONDARY_RGB[2] + ',' + alpha + ')';
        } else {
          ctx.strokeStyle = col.accent;
          ctx.globalAlpha = alpha;
        }
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (!p.isSecondary) ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = 1;
    }

    function cleanup() { particles = []; }

    return { init: init, frame: frame, cleanup: cleanup, fadeRate: 0.015 };
  })();
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Visual verification**

Preview at `http://localhost:4322/gallery/`. Verify:
- Dense particle field with visible flow lines
- 80% copper, 20% blue particles moving on slightly different paths (shear)
- Trail persistence creates luminous accumulated texture
- Move mouse: particles swirl around cursor in vortex
- Remove mouse: shed vortex rotates and dissipates

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: rewrite flow animation with 2000 particles and vortex shedding

- 2000 particles (1000 mobile) with age-based lifecycle
- 80% copper / 20% slate blue dual-color for visible shear
- Trail persistence via fadeRate: 0.015
- Mouse vortex with tangential velocity
- Vortex shedding: coherent rotation persists after cursor leaves"
```

---

### Task 5: Rewrite PULSE — Neural Network with Signal Propagation

**Files:**
- Modify: `src/components/HeroCanvas.astro` — the `ANIMATIONS.pulse` IIFE (currently ~lines 1542-1653)

The current pulse has 20 static nodes with instant brightness. The v2 pulse adds:
- 50 drifting nodes with bounce physics
- Visible traveling pulse dots along edges
- Node failure/recovery states (slate blue)
- Mouse attractor

- [ ] **Step 1: Rewrite the pulse IIFE**

Replace the entire `ANIMATIONS.pulse = (function () { ... })();` block with:

```js
  ANIMATIONS.pulse = (function () {
    var w, h, col;
    var nodes = [];
    var edges = [];
    var pulses = [];
    var frameCount = 0;
    var nextFire = 30;
    var NODE_COUNT = 50;
    var MAX_DIST = 180;

    function init(cw, ch, colors) {
      w = cw; h = ch; col = colors;
      nodes = []; edges = []; pulses = [];
      frameCount = 0; nextFire = 30;

      for (var i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: w * 0.1 + Math.random() * w * 0.8,
          y: h * 0.1 + Math.random() * h * 0.8,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          brightness: 0,
          failed: false,
          failTimer: 0
        });
      }
    }

    function rebuildEdges(quality) {
      edges = [];
      var maxDist = MAX_DIST * Math.max(0.6, quality);
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x;
          var dy = nodes[a].y - nodes[b].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            edges.push({ a: a, b: b, dist: dist });
          }
        }
      }
    }

    function frame(ctx, cw, ch, t, colors, quality, mouse) {
      w = cw; h = ch; col = colors;
      ctx.clearRect(0, 0, w, h);
      frameCount++;

      var maxDist = MAX_DIST * Math.max(0.6, quality);
      var nodeCount = quality < 0.5 ? Math.floor(NODE_COUNT * 0.5) : NODE_COUNT;

      // Update node positions — drift with bounce
      for (var i = 0; i < nodeCount; i++) {
        var nd = nodes[i];
        nd.x += nd.vx; nd.y += nd.vy;
        if (nd.x < 0 || nd.x > w) nd.vx *= -1;
        if (nd.y < 0 || nd.y > h) nd.vy *= -1;
        nd.x = Math.max(0, Math.min(w, nd.x));
        nd.y = Math.max(0, Math.min(h, nd.y));

        // Mouse attractor
        if (mouse && mouse.active && quality >= 0.3) {
          var mx = mouse.x * w, my = mouse.y * h;
          var dx = mx - nd.x, dy = my - nd.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 1) {
            nd.x += (dx / dist) * 0.3;
            nd.y += (dy / dist) * 0.3;
          }
        }

        // Failure: 0.3% per frame
        if (!nd.failed && Math.random() < 0.003) {
          nd.failed = true;
          nd.failTimer = 150;
        }
        if (nd.failed) {
          nd.failTimer--;
          if (nd.failTimer <= 0) nd.failed = false;
        }

        // Brightness decay
        nd.brightness *= 0.97;
      }

      // Rebuild edges periodically (every 30 frames — nodes drift)
      if (frameCount % 30 === 0) rebuildEdges(quality);

      // Fire signal
      if (frameCount >= nextFire) {
        var src = Math.floor(Math.random() * nodeCount);
        if (!nodes[src].failed) {
          nodes[src].brightness = 1;
          // Spawn traveling pulses to neighbors
          for (var e = 0; e < edges.length; e++) {
            var edge = edges[e];
            var target = -1;
            if (edge.a === src) target = edge.b;
            if (edge.b === src) target = edge.a;
            if (target >= 0 && target < nodeCount && !nodes[target].failed) {
              pulses.push({ from: src, to: target, progress: 0, speed: 3 / edge.dist, intensity: 0.8, hops: 0 });
            }
          }
        }
        nextFire = frameCount + 30 + Math.floor(Math.random() * 60);
      }

      // Update pulses
      for (var i = pulses.length - 1; i >= 0; i--) {
        var pu = pulses[i];
        pu.progress += pu.speed;
        if (pu.progress >= 1) {
          // Arrived — flare target and propagate
          var tgt = nodes[pu.to];
          if (tgt) {
            tgt.brightness = Math.max(tgt.brightness, pu.intensity);
            // Propagate to 2-3 neighbors with attenuation
            if (pu.hops < 3 && pu.intensity > 0.1) {
              var count = 0;
              for (var e = 0; e < edges.length && count < 3; e++) {
                var edge = edges[e];
                var next = -1;
                if (edge.a === pu.to && edge.b !== pu.from) next = edge.b;
                if (edge.b === pu.to && edge.a !== pu.from) next = edge.a;
                if (next >= 0 && next < nodeCount && !nodes[next].failed) {
                  pulses.push({ from: pu.to, to: next, progress: 0, speed: 3 / edge.dist, intensity: pu.intensity * 0.7, hops: pu.hops + 1 });
                  count++;
                }
              }
            }
          }
          pulses[i] = pulses[pulses.length - 1]; pulses.pop();
          continue;
        }
      }

      // Draw edges
      for (var e = 0; e < edges.length; e++) {
        var edge = edges[e];
        if (edge.a >= nodeCount || edge.b >= nodeCount) continue;
        var na = nodes[edge.a], nb = nodes[edge.b];
        var bright = Math.max(na.brightness, nb.brightness);
        var fail = na.failed || nb.failed;

        if (fail) {
          ctx.strokeStyle = 'rgba(' + SECONDARY_RGB[0] + ',' + SECONDARY_RGB[1] + ',' + SECONDARY_RGB[2] + ',0.08)';
        } else {
          ctx.strokeStyle = col.accent;
          ctx.globalAlpha = 0.15 + bright * 0.35;
        }
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw traveling pulses
      ctx.fillStyle = col.accent;
      for (var i = 0; i < pulses.length; i++) {
        var pu = pulses[i];
        var na = nodes[pu.from], nb = nodes[pu.to];
        if (!na || !nb) continue;
        var px = na.x + (nb.x - na.x) * pu.progress;
        var py = na.y + (nb.y - na.y) * pu.progress;
        ctx.globalAlpha = pu.intensity * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 6.2832);
        ctx.fill();
      }

      // Draw nodes
      for (var i = 0; i < nodeCount; i++) {
        var nd = nodes[i];
        var r = 4 + nd.brightness * 3;

        if (nd.failed) {
          ctx.fillStyle = 'rgba(' + SECONDARY_RGB[0] + ',' + SECONDARY_RGB[1] + ',' + SECONDARY_RGB[2] + ',' + (0.3 + nd.brightness * 0.3) + ')';
        } else {
          ctx.fillStyle = col.accent;
          ctx.globalAlpha = 0.3 + nd.brightness * 0.6;
        }
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, r, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = 1;
    }

    function cleanup() { nodes = []; edges = []; pulses = []; }
    return { init: init, frame: frame, cleanup: cleanup };
  })();
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Visual verification**

Preview at `http://localhost:4322/services/`. Verify:
- 50 nodes drift slowly, connected by copper lines
- Bright pulse dots travel along edges between nodes
- Nodes flare when pulse arrives, then propagate to neighbors
- Occasional nodes turn slate blue (failed) — pulses reroute around them
- Move mouse: nearby nodes drift toward cursor

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: rewrite pulse animation with traveling signals and node failure

- 50 drifting nodes with bounce physics
- Visible pulse dots travel along edges at 3px/frame
- Signal propagation with attenuation over 3 hops
- Node failure (0.3%/frame) → slate blue, recovery after 150 frames
- Pulses reroute around failed nodes
- Mouse attractor: nodes drift toward cursor"
```

---

### Task 6: Phase 1 QA and Final Commit

**Files:**
- All changes already committed per-task

- [ ] **Step 1: Full build verification**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings.

- [ ] **Step 2: Visual QA — all Phase 1 pages**

Preview at `http://localhost:4322/`. Check each page:

| Page | Animation | Verify |
|---|---|---|
| `/` | terrain | Color-banded contours (blue/sage/copper), particles with ridge glow, mouse warps contours, tectonic shift ~20s |
| `/gallery/` | flow | Dense particle field, copper + blue shear, trail persistence, mouse vortex + shedding |
| `/services/` | pulse | 50 drifting nodes, traveling pulse dots, node failure (blue), mouse attractor |
| `/activity/` | forge | Trail persistence, cascade fracture branches (blue), sparks, embers |

- [ ] **Step 3: Regression check — all other pages**

Quickly verify these pages still render their animations without errors:
- `/about/` (strata), `/blog/` (ink), `/projects/` (blueprint), `/contact/` (signal)
- `/privacy/` (cipher), `/search/` (radar), `/now/` (orbit), `/404.html` (entropy)
- `/colophon/` (loom), `/new/` (crystallise), `/analytics/` (stream), `/audio/` (soundwave)

- [ ] **Step 4: Accessibility check**

In browser DevTools, enable "Prefers reduced motion" emulation. Reload page. Verify:
- Canvas does NOT render
- `hero-glow` CSS class is present on the section
- No console errors

- [ ] **Step 5: Theme toggle check**

Toggle dark ↔ light theme. Verify:
- Animation colors update (MutationObserver fires `readColors()`)
- Trail persistence surface color updates (new `surfaceR/G/B`)

- [ ] **Step 6: Push**

```bash
git push
```

Wait for CI deploy to complete. Verify on live site.
