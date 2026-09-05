import { test, expect } from '@playwright/test';
import { clickHeaderLink, expectNoVtReload } from './fixtures';

test('@smoke VT navigation preserves window + theme, no full reload', async ({ page }) => {
  await page.goto('/');

  // Force a known theme so we can assert it persists across the swap.
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.add('light');
  });

  // home -> blog index (VT swap, window state must survive), via whichever
  // header nav the viewport exposes.
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Blog');
    await page.waitForURL('**/blog/');
  });
  await expect(page.locator('html')).toHaveClass(/light/);

  // blog index -> first real post. Scope to the post list container so we never
  // grab a tag chip or breadcrumb. Markup: <div data-post-list><article
  // data-post-item><a href="/blog/<slug>/">. Discover the slug dynamically.
  const firstPost = page.locator('[data-post-list] article a[href*="/blog/"]').first();
  await expectNoVtReload(page, async () => {
    await firstPost.click();
    await page.waitForURL(/\/blog\/[^/]+\/$/);
  });
  await expect(page.locator('html')).toHaveClass(/light/);

  // back() -> still a VT restore, theme intact, header still interactive
  await expectNoVtReload(page, async () => {
    await page.goBack();
    await page.waitForURL('**/blog/');
  });
  await expect(page.locator('html')).toHaveClass(/light/);
  // Delegated theme-toggle listener survived the swaps (not duplicated/dead):
  // the desktop-nav toggle comes first in DOM order and is hidden at mobile
  // viewports, so resolve through :visible like theme.spec.ts does.
  await page.locator('.theme-toggle:visible').first().click();
  await expect(page.locator('html')).not.toHaveClass(/light/);
});
