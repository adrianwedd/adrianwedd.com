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
  // The "Tag:" heading exists only on the tag index (the blog index h1 is
  // "Blog"), so waiting for it confirms the VT swap actually landed before we
  // assert the listing — otherwise waitForURL resolves at pushState and the
  // still-present blog-index posts would satisfy the assertion on the old DOM.
  await expect(page.locator('h1')).toContainText('Tag:');
  const posts = page.locator('[data-post-list] article a[href*="/blog/"]');
  await expect(posts.first()).toBeVisible();
});
