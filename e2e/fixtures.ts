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

// Proves a View-Transitions swap occurred, distinguishing it from BOTH a hard
// document reload (window state destroyed) and a BFCache restore (window state
// preserved but a navigation entry is added). Two signals are required because
// the window probe alone yields a false negative on BFCache back().
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

// Chromium's mobile emulation (Pixel 5) hit-tests clicks against a visual
// viewport that can lag Playwright's own scrollIntoViewIfNeeded, so a card
// below a min-h-[100dvh] hero is reported as "visible, enabled and stable"
// and then the click resolves to the hero sitting at the stale scroll offset.
// This is what has kept audio-player.spec red on the nightly mobile project
// (failing on main before the Astro 7 merge, see #662). Scrolling the element
// to the middle of the viewport ourselves and letting a frame settle removes
// the ambiguity without weakening actionability — the element must still be
// visible, enabled, and the real hit target for the click to land.
export async function clickCard(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(100);
  await locator.click();
}
