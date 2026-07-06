import { test, expect } from '@playwright/test';

// Tag chips navigate to a dedicated tag index (/blog/tag/<tag>/), they don't
// filter in place. Assert the navigation lands on a tag page that still lists
// posts from the verified [data-post-list] container.
test('blog tag chip navigates to a tag index with posts', async ({ page }) => {
  await page.goto('/blog/');
  const tag = page.locator('a[href*="/blog/tag/"]').first();
  await expect(tag).toBeVisible();
  await tag.click();
  await page.waitForURL('**/blog/tag/**');
  const posts = page.locator('[data-post-list] article a[href*="/blog/"]');
  await expect(posts.first()).toBeVisible();
});
