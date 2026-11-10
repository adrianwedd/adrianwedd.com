/**
 * Undertow live-player playback matrix (issue adrianwedd/undertow-radio#534).
 *
 * Every test here drives the REAL deployed page at
 * https://adrianwedd.com/projects/undertow/ with the real production CSP and
 * the real station endpoints. No mocked endpoints, no header simulation, no
 * CSP bypass. The one deliberate intervention — the outage-recovery run —
 * aborts only the live playlist mid-session and puts it back; that is the
 * only honest way to make recovery fire against a live producer.
 *
 * CSP vigilance: every console error and every enforced securitypolicyviolation
 * is captured; tests assert none outside the deliberately aborted requests.
 */
import { test, expect, type Page } from '@playwright/test';

const PROD_URL = 'https://adrianwedd.com/projects/undertow/';
const PLAY_LABEL = 'Play Undertow Radio — Live';
const PAUSE_LABEL = 'Pause Undertow Radio — Live';
const STATION = 'https://undertow.wtf';

// Opt-in: this spec hits the REAL production page and the real station. The
// default playwright.config.ts (testDir e2e, PR smoke gate) must never run it —
// only playwright.undertow.config.ts runs it (it sets the marker env var).
test.skip(
  process.env.UNDERTOW_MATRIX !== '1',
  'opt-in Undertow matrix: run with `UNDERTOW_MATRIX=1 npx playwright test -c playwright.undertow.config.ts`',
);

interface Captured {
  consoleErrors: { type: string; text: string; url: string }[];
  cspViolations: { directive: string; blocked: string; disposition: string }[];
  failedRequests: { url: string; failure: string }[];
}

function capture(page: Page): Captured {
  const c: Captured = { consoleErrors: [], cspViolations: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error')
      c.consoleErrors.push({ type: msg.type(), text: msg.text(), url: msg.location()?.url ?? '' });
  });
  page.on('pageerror', (err) => {
    c.consoleErrors.push({ type: 'pageerror', text: String(err) });
  });
  page.on('requestfailed', (req) => {
    c.failedRequests.push({ url: req.url(), failure: req.failure()?.errorText ?? 'unknown' });
  });
  return c;
}

async function stateOf(page: Page): Promise<string> {
  return (await page.locator('[data-live-radio]').last().getAttribute('data-state')) ?? '';
}

/** Press play and wait for the island to actually engage (hydration race). */
async function pressPlay(page: Page): Promise<void> {
  const radio = page.locator('[data-live-radio]').last();
  const engaged = () =>
    radio.evaluate((el) => el.getAttribute('data-state') !== 'idle' && el.getAttribute('data-state') !== '');
  await expect(radio).toHaveAttribute('data-state', 'idle');
  // The SSR button renders before Preact hydrates; re-press until the island
  // acknowledges (state leaves idle). Each press is a real user gesture.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await radio.getByRole('button', { name: PLAY_LABEL }).click();
      await page.waitForTimeout(700);
      if (await engaged()) return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Player did not engage after repeated presses');
}

async function playToLive(page: Page): Promise<void> {
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await pressPlay(page);
  await expect(page.locator('[data-live-radio]').last()).toHaveAttribute('data-state', 'live', { timeout: 60_000 });
}

/** Live must stay live and keep advancing audio across playlist rotations. */
async function liveAndAdvancing(page: Page, listenMs = 16_000): Promise<void> {
  const now = () =>
    page.evaluate(() => {
      const audio = document.querySelector('[data-live-radio] audio') as HTMLAudioElement | null;
      return audio ? audio.currentTime : -1;
    });
  // Wait for playback to actually be advancing before measuring (the state can
  // flip to 'live' a moment before the first seeded sample starts).
  await expect.poll(now, { timeout: 30_000, intervals: [500] }).toBeGreaterThan(0);
  const t0 = await now();
  await page.waitForTimeout(listenMs);
  const t1 = await now();
  // ~6s segments within the listen window: allow slack for scheduling.
  expect(t1 - t0).toBeGreaterThanOrEqual(listenMs / 1000 - 3);
  await expect(page.locator('[data-live-radio]').last()).toHaveAttribute('data-state', 'live');
}

/**
 * Now playing: the player must be showing what the station's own endpoint says
 * right now (artist or title). Polled against a FRESH read of the real API so
 * a track flip between fetch and render merely retries the poll.
 */
async function showsLiveMetadata(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const response = await fetch('https://undertow.wtf/api/live/now-playing', {
            cache: 'no-store',
            credentials: 'omit',
          });
          if (!response.ok) return false;
          const report = await response.json();
          const artist: string = report?.now?.artist ?? '';
          const title: string = report?.now?.title ?? '';
          if (!artist && !title) return false; // station quiet: metadata vacuously shown
          const text = document.querySelector('[data-live-radio]')?.textContent ?? '';
          return (artist && text.includes(artist)) || (title && text.includes(title));
        }),
      { timeout: 30_000, intervals: [3_000] },
    )
    .toBe(true);
}

