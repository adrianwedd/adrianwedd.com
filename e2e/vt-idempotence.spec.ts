import { test, expect, type Page } from '@playwright/test';
import { acceptConsent, CONSENT_KEY, clearConsent, clickCard, clickHeaderLink, expectNoVtReload } from './fixtures';

// Adversarial View-Transitions + analytics verification. The @smoke specs
// (vt-navigation, analytics-intent, consent, theme) prove each behaviour once;
// these specs attack the failure modes a framework migration would introduce:
// listeners that double-register across swaps, pageviews that double-fire (GA
// history-change measurement re-enabling itself), sentinels that over-guard
// (component dead on its second visit) or under-guard (two instances), and
// engagement events firing before their threshold.
//
// Nightly-only: deliberately not @smoke — the journey test is slow and the
// rest duplicate the smoke suite's happy paths under stress conditions.
//
type AnalyticsEvent = { name: string; parameters: Record<string, unknown> };

// Duplicated from analytics-intent.spec.ts rather than extracted — zero edits
// to existing specs keeps the migration diff clean. Keep the two in sync.
async function enableAnalytics(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ analytics: true, advertising: false, personalisation: false, timestamp: Date.now() }),
    );
  }, CONSENT_KEY);
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
}

async function events(page: Page): Promise<AnalyticsEvent[]> {
  return page.evaluate(() =>
    ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer || [])
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === 'event')
      .map((entry) => ({ name: String(entry[1]), parameters: (entry[2] || {}) as Record<string, unknown> })),
  );
}

test('exactly one page_view per real navigation across a mixed VT journey', async ({ page }) => {
  // A traversal settles through either an Astro swap or a persisted pageshow;
  // both paths must emit exactly one page view. Count restores so the test also
  // proves the BFCache path was exercised when Chromium chooses it.
  await page.addInitScript(() => {
    (window as unknown as { __bfcacheRestores: number }).__bfcacheRestores = 0;
    (window as unknown as { __navSettles: number }).__navSettles = 0;
    window.addEventListener('pageshow', (e) => {
      if ((e as PageTransitionEvent).persisted) {
        (window as unknown as { __bfcacheRestores: number }).__bfcacheRestores += 1;
        (window as unknown as { __navSettles: number }).__navSettles += 1;
      }
    });
    // A back/forward traversal settles by VT swap (astro:after-swap) or by
    // BFCache restore (persisted pageshow) — exactly one of the two, never
    // both — so this counter advances by one per traversal. The test waits on
    // it between consecutive goBack/goForward calls so a still-in-flight swap
    // is never aborted by the next traversal.
    document.addEventListener('astro:after-swap', () => {
      (window as unknown as { __navSettles: number }).__navSettles += 1;
    });
  });
  await enableAnalytics(page);
  await page.goto('/?utm_source=journey&utm_medium=test&utm_campaign=vt_contract&aw_traffic=internal');

  // Expected page_paths in order: hard load, then one per client-side
  // navigation (including the same-route one), then one per popstate.
  // GA4's built-in history-change measurement would double-fire each
  // non-hard entry — an exact count is the assertion against that.
  //
  // The back/forward legs below traverse stateful entries and must each be
  // represented once, regardless of which settle path Chromium chooses.
  const expectedPaths: string[] = ['/'];
  const expectedCount = () => expectedPaths.length;

  await expect
    .poll(async () => (await events(page)).filter((e) => e.name === 'page_view').length)
    .toBe(expectedCount());

  // home -> projects index (VT)
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Projects');
    await page.waitForURL('**/projects/');
  });
  expectedPaths.push('/projects/');
  await expect
    .poll(async () => (await events(page)).filter((e) => e.name === 'page_view').length)
    .toBe(expectedCount());

  // projects -> blog index (VT)
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Blog');
    await page.waitForURL('**/blog/');
  });
  expectedPaths.push('/blog/');
  await expect
    .poll(async () => (await events(page)).filter((e) => e.name === 'page_view').length)
    .toBe(expectedCount());

  // same-route transition: clicking the Blog link while already on /blog/
  // is still a navigation — exactly one more pageview, not two (duplicate
  // after-swap listener) and not zero (listener dropped by the swap).
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Blog');
  });
  expectedPaths.push('/blog/');
  await expect
    .poll(async () => (await events(page)).filter((e) => e.name === 'page_view').length)
    .toBe(expectedCount());

  // blog index -> article
  const firstPost = page.locator('[data-post-list] article a[href*="/blog/"]').first();
  const articleHref = (await firstPost.getAttribute('href'))!;
  const isArticle = (url: URL) => url.pathname === articleHref;
  await expectNoVtReload(page, async () => {
    await clickCard(page, firstPost);
    await page.waitForURL(isArticle);
  });
  expectedPaths.push(articleHref);
  await expect
    .poll(async () => (await events(page)).filter((e) => e.name === 'page_view').length)
    .toBe(expectedCount());

  // article -> services
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Services');
    await page.waitForURL('**/services/');
  });
  expectedPaths.push('/services/');

  // Back/forward: both a BFCache restore and a VT swap fire exactly one.
  // Each traversal settles (swap or restore) before the next begins, so no
  // in-flight swap gets aborted mid-journey.
  const settled = () => page.evaluate(() => (window as unknown as { __navSettles?: number }).__navSettles ?? 0);
  const waitForTraversalSettle = async (before: number) => {
    await expect.poll(settled).toBe(before + 1);
  };
  const popstatePaths: string[] = [];
  let settledBefore = await settled();
  await expectNoVtReload(page, async () => {
    await page.goBack();
    await page.waitForURL(isArticle);
  });
  await waitForTraversalSettle(settledBefore);
  popstatePaths.push(articleHref);
  settledBefore = await settled();
  await expectNoVtReload(page, async () => {
    await page.goBack();
    await page.waitForURL('**/blog/');
  });
  await waitForTraversalSettle(settledBefore);
  popstatePaths.push('/blog/');
  settledBefore = await settled();
  await expectNoVtReload(page, async () => {
    await page.goForward();
    await page.waitForURL(isArticle);
  });
  await waitForTraversalSettle(settledBefore);
  popstatePaths.push(articleHref);

  const bfcacheRestores = await page.evaluate(
    () => (window as unknown as { __bfcacheRestores?: number }).__bfcacheRestores ?? 0,
  );
  expect(bfcacheRestores).toBeLessThanOrEqual(popstatePaths.length);

  // The contract: exactly one page_view per real navigation, including every
  // back/forward traversal regardless of its settle path.
  const pageViews = (await events(page)).filter((e) => e.name === 'page_view');
  expect(pageViews).toHaveLength(expectedPaths.length + popstatePaths.length);
  const firedPaths = pageViews.map((e) => e.parameters.page_path);
  // The first six are the hard load + forward navigations, in order.
  expect(firedPaths.slice(0, expectedPaths.length)).toEqual(expectedPaths);
  // The tail is every traversal in order; BFCache and swaps are equivalent at
  // this measurement boundary.
  const tail = firedPaths.slice(expectedPaths.length);
  expect(tail).toEqual(popstatePaths);

  // And every fired page_view carries the landing attribution (utm survives
  // the journey, traffic_type retained) and a query-free page_location.
  for (const view of pageViews) {
    expect(view.parameters).toMatchObject({
      utm_source: 'journey',
      utm_campaign: 'vt_contract',
      traffic_type: 'internal',
    });
    expect(String(view.parameters.page_location || '')).not.toContain('?');
  }
});

