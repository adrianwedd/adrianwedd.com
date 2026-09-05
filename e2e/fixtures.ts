import { expect, test, type Locator, type Page } from '@playwright/test';

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

// Two distinct failure modes shape this helper; each fix breaks the other, so
// it tries the strict form first and escalates only on its bounded failure.
//
// 1. Post-VT-swap clicks need actionability ON. After a swap the
//    ::view-transition overlay is still up for a few hundred ms; a forced tap
//    dispatches into it and the click is simply lost (probe shows a healthy
//    main thread — correct rect, elementFromPoint inside the target — yet no
//    navigation). The plain tap's stability loop rides the overlay out.
//
// 2. Fresh-load pages on CI can hit the opposite wall: Chromium's mobile
//    emulation runs the MAIN-THREAD hit test behind locator actionability
//    against a state that disagrees with the compositor — the screencast
//    shows the card scrolled into view while elementFromPoint still resolves
//    to the min-h-[100dvh] hero, for the full 30s window, on the mouse path
//    (run 33939494950) and identically on the touch path (run 33950106238).
//    It failed the same way on Astro 6 (2026-09-04 nightly), so it is an
//    emulation artefact, not a site or migration defect, and no wait closes
//    it (see #662). There, force skips the never-converging check and still
//    dispatches the real touch.
//
// What replaces the skipped check in mode 2 is the caller's own outcome
// assertion — every clickCard call site waits for the navigation or state the
// click must produce, so a click that truly landed on the wrong element still
// fails the spec. The probe records what the main thread believed at dispatch
// time and is attached to the test, so a residual failure carries its own
// evidence.
export async function clickCard(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(100);
  if (!(await page.evaluate(() => navigator.maxTouchPoints > 0))) {
    await locator.click();
    return;
  }
  const probe = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      scrollY: window.scrollY,
      visualViewport: {
        scale: window.visualViewport?.scale,
        offsetTop: window.visualViewport?.offsetTop,
        offsetLeft: window.visualViewport?.offsetLeft,
      },
      elementFromPoint: hit ? `${hit.tagName}.${hit.className || ''}` : null,
      hitInsideTarget: !!hit && el.contains(hit),
    };
  });
  test.info().attach('clickCard-hit-test', { body: JSON.stringify(probe, null, 2) });
  try {
    await locator.tap({ timeout: 5_000 });
  } catch {
    await locator.tap({ force: true });
  }
}
