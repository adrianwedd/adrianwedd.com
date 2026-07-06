import { test, expect } from '@playwright/test';

// AudioPlayer is a Preact island; its single control is icon-only and swaps
// aria-label between 'Play' and 'Pause' (AudioPlayer.tsx:96). Scope the episode
// link to <article> so we don't click a tag chip. Don't wait for networkidle —
// R2 media streaming may never settle; wait for the control instead.
test('audio player toggles play/pause state', async ({ page }) => {
  await page.goto('/audio/');
  await page.locator('article a[href*="/audio/"]').first().click();
  await page.waitForURL(/\/audio\/[^/]+\/$/);
  const playBtn = page.getByRole('button', { name: 'Play', exact: true });
  await expect(playBtn).toBeVisible({ timeout: 10_000 });
  await playBtn.click();
  // R2-hosted media can be slow to become playable, so `audio.play()` may not
  // resolve (and the aria-label may not flip) within a tight window. Assert
  // the underlying <audio> element's `paused` property directly instead of
  // the button label, per the nightly-suite's tolerance for media-load flake.
  await expect
    .poll(() => page.locator('audio').evaluate((el: HTMLAudioElement) => el.paused), {
      timeout: 10_000,
    })
    .toBe(false);
});