test('project filters preserve history state across back and forward navigation', async ({ page }) => {
  await enableAnalytics(page);
  await page.goto('/');
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Projects');
    await page.waitForURL('**/projects/');
  });

  const activeFilter = page.locator('#status-filters .status-filter[data-status="active"]');
  await activeFilter.click();
  await expect(page).toHaveURL(/\/projects\/\?status=active$/);
  await expect(activeFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.project-card[data-status="complete"]').first()).toBeHidden();

  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Blog');
    await page.waitForURL('**/blog/');
  });
  const before = (await events(page)).filter((e) => e.name === 'page_view').length;

  await expectNoVtReload(page, async () => {
    await page.goBack();
    await page.waitForURL('**/projects/?status=active');
  });
  await expect(page.locator('main h1')).toContainText('Thirty-odd things built in public');
  await expect(activeFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.project-card[data-status="complete"]').first()).toBeHidden();
  expect((await events(page)).filter((e) => e.name === 'page_view')).toHaveLength(before + 1);

  await expectNoVtReload(page, async () => {
    await page.goForward();
    await page.waitForURL('**/blog/');
  });
  await expect(page.locator('[data-post-list]')).toBeVisible();
  expect((await events(page)).filter((e) => e.name === 'page_view')).toHaveLength(before + 2);
});

test('article_engaged cannot fire below the reading threshold and never double-fires', async ({ page }) => {
  await enableAnalytics(page);
  await page.goto('/blog/you-cant-protest-if-nobody-is-inconvenienced/');

  // Below threshold (the tracker requires 60s dwell at ≥75% depth; __readingMax
  // is the seconds hook, pinned directly so the spec need not wait a minute):
  // no event, even after a full-page scroll dispatch.
  await page.evaluate(() => {
    (window as unknown as { __readingMax: number }).__readingMax = 40;
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(500);
  expect((await events(page)).filter((e) => e.name === 'article_engaged')).toHaveLength(0);

  // Threshold met: fires exactly once…
  await page.evaluate(() => {
    (window as unknown as { __readingMax: number }).__readingMax = 61;
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(async () => (await events(page)).filter((e) => e.name === 'article_engaged').length).toBe(1);

  // …and further scroll events never re-fire it (single-fire guard survives).
  await page.evaluate(() => {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(300);
  expect((await events(page)).filter((e) => e.name === 'article_engaged')).toHaveLength(1);

  // The reading tracker is article-scoped: a deep scroll on a non-article
  // page must not produce one.
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'About');
    await page.waitForURL('**/about/');
  });
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(300);
  expect((await events(page)).filter((e) => e.name === 'article_engaged')).toHaveLength(1);
});

test('consent rejection never tracks and the banner stays dismissed across swaps', async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
  await page.goto('/');
  await clearConsent(page);
  await page.reload();

  await page.locator('#consent-reject').click();
  await expect(page.locator('#consent-banner')).toBeHidden();
  // Rejection means no analytics at all — not even queued events.
  expect(await events(page)).toEqual([]);

  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Blog');
    await page.waitForURL('**/blog/');
  });
  // The stored choice survives the swap: no banner resurrection, no tracking.
  await expect(page.locator('#consent-banner')).toBeHidden();
  expect(await events(page)).toEqual([]);
});

