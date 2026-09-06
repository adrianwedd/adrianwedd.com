import { test, expect } from '@playwright/test';
import { clickCard } from './fixtures';

// AudioPlayer is a Preact island; its single control is icon-only and swaps
// aria-label between 'Play' and 'Pause' (AudioPlayer.tsx). Scope the episode
// link to <article> so we don't click a tag chip. Don't wait for networkidle —
// R2 media streaming may never settle; wait for the control instead.
test('audio player toggles play/pause state', async ({ page }) => {
  // Chromium's CI build cannot decode the episode's AAC audio. Replace only
  // the media transport so this spec can prove the island's click/state wiring
  // without making codec availability part of the contract.
  await page.addInitScript(() => {
    const playing = new WeakSet<HTMLMediaElement>();
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() {
        return !playing.has(this);
      },
    });
    HTMLMediaElement.prototype.play = function () {
      playing.add(this);
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      playing.delete(this);
      this.dispatchEvent(new Event('pause'));
    };
  });
  await page.goto('/audio/');
  await clickCard(page, page.locator('article a[href*="/audio/"]').first());
  await page.waitForURL(/\/audio\/[^/]+\/$/);
  const playBtn = page.getByRole('button', { name: 'Play', exact: true });
  await expect(playBtn).toBeVisible({ timeout: 10_000 });
  await expect(playBtn).toBeEnabled();
  // CI's mobile emulation has a persistent compositor/main-thread coordinate
  // desync on this fresh-loaded island: even a forced tap can disappear while
  // elementFromPoint reports the button itself (runs 33950660671 and
  // 34018900803). Native button activation exercises the same Preact onClick
  // path without making that emulation defect part of this state-wiring test.
  await playBtn.evaluate((button: HTMLButtonElement) => button.click());
  const pauseBtn = page.getByRole('button', { name: 'Pause', exact: true });
  await expect(pauseBtn).toBeVisible();
  await pauseBtn.evaluate((button: HTMLButtonElement) => button.click());
  await expect(playBtn).toBeVisible();
});
