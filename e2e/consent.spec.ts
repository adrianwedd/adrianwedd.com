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

test('@smoke analytics-only consent loads GA4 but no ad scripts; advertising loads them', async ({ page }) => {
  const AD_HOSTS = ['pagead2.googlesyndication.com', 'snap.licdn.com', 'px.ads.linkedin.com'];
  const adHits: string[] = [];
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname;
    if (AD_HOSTS.includes(host)) adHits.push(host);
  });

  await page.goto('/');
  await clearConsent(page);
  await page.reload();

  // Manage → tick Analytics only → Save. GA4 must load; ad scripts must not.
  await page.locator('#consent-manage').click();
  await page.locator('#consent-analytics').check();
  const ga4 = page.waitForRequest(/googletagmanager\.com\/gtag\/js/, { timeout: 10_000 });
  await page.locator('#consent-accept-selected').click();
  await ga4;
  await page.waitForLoadState('networkidle');
  expect(adHits, `no ad scripts on analytics-only consent, saw: ${adHits.join(',')}`).toEqual([]);

  // Now grant advertising too — AdSense must load.
  await clearConsent(page);
  await page.reload();
  await page.locator('#consent-manage').click();
  await page.locator('#consent-advertising').check();
  const adsense = page.waitForRequest(/pagead2\.googlesyndication\.com/, { timeout: 10_000 });
  await page.locator('#consent-accept-selected').click();
  await adsense;
});
