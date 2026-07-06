import { test, expect } from '@playwright/test';

// Page 1 (/blog/) renders <InfiniteScroll> (a JS load-more link with rel="next"
// that appends in place and never changes the URL) — the real <Pagination> nav
// only renders on page 2+. Test the pager directly on /blog/2/ so a
// Pagination.astro regression can't land silently.
test('paginated listing renders the pager and prev navigates back', async ({ page }) => {
  await page.goto('/blog/2/');
  const pager = page.locator('nav[aria-label="Pagination"]');
  await expect(pager).toBeVisible();

  const firstOnPage2 = await page.locator('[data-post-list] article a[href*="/blog/"]').first().getAttribute('href');

  await pager.locator('a[rel="prev"]').click();
  await page.waitForURL('**/blog/');
  // Page 1 uses InfiniteScroll, not the pager — the pager's absence confirms the
  // swap landed before we read the listing (avoids reading the stale page-2 DOM).
  await expect(page.locator('nav[aria-label="Pagination"]')).toHaveCount(0);

  const firstOnPage1 = await page.locator('[data-post-list] article a[href*="/blog/"]').first().getAttribute('href');
  expect(firstOnPage1).not.toBe(firstOnPage2);
});
