import { test, expect } from '@playwright/test';

test('Pagefind search returns a result linking to a real page', async ({ page }) => {
  await page.goto('/search/');
  // PagefindUI mounts into #search and loads its WASM index lazily. Its input
  // is .pagefind-ui__search-input; results are .pagefind-ui__result-link.
  const input = page.locator('.pagefind-ui__search-input');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill('astro');
  const result = page.locator('#search .pagefind-ui__result-link').first();
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result).toHaveAttribute('href', /^\//);
});
