import { test, expect } from '@playwright/test';
import { acceptConsent, clearConsent, TRACKER_ORIGINS } from './fixtures';

test('@smoke no tracker requests before consent; GA4 fires after accept', async ({ page }) => {
  const trackerHits: string[] = [];
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname;
    if (TRACKER_ORIGINS.includes(host)) trackerHits.push(host);
  });

  await page.goto('/');
  await clearConsent(page);
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Invariant: nothing tracking-related before the user opts in.
  expect(trackerHits, `no trackers pre-consent, saw: ${trackerHits.join(',')}`).toEqual([]);

  // Accept, then GA4 must load. Requires the build to bake a real-shaped
  // PUBLIC_GA_MEASUREMENT_ID (G-TESTE2E0000) — see e2e.yml / Global Constraints.
  const ga4 = page.waitForRequest(/googletagmanager\.com\/gtag\/js/, { timeout: 10_000 });
  await acceptConsent(page);
  await ga4;
});
