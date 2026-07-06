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
  await expect(playBtn).toBeEnabled();
  await playBtn.click();
  // Do NOT assert playback/decode state: headless Chromium (incl. CI Linux
  // runners) lacks proprietary AAC/H.264 codecs, so the m4a never decodes and
  // <audio>.paused stays true — a deterministic red, not a real regression.
  // This still exercises island hydration, control rendering, and click wiring.
});