test('Pagefind mounts exactly once and stays functional on its second VT visit', async ({ page }) => {
  await page.goto('/');

  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Search');
    await page.waitForURL('**/search/');
  });
  const input = page.locator('.pagefind-ui__search-input');
  await input.fill('protest');
  await expect(page.locator('#search .pagefind-ui__result-link').first()).toBeVisible();
  expect(await page.locator('#search .pagefind-ui').count()).toBe(1);

  // Away and back: the init must re-run (DOM was replaced) without
  // double-mounting. An over-guarded sentinel leaves a dead input; an
  // under-guarded one mounts a second Pagefind root.
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Blog');
    await page.waitForURL('**/blog/');
  });
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Search');
    await page.waitForURL('**/search/');
  });
  expect(await page.locator('#search .pagefind-ui').count()).toBe(1);
  await page.locator('.pagefind-ui__search-input').fill('corpus');
  await expect(page.locator('#search .pagefind-ui__result-link').first()).toBeVisible();
});

test('gallery image opens the authoritative lightbox and its detail link navigates', async ({ page }) => {
  await page.goto('/gallery/');
  await acceptConsent(page);
  await expectNoVtReload(page, async () => {
    await clickCard(page, page.locator('#main-content a[href^="/gallery/"]').first());
    await page.waitForURL(/\/gallery\/[^/]+\/$/);
  });

  const trigger = page.locator('.gallery-trigger').first();
  const imageHref = (await trigger.getAttribute('href'))!;
  const collectionUrl = page.url();
  await clickCard(page, trigger);
  await expect(page.locator('#lightbox')).toBeVisible();
  await expect(page).toHaveURL(collectionUrl);
  await expect(page.locator('#lightbox-detail')).toHaveAttribute('href', imageHref);
  await expect(page.getByRole('button', { name: 'Close lightbox' })).toBeFocused();

  await expectNoVtReload(page, async () => {
    await page.locator('#lightbox-detail').click();
    await page.waitForURL((url: URL) => url.pathname === imageHref);
  });
  expect(await page.locator('#lightbox').count()).toBe(0);
});

test('mobile menu toggles once per click across swaps', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await page.goto('/');
  const btn = page.locator('.mobile-menu-btn');
  const menu = page.locator('#mobile-nav-menu');

  await btn.click();
  await expect(menu).toBeVisible();
  // A duplicated delegated listener would toggle twice per click —
  // net effect: the menu never opens (or never closes).
  await btn.click();
  await expect(menu).toBeHidden();

  // Navigate via the menu itself, then re-open after the swap.
  await btn.click();
  await expectNoVtReload(page, async () => {
    await menu.getByRole('link', { name: 'Blog' }).click();
    await page.waitForURL('**/blog/');
  });
  await expect(menu).toBeHidden(); // menu closes on navigation
  await page.locator('.mobile-menu-btn').click();
  await expect(page.locator('#mobile-nav-menu')).toBeVisible();
});

test('long mixed journey hydrates islands without console errors', async ({ page }) => {
  // No consent granted: no GA scripts load, so aborted-request noise can't
  // pollute the console — any error left is a real defect (hydration failure,
  // asset 404, unhandled rejection).
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Blog');
    await page.waitForURL('**/blog/');
  });
  await expectNoVtReload(page, async () => {
    await clickCard(page, page.locator('[data-post-list] article a[href*="/blog/"]').first());
    await page.waitForURL(/\/blog\/[^/]+\/$/);
  });
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Projects');
    await page.waitForURL('**/projects/');
  });
  await expectNoVtReload(page, async () => {
    await clickCard(page, page.locator('#main-content a[href^="/projects/"]').first());
    await page.waitForURL(/\/projects\/[^/]+\/$/);
  });
  // Audio episode page exercises the AudioPlayer island.
  await page.goto('/audio/');
  await clickCard(page, page.locator('#main-content article a[href^="/audio/"]').first());
  await page.waitForURL(/\/audio\/[^/]+\/$/);
  await expect(page.getByRole('button', { name: /play/i }).first()).toBeVisible();
  await expectNoVtReload(page, async () => {
    await clickHeaderLink(page, 'Search');
    await page.waitForURL('**/search/');
  });

  expect(errors, `console errors during journey:\n${errors.join('\n')}`).toEqual([]);
});
