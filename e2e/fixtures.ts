import { expect, type Locator, type Page } from '@playwright/test';

// Verified hardcoded across ConsentBanner.astro, Analytics.astro:23,
// Transparency.tsx:11, Personalisation.tsx, 404.astro. Do not scrape source.
export const CONSENT_KEY = 'adrianwedd_consent';

// Loaded only after consent (Analytics.astro): GA4/gtag, AdSense, LinkedIn.
export const TRACKER_ORIGINS = [
  'www.googletagmanager.com',
  'pagead2.googlesyndication.com',
  'snap.licdn.com',
  'px.ads.linkedin.com',
];

export async function clearConsent(page: Page): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY);
}

export async function acceptConsent(page: Page): Promise<void> {
  await page.locator('#consent-accept-all').click();
  await expect(page.locator('#consent-banner')).toBeHidden();
}

// Proves the action was not a hard document reload: the window probe survives
// only when the document was not destroyed, and no navigation entry is added.
// On a forward navigation that proves a VT swap occurred. On a back/forward
// traversal it does NOT distinguish a VT swap from a BFCache restore — a
// restore also survives the probe and adds no entry — so where the difference
// matters, count restores explicitly (the journey test in vt-idempotence.spec.ts
// does exactly that with its __bfcacheRestores counter).
export async function expectNoVtReload(page: Page, action: () => Promise<void>): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __vtProbe?: number }).__vtProbe = 42;
  });
  const before = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  await action();
  const probe = await page.evaluate(() => (window as unknown as { __vtProbe?: number }).__vtProbe);
  const after = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  expect(probe, 'window state should survive a VT swap (no hard reload)').toBe(42);
  expect(after, 'no new navigation entry — a VT swap, not a document nav').toBe(before);
}

// The header exposes two navigations: the desktop one inside <nav aria-label=
// "Main navigation"> (hidden below the `md` breakpoint) and #mobile-nav-menu
// behind the hamburger (hidden at and above it). At the Pixel 5 viewport the
// nightly `mobile-chromium` project runs at, clicking a desktop nav link waits
// 30s on a permanently hidden element — so route header navigation through
// whichever control the current viewport actually exposes.
export async function clickHeaderLink(page: Page, name: string): Promise<void> {
  const desktop = page.getByLabel('Main navigation').getByRole('link', { name });
  if (await desktop.isVisible()) {
    await desktop.click();
    return;
  }
  // Tolerate an already-open menu: clicking the button again would close it,
  // and the visibility wait below would then time out.
  const menu = page.locator('#mobile-nav-menu');
  if (!(await menu.isVisible())) {
    await page.locator('.mobile-menu-btn').click();
    await expect(menu).toBeVisible();
  }
  await menu.getByRole('link', { name }).click();
}

// Chromium's mobile emulation (Pixel 5) hit-tests synthetic MOUSE events
// against a visual viewport that can diverge from the rendered scroll state
// for the full retry window: a card below a min-h-[100dvh] hero is reported
// "visible, enabled and stable", the scroll succeeds, and the click still
// resolves to the hero at a stale offset. This kept audio-player.spec red on
// the nightly mobile project — twice red on CI with 30s of Playwright's own
// internal retries (run 33939494950), so it is not a settle race a longer
// wait can close (see #662; it failed identically on Astro 6, 2026-09-04
// nightly). Touch dispatch takes a different input path than the synthetic
// mouse events the emulated context mishandles, and it is what a real mobile
// user produces anyway — so touch contexts tap, mouse-only contexts (the
// desktop chromium project) click. Actionability is not weakened: the element
// must still be visible, enabled, and the real hit target for the tap to land.
export async function clickCard(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(100);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
    await locator.tap();
  } else {
    await locator.click();
  }
}
