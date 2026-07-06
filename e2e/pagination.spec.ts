import { test, expect } from '@playwright/test';

// Compare the first POST link (scoped to [data-post-list]) — the nav/header
// blog link is identical on every page and would never change.
test('index pagination advances to a different listing', async ({ page }) => {
  await page.goto('/blog/');
  const next = page.locator('a[rel="next"]').first();
  test.skip((await next.count()) === 0, 'not enough content for a second page');
  const firstBefore = await page.locator('[data-post-list] article a[href*="/blog/"]').first().getAttribute('href');
  await next.click();
  await page.waitForURL('**/2/');
  const firstAfter = await page.locator('[data-post-list] article a[href*="/blog/"]').first().getAttribute('href');
  expect(firstAfter).not.toBe(firstBefore);
});
