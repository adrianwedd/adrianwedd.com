import { test, expect } from '@playwright/test';
import { expectNoVtReload } from './fixtures';

test('@smoke theme toggle persists across VT swap and reload', async ({ page }) => {
  await page.goto('/');

  // Normalise to dark, then toggle to light.
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.remove('light');
  });
  await page.locator('.theme-toggle').first().click();
  await expect(page.locator('html')).toHaveClass(/light/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

  // Persists across a VT swap.
  await expectNoVtReload(page, async () => {
    await page.locator('a[href="/blog/"]').first().click();
    await page.waitForURL('**/blog/');
  });
  await expect(page.locator('html')).toHaveClass(/light/);

  // Persists across a hard reload (no-flash inline script reads localStorage).
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
});