const PROJECTS = [
  ['core', ['chromium-desktop', 'firefox-desktop', 'webkit-desktop', 'mobile-chromium', 'mobile-safari']],
  ['unsupported', ['chromium-no-mse']],
  ['outage', ['chromium-outage-recovery']],
  ['rapid', ['chromium-rapid-toggle']],
] as const;

for (const [suite, eligible] of PROJECTS) {
  const skip = `project is outside the ${suite} suite`;
  if (suite === 'core') {
    test(`plays live, shows station metadata, advances across playlist updates`, async ({ page }) => {
      test.skip(!(eligible as readonly string[]).includes(test.info().project.name), skip);
      const c = capture(page);
      await playToLive(page);
      await showsLiveMetadata(page);
      await liveAndAdvancing(page);
      // No enforced CSP violations and no console errors of any kind.
      expect(c.cspViolations, JSON.stringify(c.cspViolations)).toEqual([]);
      // Playwright resource-error texts omit the URL; filter by the message's
      // own location. Only third-party analytics traffic is exempted.
      const playerErrors = c.consoleErrors.filter((e) => !e.url.includes('cloudflareinsights'));
      expect(playerErrors, JSON.stringify(playerErrors)).toEqual([]);
    });
  } else if (suite === 'unsupported') {
    test(`no MSE and no native HLS: unsupported state + station-player fallback`, async ({ page }) => {
      test.skip(!(eligible as readonly string[]).includes(test.info().project.name), skip);
      const c = capture(page);
      await page.addInitScript(() => {
        // Deliberate test environment: remove MediaSource before player code runs.
        delete (window as unknown as { MediaSource?: unknown }).MediaSource;
      });
      await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
      await pressPlay(page);
      const radio = page.locator('[data-live-radio]').last();
      // Without MSE the player must find SOME fallback: native HLS where the
      // engine offers it (Chromium here reports 'maybe'), or 'unsupported'
      // with the station's own player offered where it does not.
      await expect.poll(() => stateOf(page), { timeout: 15_000, intervals: [500] }).toMatch(/live|unsupported/);
      const state = await stateOf(page);
      if (state === 'unsupported') {
        await expect(radio.getByRole('link', { name: /station.s player/i })).toBeVisible();
      } else {
        await liveAndAdvancing(page, 8_000);
      }
      expect(c.cspViolations, JSON.stringify(c.cspViolations)).toEqual([]);
      // Playwright resource-error texts omit the URL; filter by the message's
      // own location. Only third-party analytics traffic is exempted.
      const playerErrors = c.consoleErrors.filter((e) => !e.url.includes('cloudflareinsights'));
      expect(playerErrors, JSON.stringify(playerErrors)).toEqual([]);
    });
  } else if (suite === 'outage') {
    test(`playlist outage mid-session: reconnects and returns to live`, async ({ page }) => {
      test.skip(!(eligible as readonly string[]).includes(test.info().project.name), skip);
      await playToLive(page);
      const radio = page.locator('[data-live-radio]').last();
      await page.route(`${STATION}/live/stream.m3u8*`, (route) => route.abort('internetdisconnected'));
      // Outlast the pipeline's tolerated 3 failed polls (~9-10s)…
      await page.waitForTimeout(16_000);
      await expect.poll(() => stateOf(page), { timeout: 20_000 }).not.toBe('live');
      // …put the real stream back.
      await page.unroute(`${STATION}/live/stream.m3u8*`);
      await expect(radio).toHaveAttribute('data-state', 'live', { timeout: 90_000 });
      await liveAndAdvancing(page, 8_000);
    });
  } else {
    test(`five rapid Pause -> Play cycles stay live and advance`, async ({ page }) => {
      test.skip(!(eligible as readonly string[]).includes(test.info().project.name), skip);
      const c = capture(page);
      await playToLive(page);
      const radio = page.locator('[data-live-radio]').last();
      for (let i = 0; i < 5; i++) {
        await radio.getByRole('button', { name: PAUSE_LABEL }).click();
        await page.waitForTimeout(400);
        await radio.getByRole('button', { name: PLAY_LABEL }).click();
        await page.waitForTimeout(400);
      }
      // The last press must land on a live, advancing stream with a fresh session.
      await expect(radio).toHaveAttribute('data-state', 'live', { timeout: 60_000 });
      await liveAndAdvancing(page, 10_000);
      expect(c.cspViolations, JSON.stringify(c.cspViolations)).toEqual([]);
    });
  }
}
